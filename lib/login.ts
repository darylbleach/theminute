import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  getDb,
  loginTokens,
  type Database,
  type DbTransaction,
  type LoginToken,
} from "@/db";
import { SITE_NAME, siteUrl } from "@/lib/config";
import { resendApiKey, RESEND_MISSING_MESSAGE, sendEmail } from "@/lib/email";
import {
  LOGIN_RESEND_COOLDOWN_MS,
  LOGIN_TTL_MS,
} from "@/lib/login-copy";
import {
  LOGIN_LOCKED_MESSAGE,
  assertNotLocked,
  clearLoginLockouts,
  emailLockKey,
  ipLockKey,
  nextFailCount,
  recordFailedVerify,
  shouldKillChallenge,
} from "@/lib/login-lockout";
import {
  findHostRoom,
  findPaidRoomsByEmail,
  hashToken,
  rotateHostToken,
} from "@/lib/rooms";

export {
  LOGIN_RESEND_COOLDOWN_MS,
  LOGIN_SENT_MESSAGE,
  LOGIN_TTL_MS,
} from "@/lib/login-copy";

type LoginDb = Database | DbTransaction;

export function cleanLoginEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Enter the email from Stripe checkout.");
  }
  const email = value.trim().toLowerCase();
  if (!email) throw new Error("Enter the email from Stripe checkout.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email.");
  }
  return email;
}

export function cleanLoginCode(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Enter the six-digit code.");
  }
  const code = value.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Enter the six-digit code.");
  }
  return code;
}

export function cleanLoginToken(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("That link is not valid.");
  }
  const token = value.trim();
  if (!token || token.length > 128 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("That link is not valid.");
  }
  return token;
}

export function makeLoginCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function makeLoginLinkToken() {
  return randomBytes(32).toString("base64url");
}

export function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function destinationAfterLogin(rooms: { code: string }[]) {
  if (rooms.length === 0) return null;
  if (rooms.length === 1) return `/r/${rooms[0].code}`;
  return "/rooms";
}

export function loginVerifyPath(token: string) {
  return `/login/verify?token=${encodeURIComponent(token)}`;
}

function loginEmailCopy(token: string, code: string) {
  const verifyUrl = `${siteUrl()}${loginVerifyPath(token)}`;
  const loginUrl = `${siteUrl()}/login`;
  const text = [
    `Open your paid stand-up room on ${SITE_NAME}.`,
    "",
    "This link expires in 20 minutes and can be used once:",
    verifyUrl,
    "",
    `Or enter this six-digit code on ${loginUrl}:`,
    code,
    "",
    "If you did not ask to open a room, ignore this email.",
  ].join("\n");
  const html = `
    <p>Open your paid stand-up room on ${SITE_NAME}.</p>
    <p><a href="${verifyUrl}">Open my rooms</a> — this link expires in 20 minutes and can be used once.</p>
    <p>Or enter this six-digit code on <a href="${loginUrl}">${loginUrl}</a>:</p>
    <p style="font-size:28px;letter-spacing:0.2em;font-family:ui-monospace,monospace"><strong>${code}</strong></p>
    <p>If you did not ask to open a room, ignore this email.</p>
  `.trim();
  return {
    subject: `Open your ${SITE_NAME} stand-up`,
    text,
    html,
  };
}

export async function createLoginChallenge(
  emailInput: unknown,
  clientIp = "unknown",
) {
  const email = cleanLoginEmail(emailInput);
  const db = getDb();
  await assertNotLocked([emailLockKey(email), ipLockKey(clientIp)], db);
  const latest = await db.query.loginTokens.findFirst({
    where: eq(loginTokens.email, email),
    orderBy: [desc(loginTokens.createdAt)],
  });
  if (
    latest &&
    Date.now() - latest.createdAt.getTime() < LOGIN_RESEND_COOLDOWN_MS
  ) {
    throw new Error("Wait a few seconds and try again.");
  }

  const token = makeLoginLinkToken();
  const code = makeLoginCode();
  await db.delete(loginTokens).where(eq(loginTokens.email, email));
  await db.insert(loginTokens).values({
    id: randomBytes(16).toString("hex"),
    email,
    tokenHash: hashToken(token),
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + LOGIN_TTL_MS),
    failedAttempts: 0,
  });

  return { email, token, code };
}

export async function requestPaidRoomLogin(
  emailInput: unknown,
  clientIp = "unknown",
) {
  const challenge = await createLoginChallenge(emailInput, clientIp);
  if (!resendApiKey()) {
    throw new Error(RESEND_MISSING_MESSAGE);
  }

  const paidRooms = await findPaidRoomsByEmail(challenge.email);
  if (paidRooms.length > 0) {
    const copy = loginEmailCopy(challenge.token, challenge.code);
    await sendEmail({
      to: challenge.email,
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    });
  }

  return challenge.email;
}

async function consumeTokenRow(tx: LoginDb, token: string) {
  const now = new Date();
  const tokenHash = hashToken(token);
  const [consumed] = await tx
    .update(loginTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(loginTokens.tokenHash, tokenHash),
        isNull(loginTokens.consumedAt),
        gt(loginTokens.expiresAt, now),
      ),
    )
    .returning();
  if (consumed) return consumed;

  const existing = await tx.query.loginTokens.findFirst({
    where: eq(loginTokens.tokenHash, tokenHash),
  });
  if (!existing) throw new Error("That link is not valid.");
  if (existing.consumedAt) {
    throw new Error("That link has already been used. Request a new one.");
  }
  throw new Error("That link has expired. Request a new one.");
}

async function consumeCodeRow(
  tx: LoginDb,
  email: string,
  code: string,
  clientIp: string,
) {
  await assertNotLocked([emailLockKey(email), ipLockKey(clientIp)], tx);
  const now = new Date();
  const candidates = await tx.query.loginTokens.findMany({
    where: and(
      eq(loginTokens.email, email),
      isNull(loginTokens.consumedAt),
      gt(loginTokens.expiresAt, now),
    ),
  });
  const match = candidates.find((row) =>
    hashesMatch(row.codeHash, hashToken(code)),
  );
  if (!match) {
    const target = candidates[0];
    if (target) {
      const attempts = nextFailCount(target.failedAttempts);
      const killed = shouldKillChallenge(attempts);
      await tx
        .update(loginTokens)
        .set({
          failedAttempts: attempts,
          consumedAt: killed ? now : target.consumedAt,
        })
        .where(eq(loginTokens.id, target.id));
      await recordFailedVerify({ email, ip: clientIp, attempts }, tx);
      if (killed) {
        throw new Error(LOGIN_LOCKED_MESSAGE);
      }
    } else {
      await recordFailedVerify({ email, ip: clientIp, attempts: 1 }, tx);
    }
    throw new Error("That code is not valid. Check it, or request a new one.");
  }
  const [consumed] = await tx
    .update(loginTokens)
    .set({ consumedAt: now })
    .where(
      and(eq(loginTokens.id, match.id), isNull(loginTokens.consumedAt)),
    )
    .returning();
  if (!consumed) {
    throw new Error("That code has already been used. Request a new one.");
  }
  return consumed;
}

export async function consumeLoginChallenge(
  input: { token: string } | { email: string; code: string },
  tx: LoginDb = getDb(),
  clientIp = "unknown",
): Promise<LoginToken> {
  if ("token" in input) {
    return consumeTokenRow(tx, cleanLoginToken(input.token));
  }
  return consumeCodeRow(
    tx,
    cleanLoginEmail(input.email),
    cleanLoginCode(input.code),
    clientIp,
  );
}

export async function completePaidRoomLogin(
  input: { token: string } | { email: string; code: string },
  currentHostToken?: string,
  clientIp = "unknown",
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const consumed = await consumeLoginChallenge(input, tx, clientIp);
    await clearLoginLockouts({ email: consumed.email, ip: clientIp }, tx);
    const paidRooms = await findPaidRoomsByEmail(consumed.email, tx);
    if (paidRooms.length === 0) {
      return { hostToken: null as string | null, rooms: paidRooms };
    }

    if (currentHostToken) {
      const current = await findHostRoom(currentHostToken, tx);
      if (current?.paid && current.paidEmail === consumed.email) {
        return { hostToken: currentHostToken, rooms: paidRooms };
      }
    }

    const hostToken = await rotateHostToken(paidRooms[0].code, tx);
    return { hostToken, rooms: paidRooms };
  });
}
