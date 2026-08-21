import {
  CENTS_PER_MINUTE,
  CREDIT_SHARE,
  CUT_MULTIPLIER,
  STRIPE_MIN_CHARGE_CENTS,
} from "./config";

export function minutesCostCents(minutes: number) {
  return minutes * CENTS_PER_MINUTE;
}

export function cutPremiumCents(skippedMinutes: number) {
  return skippedMinutes * CENTS_PER_MINUTE * CUT_MULTIPLIER;
}

export function creditSplit(premiumCents: number) {
  const toSkipped = Math.floor(premiumCents * CREDIT_SHARE);
  return { toSkipped, house: premiumCents - toSkipped };
}

export function allocateCredits(totalCents: number, weights: number[]) {
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) return weights.map(() => 0);

  const raw = weights.map((weight) => (totalCents * weight) / weightSum);
  const floors = raw.map((value) => Math.floor(value));
  const remainder = totalCents - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remainder; i += 1) {
    floors[order[i % order.length].index] += 1;
  }
  return floors;
}

export function applyCredits(expectedCents: number, availableCredits: number) {
  const safeExpected = Math.max(0, expectedCents);
  const safeCredits = Math.max(0, availableCredits);
  if (safeExpected === 0) {
    return { creditApplied: 0, chargedCents: 0 };
  }

  const maxCredit =
    safeExpected <= STRIPE_MIN_CHARGE_CENTS
      ? 0
      : safeExpected - STRIPE_MIN_CHARGE_CENTS;
  const creditApplied = Math.min(safeCredits, maxCredit);
  return {
    creditApplied,
    chargedCents: safeExpected - creditApplied,
  };
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
