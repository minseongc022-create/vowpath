import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

/** Mirrors giu/lib/payments.ts + stripe/vnpay config helpers for node tests. */
function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function isVnpayConfigured() {
  return Boolean(
    process.env.VNPAY_TMN_CODE?.trim() && process.env.VNPAY_HASH_SECRET?.trim(),
  );
}

function demoFlag() {
  const flag = process.env.GIU_PAYMENT_DEMO?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return null;
}

function isGiuPaymentDemo() {
  const forced = demoFlag();
  if (forced === true) return true;
  if (forced === false) return false;
  return !isStripeConfigured() && !isVnpayConfigured();
}

function resolveGiuPaymentBackend() {
  if (isGiuPaymentDemo()) return "demo";
  const forced = process.env.GIU_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (forced === "stripe" && isStripeConfigured()) return "stripe";
  if (forced === "vnpay" && isVnpayConfigured()) return "vnpay";
  if (forced === "demo") return "demo";
  if (isStripeConfigured()) return "stripe";
  if (isVnpayConfigured()) return "vnpay";
  return "demo";
}

describe("giu payment backend resolution", () => {
  const envKeys = [
    "GIU_PAYMENT_DEMO",
    "GIU_PAYMENT_PROVIDER",
    "STRIPE_SECRET_KEY",
    "VNPAY_TMN_CODE",
    "VNPAY_HASH_SECRET",
  ];

  const saved = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));

  afterEach(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("defaults to demo when no keys", () => {
    for (const key of envKeys) delete process.env[key];
    assert.equal(resolveGiuPaymentBackend(), "demo");
    assert.equal(isGiuPaymentDemo(), true);
  });

  it("prefers stripe when both stripe and vnpay configured", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.VNPAY_TMN_CODE = "TMN";
    process.env.VNPAY_HASH_SECRET = "secret";
    delete process.env.GIU_PAYMENT_DEMO;
    assert.equal(resolveGiuPaymentBackend(), "stripe");
  });

  it("forces vnpay when GIU_PAYMENT_PROVIDER=vnpay", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.VNPAY_TMN_CODE = "TMN";
    process.env.VNPAY_HASH_SECRET = "secret";
    process.env.GIU_PAYMENT_PROVIDER = "vnpay";
    assert.equal(resolveGiuPaymentBackend(), "vnpay");
  });

  it("GIU_PAYMENT_DEMO=0 disables demo even without keys", () => {
    process.env.GIU_PAYMENT_DEMO = "0";
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.VNPAY_TMN_CODE;
    delete process.env.VNPAY_HASH_SECRET;
    assert.equal(isGiuPaymentDemo(), false);
    assert.equal(resolveGiuPaymentBackend(), "demo");
  });
});
