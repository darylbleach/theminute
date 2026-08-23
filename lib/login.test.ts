import assert from "node:assert/strict";
import test from "node:test";
import { RESEND_MISSING_MESSAGE, loginFromAddress } from "./email";
import { LOGIN_SENT_MESSAGE, LOGIN_TTL_MS } from "./login-copy";
import {
  cleanLoginCode,
  cleanLoginEmail,
  cleanLoginToken,
  destinationAfterLogin,
  hashesMatch,
  loginVerifyPath,
  makeLoginCode,
  makeLoginLinkToken,
} from "./login";

test("normalises the Stripe checkout email", () => {
  assert.equal(cleanLoginEmail("  Ada@Example.COM "), "ada@example.com");
  assert.throws(() => cleanLoginEmail(""), /Stripe checkout/);
  assert.throws(() => cleanLoginEmail("not-an-email"), /valid email/);
});

test("accepts a six-digit code and rejects anything else", () => {
  assert.equal(cleanLoginCode("123456"), "123456");
  assert.equal(cleanLoginCode(" 12 34 56 "), "123456");
  assert.throws(() => cleanLoginCode("12345"), /six-digit/);
  assert.throws(() => cleanLoginCode("12345a"), /six-digit/);
});

test("accepts opaque magic-link tokens only", () => {
  assert.equal(cleanLoginToken("abc_DEF-123"), "abc_DEF-123");
  assert.throws(() => cleanLoginToken(""), /not valid/);
  assert.throws(() => cleanLoginToken("token with spaces"), /not valid/);
});

test("login codes are six digits and link tokens are unguessable", () => {
  const code = makeLoginCode();
  assert.match(code, /^\d{6}$/);
  const token = makeLoginLinkToken();
  assert.ok(token.length >= 32);
  assert.notEqual(token, makeLoginLinkToken());
});

test("hash comparison is length-safe", () => {
  assert.equal(hashesMatch("aa", "aa"), true);
  assert.equal(hashesMatch("aa", "ab"), false);
  assert.equal(hashesMatch("aa", "a"), false);
});

test("login lands on the last paid room or the rooms list", () => {
  assert.equal(destinationAfterLogin([]), null);
  assert.equal(destinationAfterLogin([{ code: "aa11bb" }]), "/r/aa11bb");
  assert.equal(
    destinationAfterLogin([{ code: "aa11bb" }, { code: "cc22dd" }]),
    "/rooms",
  );
});

test("magic link path and copy stay on the stand-up product", () => {
  assert.equal(loginVerifyPath("tok"), "/login/verify?token=tok");
  assert.match(LOGIN_SENT_MESSAGE, /stand-up/);
  assert.equal(LOGIN_TTL_MS, 20 * 60 * 1000);
  assert.match(RESEND_MISSING_MESSAGE, /RESEND_API_KEY/);
  assert.match(RESEND_MISSING_MESSAGE, /Resend/);
  assert.match(loginFromAddress(), /hello@theminute\.lol/);
});
