import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFreeLimits,
  cleanRoomName,
  cleanRoster,
  cleanSlotSeconds,
  hashToken,
  makeRoomCode,
  maxPeopleFor,
  slotLabel,
  slotSecondsFor,
} from "./rooms";
import {
  isPaidRoomMetadata,
  isRoomPlan,
  roomCheckoutMetadata,
  roomPlanPrice,
} from "./room-billing";

test("normalizes room and roster names", () => {
  assert.equal(cleanRoomName("  Product   standup "), "Product standup");
  assert.deepEqual(cleanRoster([" Ada ", "Grace   Hopper"]), [
    "Ada",
    "Grace Hopper",
  ]);
});

test("enforces the six-person free limit", () => {
  assert.throws(
    () => cleanRoster(["1", "2", "3", "4", "5", "6", "7"]),
    /limited to 6/,
  );
});

test("paid rooms can take more than six people", () => {
  const names = Array.from({ length: 8 }, (_, index) => `Person ${index + 1}`);
  assert.equal(cleanRoster(names, 50).length, 8);
  assert.throws(() => cleanRoster(names, 6), /limited to 6/);
});

test("creates short share codes and stable token hashes", () => {
  assert.match(makeRoomCode(), /^[a-f0-9]{6}$/);
  assert.equal(hashToken("host"), hashToken("host"));
  assert.notEqual(hashToken("host"), hashToken("joiner"));
});

test("free rooms stay on 60-second slots", () => {
  assert.equal(slotSecondsFor({ paid: false, slotSeconds: 300 }), 60);
  assert.equal(slotSecondsFor({ paid: true, slotSeconds: 300 }), 300);
  assert.equal(maxPeopleFor({ paid: false }), 6);
  assert.equal(maxPeopleFor({ paid: true }), 50);
});

test("accepts preset and custom minute slots", () => {
  assert.equal(cleanSlotSeconds(30), 30);
  assert.equal(cleanSlotSeconds(60), 60);
  assert.equal(cleanSlotSeconds(120), 120);
  assert.equal(cleanSlotSeconds(300), 300);
  assert.equal(cleanSlotSeconds(9 * 60), 540);
  assert.throws(() => cleanSlotSeconds(45), /whole number of minutes/);
  assert.throws(() => cleanSlotSeconds(0), /Pick a slot length/);
  assert.equal(slotLabel(30), "30s");
  assert.equal(slotLabel(60), "1 min");
  assert.equal(slotLabel(120), "2 min");
});

test("cancelled monthly rooms drop back to free limits", () => {
  const now = Date.now();
  const limited = applyFreeLimits({
    code: "abc123",
    name: "Team",
    roster: ["1", "2", "3", "4", "5", "6", "7", "8"],
    currentIndex: 7,
    endsAt: new Date(now + 5 * 60 * 1000),
    hostTokenHash: "hash",
    paid: true,
    slotSeconds: 300,
    paidEmail: "host@example.com",
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
    stripeSessionId: "cs_123",
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });
  assert.equal(limited.paid, false);
  assert.equal(limited.slotSeconds, 60);
  assert.equal(limited.stripeSubscriptionId, null);
  assert.deepEqual(limited.roster, ["1", "2", "3", "4", "5", "6"]);
  assert.equal(limited.currentIndex, 5);
});

test("classifies paid-room Stripe metadata without touching auction sessions", () => {
  assert.equal(isPaidRoomMetadata({ kind: "standup_room", roomCode: "aa11bb" }), true);
  assert.equal(isPaidRoomMetadata({ product: "room", roomCode: "aa11bb" }), true);
  assert.equal(
    isPaidRoomMetadata({
      action: "buy",
      url: "https://example.com",
      hostname: "example.com",
      tagline: "hello",
      minutes: "5",
    }),
    false,
  );
  assert.equal(isRoomPlan("once"), true);
  assert.equal(isRoomPlan("monthly"), true);
  assert.equal(isRoomPlan("buy"), false);
  assert.deepEqual(roomCheckoutMetadata("aa11bb", "once"), {
    kind: "standup_room",
    product: "room",
    roomCode: "aa11bb",
    plan: "once",
  });
  assert.equal(roomPlanPrice("once").unitAmount, 1900);
  assert.equal(roomPlanPrice("once").currency, "gbp");
  assert.equal(roomPlanPrice("monthly").unitAmount, 300);
});
