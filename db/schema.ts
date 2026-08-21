import {
  boolean,
  index,
  integer,
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

export type Reign = typeof reigns.$inferSelect;
export type NewReign = typeof reigns.$inferInsert;
