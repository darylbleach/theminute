import { eq } from "drizzle-orm";
import { getDb, loginLockouts, type Database, type DbTransaction } from "@/db";

export const LOGIN_MAX_CODE_ATTEMPTS = 5;
export const LOGIN_IP_MAX_FAILURES = 10;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
export const LOGIN_LOCKED_MESSAGE =
  "Too many wrong codes. Request a new login in 15 minutes.";

type LoginDb = Database | DbTransaction;

export function clientIpFromHeaders(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function isLockActive(lockedUntil: Date | null | undefined, now = Date.now()) {
  return Boolean(lockedUntil && lockedUntil.getTime() > now);
}

export function nextFailCount(current: number) {
  return current + 1;
}

export function shouldKillChallenge(attempts: number) {
  return attempts >= LOGIN_MAX_CODE_ATTEMPTS;
}

export function shouldLockEmail(attempts: number) {
  return attempts >= LOGIN_MAX_CODE_ATTEMPTS;
}

export function shouldLockIp(failures: number) {
  return failures >= LOGIN_IP_MAX_FAILURES;
}

export function lockoutUntil(now = Date.now()) {
  return new Date(now + LOGIN_LOCKOUT_MS);
}

export function emailLockKey(email: string) {
  return `email:${email.trim().toLowerCase()}`;
}

export function ipLockKey(ip: string) {
  return `ip:${ip}`;
}

async function getLockout(db: LoginDb, key: string) {
  return db.query.loginLockouts.findFirst({
    where: eq(loginLockouts.key, key),
  });
}

export async function assertNotLocked(
  keys: string[],
  tx: LoginDb = getDb(),
  now = Date.now(),
) {
  for (const key of keys) {
    const row = await getLockout(tx, key);
    if (isLockActive(row?.lockedUntil ?? null, now)) {
      throw new Error(LOGIN_LOCKED_MESSAGE);
    }
  }
}

async function upsertLockout(
  tx: LoginDb,
  key: string,
  failCount: number,
  lockedUntil: Date | null,
) {
  await tx
    .insert(loginLockouts)
    .values({
      key,
      failCount,
      lockedUntil,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: loginLockouts.key,
      set: {
        failCount,
        lockedUntil,
        updatedAt: new Date(),
      },
    });
}

export async function recordFailedVerify(
  input: { email: string; ip: string; attempts: number },
  tx: LoginDb = getDb(),
) {
  const now = Date.now();
  const emailKey = emailLockKey(input.email);
  const ipKey = ipLockKey(input.ip);
  const emailLockedUntil = shouldLockEmail(input.attempts)
    ? lockoutUntil(now)
    : null;

  await upsertLockout(tx, emailKey, input.attempts, emailLockedUntil);

  const ipRow = await getLockout(tx, ipKey);
  const ipFails = nextFailCount(ipRow?.failCount ?? 0);
  const ipLockedUntil = shouldLockIp(ipFails) ? lockoutUntil(now) : ipRow?.lockedUntil ?? null;
  await upsertLockout(tx, ipKey, ipFails, ipLockedUntil);

  if (emailLockedUntil || isLockActive(ipLockedUntil, now)) {
    throw new Error(LOGIN_LOCKED_MESSAGE);
  }
}

export async function clearLoginLockouts(
  input: { email: string; ip: string },
  tx: LoginDb = getDb(),
) {
  await tx.delete(loginLockouts).where(eq(loginLockouts.key, emailLockKey(input.email)));
  await tx.delete(loginLockouts).where(eq(loginLockouts.key, ipLockKey(input.ip)));
}
