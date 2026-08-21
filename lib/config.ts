export const SITE_NAME = "The Minute";
export const SITE_HOST = "theminute.lol";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE_HOST}`).replace(
    /\/$/,
    "",
  );
}

export function contactEmail() {
  return process.env.CONTACT_EMAIL ?? `hello@${SITE_HOST}`;
}

export const CENTS_PER_MINUTE = 100;
export const MIN_MINUTES = 5;
export const MAX_MINUTES = 24 * 60;
export const CUT_MULTIPLIER = 2;
export const CREDIT_SHARE = 0.8;
export const STRIPE_MIN_CHARGE_CENTS = 50;
export const TAGLINE_MAX = 140;

export const FIRST_REIGN_URL =
  process.env.FIRST_REIGN_URL ?? `https://${SITE_HOST}`;
export const FIRST_REIGN_TAGLINE =
  process.env.FIRST_REIGN_TAGLINE ??
  "The whole homepage. One dollar a minute.";
export const FIRST_REIGN_MINUTES = Number(process.env.FIRST_REIGN_MINUTES ?? 1440);
