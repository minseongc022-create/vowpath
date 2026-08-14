import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

/** Mirrors giu/lib/payments.ts + lemon-squeezy-giu helpers for node tests. */
function isGiuLsConfigured() {
  const key = process.env.LEMON_SQUEEZY_API_KEY?.trim();
  const store = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
  const variant = process.env.LEMON_SQUEEZY_VARIANT_ID_GIU?.trim();
  return Boolean(key && store && variant && !key.includes("xxxx"));
}

function isVnpayConfigured() {
  return Boolean(
    process.env.VNPAY_TMN_CODE?.trim() && process.env.VNPAY_HASH_SECRET?.trim(),
  );
}

function isGiuPaymentDemo() {
  const flag = process.env.GIU_PAYMENT_DEMO?.trim().toLowerCase();
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return !isGiuLsConfigured() && !isVnpayConfigured();
}

function resolveGiuPaymentBackend() {
  if (isGiuPaymentDemo()) return "demo";
  const forced = process.env.GIU_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (
    (forced === "lemon_squeezy" || forced === "lemonsqueezy") &&
    isGiuLsConfigured()
  ) {
    return "lemon_squeezy";
  }
  if (forced === "vnpay" && isVnpayConfigured()) return "vnpay";
  if (isGiuLsConfigured()) return "lemon_squeezy";
  if (isVnpayConfigured()) return "vnpay";
  return "demo";
}

function vndToUsdCents(amountVnd) {
  const rate = Number(process.env.GIU_VND_PER_USD?.trim()) || 25000;
  return Math.max(50, Math.round((amountVnd / rate) * 100));
}

describe("giu payment backend", () => {
  const envKeys = [
    "GIU_PAYMENT_DEMO",
    "GIU_PAYMENT_PROVIDER",
    "LEMON_SQUEEZY_API_KEY",
    "LEMON_SQUEEZY_STORE_ID",
    "LEMON_SQUEEZY_VARIANT_ID_GIU",
    "VNPAY_TMN_CODE",
    "VNPAY_HASH_SECRET",
    "GIU_VND_PER_USD",
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
  });

  it("prefers lemon_squeezy when configured", () => {
    process.env.LEMON_SQUEEZY_API_KEY = "ls_test_key";
    process.env.LEMON_SQUEEZY_STORE_ID = "12345";
    process.env.LEMON_SQUEEZY_VARIANT_ID_GIU = "999";
    assert.equal(resolveGiuPaymentBackend(), "lemon_squeezy");
  });

  it("converts VND to USD cents", () => {
    process.env.GIU_VND_PER_USD = "25000";
    assert.equal(vndToUsdCents(50000), 200);
    assert.equal(vndToUsdCents(1000), 50);
  });
});
