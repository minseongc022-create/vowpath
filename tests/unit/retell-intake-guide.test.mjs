import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRetellIntakeGuide,
  buildReturningCustomerHint,
} from "../../lib/retell-intake-guide.ts";

test("buildRetellIntakeGuide restoration includes insurance and active loss", () => {
  const guide = buildRetellIntakeGuide("restoration");
  assert.match(guide, /insurance/i);
  assert.match(guide, /still leaking/i);
  assert.match(guide, /READ-BACK/i);
});

test("buildRetellIntakeGuide hvac includes urgency fields", () => {
  const guide = buildRetellIntakeGuide("hvac");
  assert.match(guide, /HVAC/i);
  assert.match(guide, /How soon/i);
});

test("buildReturningCustomerHint empty when no match", () => {
  assert.equal(buildReturningCustomerHint(null), "");
});

test("buildReturningCustomerHint welcomes back prior caller", () => {
  const hint = buildReturningCustomerHint({
    customerName: "Jane Doe",
    address: "123 Main St, Austin TX",
  });
  assert.match(hint, /Jane Doe/);
  assert.match(hint, /Welcome back/i);
});
