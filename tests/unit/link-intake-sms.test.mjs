import assert from "node:assert/strict";
import test from "node:test";
import { generateLinkIntakeToken, normalizeLinkIntakeToken } from "../../lib/link-intake-token.ts";

const SAMPLE_URL = "https://link.effiroad.com/r/a1b2c3d4e5f67890";

test("generateLinkIntakeToken produces 16-char hex", () => {
  const token = generateLinkIntakeToken();
  assert.match(token, /^[a-f0-9]{16}$/);
});

test("normalizeLinkIntakeToken accepts legacy 32-char tokens", () => {
  const legacy = "a".repeat(32);
  assert.equal(normalizeLinkIntakeToken(legacy), legacy);
});

test("normalizeLinkIntakeToken rejects truncated tokens from split SMS", () => {
  assert.equal(normalizeLinkIntakeToken("abc"), null);
  assert.equal(normalizeLinkIntakeToken("zzzzzzzzzzzzzzzz"), null);
});

test("link intake SMS template fits one GSM segment at max shop name width", () => {
  const shop = "Smith Restoration & Water";
  const intro = `${shop}: Hi! Thanks for calling! Finish here (~1 min):`;
  const body = `${intro} ${SAMPLE_URL} Reply STOP to opt out.`;
  assert.ok(body.length <= 160, `expected <=160 chars, got ${body.length}: ${body}`);
});
