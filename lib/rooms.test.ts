import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanRoomName,
  cleanRoster,
  hashToken,
  makeRoomCode,
} from "./rooms";

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

test("creates short share codes and stable token hashes", () => {
  assert.match(makeRoomCode(), /^[a-f0-9]{6}$/);
  assert.equal(hashToken("host"), hashToken("host"));
  assert.notEqual(hashToken("host"), hashToken("joiner"));
});
