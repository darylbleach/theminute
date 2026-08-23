import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const reignStatusEnum = pgEnum("reign_status", [
  "queued",
  "live",
  "archived",
  "killed",
]);

export const creditReasonEnum = pgEnum("credit_reason", [
  "queue_cut",
  "spend",
  "house",
]);

export const reigns = pgTable(
  "reigns",
  {
    id: text("id").primaryKey(),
    url: text("url").notNull(),
    hostname: text("hostname").notNull(),
    tagline: text("tagline").notNull(),
    logoUrl: text("logo_url"),
    buyerEmail: text("buyer_email").notNull(),
    minutesPaid: integer("minutes_paid").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: reignStatusEnum("status").notNull().default("queued"),
    queueSort: integer("queue_sort"),
    clickCount: integer("click_count").notNull().default(0),
    dollarsPaidCents: integer("dollars_paid_cents").notNull(),
    creditAppliedCents: integer("credit_applied_cents").notNull().default(0),
    cutPremiumCents: integer("cut_premium_cents").notNull().default(0),
    jumpedQueue: boolean("jumped_queue").notNull().default(false),
    isSeeded: boolean("is_seeded").notNull().default(false),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    killedReason: text("killed_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("reigns_stripe_session_uidx").on(table.stripeCheckoutSessionId),
    index("reigns_status_idx").on(table.status),
    index("reigns_queue_sort_idx").on(table.queueSort),
    index("reigns_buyer_email_idx").on(table.buyerEmail),
    index("reigns_created_at_idx").on(table.createdAt),
  ],
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    deltaCents: integer("delta_cents").notNull(),
    reason: creditReasonEnum("reason").notNull(),
    relatedReignId: text("related_reign_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("credit_ledger_email_idx").on(table.email),
    index("credit_ledger_created_at_idx").on(table.createdAt),
  ],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const siteState = pgTable("site_state", {
  id: integer("id").primaryKey().default(1),
  killed: boolean("killed").notNull().default(false),
  killedReason: text("killed_reason"),
  totalGrossCents: integer("total_gross_cents").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rooms = pgTable(
  "rooms",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    roster: jsonb("roster").$type<string[]>().notNull(),
    currentIndex: integer("current_index").notNull().default(0),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    hostTokenHash: text("host_token_hash").notNull(),
    paid: boolean("paid").notNull().default(false),
    slotSeconds: integer("slot_seconds").notNull().default(60),
    paidEmail: text("paid_email"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeSessionId: text("stripe_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("rooms_host_token_hash_uidx").on(table.hostTokenHash),
    index("rooms_updated_at_idx").on(table.updatedAt),
    index("rooms_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
    index("rooms_paid_email_idx").on(table.paidEmail),
  ],
);

export const loginTokens = pgTable(
  "login_tokens",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("login_tokens_token_hash_uidx").on(table.tokenHash),
    index("login_tokens_email_idx").on(table.email),
    index("login_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export type Reign = typeof reigns.$inferSelect;
export type NewReign = typeof reigns.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type LoginToken = typeof loginTokens.$inferSelect;

export const loginLockouts = pgTable("login_lockouts", {
  key: text("key").primaryKey(),
  failCount: integer("fail_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LoginLockout = typeof loginLockouts.$inferSelect;
