import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { creditLedger, getDb, reigns, siteState, type Reign } from "@/db";
import { contactEmail } from "./config";
import { secondsBetween } from "./format";
import {
  allocateCredits,
  creditSplit,
  cutPremiumCents,
} from "./money";
import type { PublicReign, PublicState } from "./types";
import { faviconFor } from "./urls";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

const QUEUE_LOCK = 84241001;

function newId() {
  return crypto.randomUUID();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function toPublicReign(reign: Reign): PublicReign {
  return {
    id: reign.id,
    url: reign.url,
    hostname: reign.hostname,
    tagline: reign.tagline,
    logoUrl: reign.logoUrl ?? faviconFor(reign.hostname),
    minutesPaid: reign.minutesPaid,
    startedAt: reign.startedAt?.toISOString() ?? null,
    endsAt: reign.endsAt?.toISOString() ?? null,
    clickCount: reign.clickCount,
    dollarsPaidCents: reign.dollarsPaidCents,
    jumpedQueue: reign.jumpedQueue,
    isSeeded: reign.isSeeded,
    status: reign.status,
  };
}

export async function withQueueLock<T>(fn: (tx: Tx) => Promise<T>) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK})`);
    await tx.execute(
      sql`insert into site_state (id) values (1) on conflict (id) do nothing`,
    );
    await tx.execute(sql`select * from site_state where id = 1 for update`);
    return fn(tx);
  });
}

async function getSite(tx: Tx) {
  const [row] = await tx.select().from(siteState).where(eq(siteState.id, 1));
  return row;
}

export async function getLiveReign(tx: Tx) {
  const [live] = await tx
    .select()
    .from(reigns)
    .where(eq(reigns.status, "live"))
    .limit(1);
  return live ?? null;
}

export async function getQueuedReigns(tx: Tx) {
  return tx
    .select()
    .from(reigns)
    .where(eq(reigns.status, "queued"))
    .orderBy(asc(reigns.queueSort), asc(reigns.createdAt));
}

export function quoteCut(queued: Pick<Reign, "minutesPaid">[]) {
  const skippedMinutes = queued.reduce((sum, item) => sum + item.minutesPaid, 0);
  const premiumCents = cutPremiumCents(skippedMinutes);
  const { toSkipped, house } = creditSplit(premiumCents);
  return { skippedMinutes, premiumCents, creditCents: toSkipped, houseCents: house };
}

async function archiveReign(tx: Tx, live: Reign, now: Date, status: "archived" | "killed", reason?: string) {
  await tx
    .update(reigns)
    .set({
      status,
      endsAt: now,
      queueSort: null,
      killedReason: reason ?? live.killedReason,
      updatedAt: now,
    })
    .where(eq(reigns.id, live.id));
}

async function promoteReign(tx: Tx, next: Reign, now: Date) {
  const endsAt = new Date(now.getTime() + next.minutesPaid * 60_000);
  await tx
    .update(reigns)
    .set({
      status: "live",
      startedAt: now,
      endsAt,
      queueSort: null,
      updatedAt: now,
    })
    .where(eq(reigns.id, next.id));
}

export async function advanceClock(tx: Tx, now = new Date()) {
  const site = await getSite(tx);
  const live = await getLiveReign(tx);
  const queued = await getQueuedReigns(tx);

  const expired = Boolean(live?.endsAt && live.endsAt.getTime() <= now.getTime());
  // The seeded reign is a placeholder so the page is never empty at launch.
  // Nobody paid for it, so it must not hold minutes a real buyer paid for.
  const yieldsToPaid = Boolean(live?.isSeeded) && queued.length > 0 && !site?.killed;

  if (live && (expired || yieldsToPaid)) {
    await archiveReign(tx, live, now, "archived");
  }

  const stillLive = await getLiveReign(tx);
  if (stillLive || site?.killed) {
    return { live: stillLive, promoted: null as Reign | null };
  }

  const [next] = queued;
  if (!next) {
    return { live: null, promoted: null };
  }

  await promoteReign(tx, next, now);
  return { live: { ...next, status: "live" as const, startedAt: now }, promoted: next };
}

export async function creditBalanceCents(tx: Tx, email: string) {
  const normalized = normalizeEmail(email);
  const [row] = await tx
    .select({
      balance: sql<number>`coalesce(sum(${creditLedger.deltaCents}), 0)`,
    })
    .from(creditLedger)
    .where(eq(creditLedger.email, normalized));
  return Number(row?.balance ?? 0);
}

async function writeCredit(
  tx: Tx,
  input: {
    email: string;
    deltaCents: number;
    reason: "queue_cut" | "spend" | "house";
    relatedReignId?: string;
    note?: string;
  },
) {
  if (input.deltaCents === 0) return;
  await tx.insert(creditLedger).values({
    id: newId(),
    email: normalizeEmail(input.email),
    deltaCents: input.deltaCents,
    reason: input.reason,
    relatedReignId: input.relatedReignId,
    note: input.note,
  });
}

export async function fulfillCheckout(
  tx: Tx,
  input: {
    sessionId: string;
    paymentIntentId: string | null;
    email: string;
    url: string;
    hostname: string;
    tagline: string;
    logoUrl: string | null;
    minutes: number;
    action: "buy" | "cut" | "defend";
    dollarsPaidCents: number;
    creditAppliedCents: number;
    quotedPremiumCents: number;
    quotedSkipIds: string[];
  },
) {
  const now = new Date();
  const email = normalizeEmail(input.email);

  const [existing] = await tx
    .select({ id: reigns.id })
    .from(reigns)
    .where(eq(reigns.stripeCheckoutSessionId, input.sessionId))
    .limit(1);
  if (existing) {
    return { ok: true as const, duplicate: true, reignId: existing.id };
  }

  if (input.creditAppliedCents > 0) {
    const balance = await creditBalanceCents(tx, email);
    if (balance < input.creditAppliedCents) {
      throw new Error("Credit balance changed before payment settled.");
    }
  }

  const live = await getLiveReign(tx);

  if (input.action === "defend") {
    if (!live || normalizeEmail(live.buyerEmail) !== email) {
      throw new Error("Only the current holder can defend this reign.");
    }
    const endsAt = live.endsAt
      ? new Date(live.endsAt.getTime() + input.minutes * 60_000)
      : new Date(now.getTime() + input.minutes * 60_000);
    await tx
      .update(reigns)
      .set({
        minutesPaid: live.minutesPaid + input.minutes,
        endsAt,
        dollarsPaidCents: live.dollarsPaidCents + input.dollarsPaidCents,
        creditAppliedCents: live.creditAppliedCents + input.creditAppliedCents,
        updatedAt: now,
      })
      .where(eq(reigns.id, live.id));
    await writeCredit(tx, {
      email,
      deltaCents: -input.creditAppliedCents,
      reason: "spend",
      relatedReignId: live.id,
      note: "defend",
    });
    await tx
      .update(siteState)
      .set({
        totalGrossCents: sql`${siteState.totalGrossCents} + ${input.dollarsPaidCents}`,
        updatedAt: now,
      })
      .where(eq(siteState.id, 1));
    return { ok: true as const, duplicate: false, reignId: live.id };
  }

  const queued = await getQueuedReigns(tx);
  let queueSort: number;
  let jumpedQueue = false;
  let cutPremiumCentsPaid = 0;
  let skipped: Reign[] = [];

  if (input.action === "cut" && queued.length > 0) {
    jumpedQueue = true;
    cutPremiumCentsPaid = input.quotedPremiumCents;
    const quoted = new Set(input.quotedSkipIds);
    skipped = queued.filter((item) => quoted.has(item.id));
    const minSort = Math.min(...queued.map((item) => item.queueSort ?? 0));
    queueSort = minSort - 1;
  } else {
    const maxSort = queued.reduce(
      (max, item) => Math.max(max, item.queueSort ?? 0),
      0,
    );
    queueSort = maxSort + 1;
  }

  const reignId = newId();
  await tx.insert(reigns).values({
    id: reignId,
    url: input.url,
    hostname: input.hostname,
    tagline: input.tagline,
    logoUrl: input.logoUrl,
    buyerEmail: email,
    minutesPaid: input.minutes,
    status: "queued",
    queueSort,
    dollarsPaidCents: input.dollarsPaidCents,
    creditAppliedCents: input.creditAppliedCents,
    cutPremiumCents: cutPremiumCentsPaid,
    jumpedQueue,
    stripeCheckoutSessionId: input.sessionId,
    stripePaymentIntentId: input.paymentIntentId,
    createdAt: now,
    updatedAt: now,
  });

  await writeCredit(tx, {
    email,
    deltaCents: -input.creditAppliedCents,
    reason: "spend",
    relatedReignId: reignId,
    note: input.action,
  });

  if (jumpedQueue && skipped.length > 0) {
    const { toSkipped } = creditSplit(cutPremiumCentsPaid);
    const shares = allocateCredits(
      toSkipped,
      skipped.map((item) => item.minutesPaid),
    );
    for (const [index, item] of skipped.entries()) {
      await writeCredit(tx, {
        email: item.buyerEmail,
        deltaCents: shares[index] ?? 0,
        reason: "queue_cut",
        relatedReignId: reignId,
        note: `cut in front of ${item.hostname}`,
      });
    }
  }

  await tx
    .update(siteState)
    .set({
      totalGrossCents: sql`${siteState.totalGrossCents} + ${input.dollarsPaidCents}`,
      updatedAt: now,
    })
    .where(eq(siteState.id, 1));

  await advanceClock(tx, now);
  return { ok: true as const, duplicate: false, reignId };
}

export async function killLiveReign(reason: string) {
  return withQueueLock(async (tx) => {
    const now = new Date();
    const live = await getLiveReign(tx);
    if (live) {
      await archiveReign(tx, live, now, "killed", reason);
    }
    return advanceClock(tx, now);
  });
}

export async function setSiteKilled(killed: boolean, reason: string | null) {
  return withQueueLock(async (tx) => {
    await tx
      .update(siteState)
      .set({ killed, killedReason: reason, updatedAt: new Date() })
      .where(eq(siteState.id, 1));
    if (!killed) {
      return advanceClock(tx);
    }
    return { live: await getLiveReign(tx), promoted: null };
  });
}

export async function incrementClicks(id: string) {
  const db = getDb();
  const [row] = await db
    .update(reigns)
    .set({
      clickCount: sql`${reigns.clickCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(reigns.id, id), inArray(reigns.status, ["live", "archived"])))
    .returning({
      id: reigns.id,
      url: reigns.url,
      status: reigns.status,
    });
  return row ?? null;
}

export async function loadPublicState(): Promise<PublicState> {
  const db = getDb();
  await withQueueLock((tx) => advanceClock(tx));

  const [site, liveRows, queued, lastPaidRows] = await Promise.all([
    db.select().from(siteState).where(eq(siteState.id, 1)),
    db.select().from(reigns).where(eq(reigns.status, "live")).limit(1),
    db
      .select()
      .from(reigns)
      .where(eq(reigns.status, "queued"))
      .orderBy(asc(reigns.queueSort), asc(reigns.createdAt)),
    // Nobody paid for the seed and killed reigns were pulled for a reason, so
    // neither earns a mention while the homepage is empty.
    db
      .select()
      .from(reigns)
      .where(
        and(
          eq(reigns.status, "archived"),
          eq(reigns.isSeeded, false),
          gt(reigns.dollarsPaidCents, 0),
        ),
      )
      .orderBy(desc(reigns.endsAt))
      .limit(1),
  ]);

  const live = liveRows[0] ?? null;
  const lastPaid = lastPaidRows[0] ?? null;
  const now = new Date();
  const cut = quoteCut(queued);
  const liveRemainingSeconds = live?.endsAt
    ? secondsBetween(now, live.endsAt)
    : 0;

  return {
    serverNow: now.toISOString(),
    killed: site[0]?.killed ?? false,
    killedReason: site[0]?.killedReason ?? null,
    contactEmail: contactEmail(),
    live: live ? toPublicReign(live) : null,
    lastPaid: lastPaid ? toPublicReign(lastPaid) : null,
    queue: queued.map(toPublicReign),
    next: queued[0] ? toPublicReign(queued[0]) : null,
    stats: {
      grossCents: site[0]?.totalGrossCents ?? 0,
      queuedMinutes: queued.reduce((sum, item) => sum + item.minutesPaid, 0),
      liveRemainingSeconds,
    },
    cutQuote: {
      skippedMinutes: cut.skippedMinutes,
      premiumCents: cut.premiumCents,
      creditCents: cut.creditCents,
    },
  };
}

export async function loadArchive(limit = 48) {
  const db = getDb();
  return db
    .select()
    .from(reigns)
    .where(inArray(reigns.status, ["archived", "killed"]))
    .orderBy(desc(reigns.endsAt), desc(reigns.createdAt))
    .limit(limit);
}

export async function loadLongest(limit = 25) {
  const db = getDb();
  const rows = await db
    .select()
    .from(reigns)
    .where(inArray(reigns.status, ["archived", "live", "killed"]));
  return rows
    .map((row) => {
      const start = row.startedAt ?? row.createdAt;
      const end = row.status === "live" ? new Date() : (row.endsAt ?? start);
      return { reign: row, seconds: secondsBetween(start, end) };
    })
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, limit);
}

export async function loadReign(id: string) {
  const db = getDb();
  const [row] = await db.select().from(reigns).where(eq(reigns.id, id)).limit(1);
  return row ?? null;
}
