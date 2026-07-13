import assert from "node:assert/strict";
import test from "node:test";

import { checkoutErrorMessage, paddleErrorToCode } from "../../lib/checkout-errors.ts";

test("paddleErrorToCode: checkout not enabled", () => {
  const body = {
    error: {
      code: "transaction_checkout_not_enabled",
      detail: "Checkout has not yet been enabled",
    },
  };
  assert.equal(paddleErrorToCode(body), "paddle_checkout_disabled");
});

test("checkoutErrorMessage: paddle checkout disabled", () => {
  assert.match(checkoutErrorMessage("paddle_checkout_disabled"), /Paddle checkout/i);
});

test("checkoutErrorMessage: beta mode", () => {
  assert.match(checkoutErrorMessage("beta"), /beta mode/i);
});
