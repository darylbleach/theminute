export type PublicReign = {
  id: string;
  url: string;
  hostname: string;
  tagline: string;
  logoUrl: string | null;
  minutesPaid: number;
  startedAt: string | null;
  endsAt: string | null;
  clickCount: number;
  dollarsPaidCents: number;
  jumpedQueue: boolean;
  isSeeded: boolean;
  status: "queued" | "live" | "archived" | "killed";
};

export type PublicState = {
  serverNow: string;
  killed: boolean;
  killedReason: string | null;
  contactEmail: string;
  live: PublicReign | null;
  /** The most recent paying advertiser, shown while the homepage sits empty. */
  lastPaid: PublicReign | null;
  queue: PublicReign[];
  next: PublicReign | null;
  stats: {
    grossCents: number;
    queuedMinutes: number;
    liveRemainingSeconds: number;
  };
  cutQuote: {
    skippedMinutes: number;
    premiumCents: number;
    creditCents: number;
  };
};
