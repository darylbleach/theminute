# The Minute

`$1` buys one minute of the entire homepage. Not a row. Not a rank. The whole page, with a public countdown. When the clock hits zero, the next paid URL slams in.

Live at [theminute.lol](https://theminute.lol).

## Mechanic

1. **$1 = 1 minute.** Minimum 5. URL, logo, and one line of copy.
2. **The queue is public.** Everyone sees who is next.
3. **Cutting the line** costs 2× the remaining minutes of everyone skipped. 80% of that premium is site credit for the people you jumped. 20% is the house.
4. **Defend live.** The current holder can add minutes while the clock is running.
5. **Every reign is archived.** Longest reign cannot be bought retroactively.

This is paid advertising placement, not a contest. No refunds. Credits are site credit, not cash.

## Stack

Next.js on Vercel, Stripe Checkout, Neon Postgres.

## Setup

```bash
cp .env.example .env.local
# fill DATABASE_URL and Stripe keys
npm install
npm run db:push
npm run db:seed
npm run dev
```

Stripe webhook endpoint: `/api/stripe/webhook`  
Kill switch: `/admin/kill` with `KILL_SECRET`  
Clock advance: Vercel Cron hits `/api/tick` every minute
