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
const sms = readFileSync(join(root, "lib/sms-templates.ts"), "utf8");
const portal = readFileSync(join(root, "lib/portal-url.ts"), "utf8");
const booking = readFileSync(join(root, "lib/call-intake/booking-confirmation.ts"), "utf8");

test("generateLinkIntakeToken produces 16-char hex", () => {
  const token = generateLinkIntakeToken();
  assert.match(token, /^[a-f0-9]{16}$/);
});

test("normalizeLinkIntakeToken rejects truncated tokens from split SMS", () => {
  assert.equal(normalizeLinkIntakeToken("3ef19e"), null);
  assert.equal(isLikelyTruncatedLinkToken("3ef19e"), true);
});

test("compactSmsPortalUrl shortens link host for SMS", () => {
  assert.match(portal, /compactSmsPortalUrl/);
  assert.match(portal, /https:\/\/effiroad\.com/);
});

test("buildSmsWithLink splits URL to its own SMS when needed", () => {
  assert.match(sms, /export function buildSmsWithLink/);
  assert.match(sms, /Link in next text/);
  assert.match(sms, /return \[line1, cleanUrl\]/);
});

test("customer SMS copy is short and action-first", () => {
  assert.match(sms, /Thanks for calling\. Open this link:/);
  assert.match(sms, /Request received\. Confirm:/);
  assert.match(sms, /We text when we leave/);
  assert.doesNotMatch(sms, /In review\./);
  assert.match(sms, / Urgent\./);
});

test("booking confirmation sends multi-part SMS when URL present", () => {
  assert.match(booking, /sendSmsMessages/);
  assert.match(booking, /smsCustomerBookingConfirmationMessages/);
});
