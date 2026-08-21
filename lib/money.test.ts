import assert from "node:assert/strict";
import test from "node:test";
import { allocateCredits, applyCredits, creditSplit, cutPremiumCents } from "./money";

test("cut premium is 2x remaining minutes at $1", () => {
  assert.equal(cutPremiumCents(10 + 20 + 5), 7000);
});

test("house keeps 20 percent of the cut premium", () => {
  assert.deepEqual(creditSplit(7000), { toSkipped: 5600, house: 1400 });
});

test("credits split by remaining minutes without losing cents", () => {
  assert.deepEqual(allocateCredits(5600, [10, 20, 5]), [1600, 3200, 800]);
  assert.equal(
    allocateCredits(100, [1, 1, 1]).reduce((sum, value) => sum + value, 0),
    100,
  );
});

test("credits never drop a Stripe charge below 50 cents", () => {
  assert.deepEqual(applyCredits(500, 10_000), {
    creditApplied: 450,
    chargedCents: 50,
  });
  assert.deepEqual(applyCredits(500, 0), {
    creditApplied: 0,
    chargedCents: 500,
  });
});
