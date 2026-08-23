# The Minute

The Minute is a shared stand-up timer: create a room, share its link, and give
each person 60 seconds before the clock automatically moves to the next name.
No account is required.

Live at [theminute.lol](https://theminute.lol).

## MVP

1. Name a room and add a running order of up to six people.
2. Share the `/r/[code]` link across phones, laptops, or a meeting-room TV.
3. The Neon-backed clock stays in sync across devices and advances every minute.
4. The creating browser is the host and can skip or restart a speaker.
5. The last roster is remembered in that browser.
6. Unlock a room for £19 once or £3/month (Stripe Checkout). Paid hosts get a
   saved Neon roster and slot lengths of 30s / 1 / 2 / 5 minutes or a custom
   number of minutes. Free rooms stay locked at 60 seconds and six people.

## Stack

Next.js on Vercel, Neon Postgres with Drizzle, Stripe Checkout, and polling
once per second. The previous Stripe auction routes remain in the repository
but are not linked from the homepage.

## Setup

```bash
cp .env.example .env.local
# fill DATABASE_URL and Stripe keys (test keys are fine locally)
npm install
npm run db:push
npm run dev
```

Open the homepage, create a room, then open its share link in a private window
or on another device to test joining and clock synchronization.
