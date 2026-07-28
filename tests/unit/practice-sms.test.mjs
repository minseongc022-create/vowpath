import assert from "node:assert/strict";
import test from "node:test";
import { withPracticeSmsPrefix } from "../../lib/practice-sms.ts";

test("withPracticeSmsPrefix adds TEST once", () => {
  assert.equal(
    withPracticeSmsPrefix("Effiroad: Thanks for calling.", true),
    "Effiroad [TEST]: Thanks for calling.",
  );
});

test("withPracticeSmsPrefix unchanged when live", () => {
  assert.equal(
    withPracticeSmsPrefix("Effiroad: Thanks for calling.", false),
    "Effiroad: Thanks for calling.",
  );
});

test("withPracticeSmsPrefix uses short TEST: when body has a URL", () => {
  const url = "https://link.effiroad.com/r/a1b2c3d4e5f67890";
  assert.equal(
    withPracticeSmsPrefix(`Shop: Open ${url}`, true),
    `TEST: Shop: Open ${url}`,
  );
});
