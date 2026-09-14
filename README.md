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
7. After checkout, the Stripe email owns the room. Open it from any computer at
   `/login` with a magic link or six-digit code (no password). Joiners still
   use `/r/[code]` with no login. Free rooms stay cookie-only.

## Stack

Next.js on Vercel, Neon Postgres with Drizzle, Stripe Checkout, and polling
once per second. Old auction URLs (`/buy`, `/queue`, `/archive`, `/longest`,
`/reign`, `/success`, `/go`) 301 to `/`. The Stripe webhook and auction
checkout API remain for in-flight payments.

## Setup

```bash
cp .env.example .env.local
# fill DATABASE_URL, Stripe keys (test keys are fine locally),
# and RESEND_API_KEY so /login can email magic links
npm install
npm run db:push
npm run dev
```

Open the homepage, create a room, then open its share link in a private window
or on another device to test joining and clock synchronization.

## License

[MIT](LICENSE) — OSI-approved.
