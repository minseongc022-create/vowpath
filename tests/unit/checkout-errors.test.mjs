import assert from "node:assert/strict";
import test from "node:test";

import { checkoutErrorMessage } from "../../lib/checkout-errors.ts";

test("checkoutErrorMessage: not configured", () => {
  assert.match(checkoutErrorMessage("not_configured"), /Lemon Squeezy approval/i);
});

test("checkoutErrorMessage: beta mode", () => {
  assert.match(checkoutErrorMessage("beta"), /beta mode/i);
});
