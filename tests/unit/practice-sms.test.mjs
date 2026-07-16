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

test("withPracticeSmsPrefix does not double-prefix", () => {
  assert.equal(
    withPracticeSmsPrefix("Effiroad [TEST]: Already marked.", true),
    "Effiroad [TEST]: Already marked.",
  );
});
