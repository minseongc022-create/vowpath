import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SERVICE_LIMITATIONS_CONSENT_VERSION } from "../../lib/service-limitations-consent.ts";

const root = process.cwd();
const outreach = readFileSync(join(root, "lib/outreach/shop-outreach-messages.ts"), "utf8");
const limitations = readFileSync(join(root, "lib/service-limitations-consent.ts"), "utf8");

test("shop outreach messages are warm and feedback-first", () => {
  assert.match(outreach, /shopOutreachTargets/);
  assert.match(outreach, /Justin@dryoutdaddyrestoration\.com/);
  assert.match(outreach, /feedback|tell me what/i);
  assert.doesNotMatch(outreach, /not liable|indemnif/i);
});

test("service limitations consent includes beta period", () => {
  assert.equal(SERVICE_LIMITATIONS_CONSENT_VERSION, "2026-09");
  assert.match(limitations, /BETA PERIOD|베타·파일럿/);
});
