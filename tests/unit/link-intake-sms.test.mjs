import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateLinkIntakeToken,
  isLikelyTruncatedLinkToken,
  normalizeLinkIntakeToken,
} from "../../lib/link-intake-token.ts";

const root = process.cwd();

test("generateLinkIntakeToken produces 16-char hex", () => {
  const token = generateLinkIntakeToken();
  assert.match(token, /^[a-f0-9]{16}$/);
});

test("normalizeLinkIntakeToken accepts legacy 32-char tokens", () => {
  const legacy = "a".repeat(32);
  assert.equal(normalizeLinkIntakeToken(legacy), legacy);
  assert.equal(normalizeLinkIntakeToken("a".repeat(16)), "a".repeat(16));
});

test("normalizeLinkIntakeToken rejects truncated tokens from split SMS", () => {
  assert.equal(normalizeLinkIntakeToken("abc"), null);
  assert.equal(normalizeLinkIntakeToken("zzzzzzzzzzzzzzzz"), null);
  assert.equal(normalizeLinkIntakeToken("df5fe3252e0f4817b8be2eb81"), null); // 25-char fragment
  assert.equal(normalizeLinkIntakeToken("4f6d7e5"), null);
  assert.equal(isLikelyTruncatedLinkToken("4f6d7e5"), true);
  assert.equal(isLikelyTruncatedLinkToken("a1b2c3d4e5f67890"), false);
});

test("booking review sessions use short 16-char tokens (not 32-char UUID)", () => {
  const src = readFileSync(join(root, "lib/call-intake/booking-confirmation.ts"), "utf8");
  assert.match(src, /generateLinkIntakeToken/);
  assert.doesNotMatch(src, /crypto\.randomUUID\(\)\.replace/);
});

test("smsBodyWithUrl guards against mid-URL SMS splits", () => {
  const src = readFileSync(join(root, "lib/sms-templates.ts"), "utf8");
  assert.match(src, /GSM_CONCAT = 153/);
  assert.match(src, /smsAsciiSafe/);
  assert.match(src, /Never let a URL/);
});
