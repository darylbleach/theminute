# Contributing

Thanks for helping with The Minute. Please follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Run locally

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

## Pull requests

1. Open an issue first for larger changes, or a PR for a focused fix.
2. Keep the change small and explain why it is needed.
3. Do not commit `.env.local`, secrets, `.cursor/`, or `.DS_Store`.
