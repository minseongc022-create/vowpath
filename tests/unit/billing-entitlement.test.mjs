import assert from "node:assert/strict";
import test from "node:test";

/** Mirror of lib/billing.ts isEntitled() for node unit tests (production LS on). */
function isEntitled(user) {
  if (!user) return false;
  if (process.env.NEXT_PUBLIC_BETA === "true") return true;
  const lsKey = process.env.LEMON_SQUEEZY_API_KEY?.trim();
  if (!lsKey || lsKey.includes("replace")) return true;

  const status = user.subscriptionStatus ?? "none";
  if (status === "active") return true;
  if (status === "past_due") return true;
  if (status === "trialing") {
    if (!user.trialEndsAt) return false;
    return new Date(user.trialEndsAt).getTime() > Date.now();
  }
  return false;
}

const baseUser = {
  id: "u1",
  email: "a@b.com",
  passwordHash: "x",
  shopName: "Shop",
  createdAt: new Date().toISOString(),
};

test("isEntitled: none status is not entitled in production", () => {
  process.env.NEXT_PUBLIC_BETA = "false";
  process.env.LEMON_SQUEEZY_API_KEY = "test_ls_key";
  assert.equal(isEntitled({ ...baseUser, subscriptionStatus: "none" }), false);
});

test("isEntitled: active subscription is entitled", () => {
  assert.equal(
    isEntitled({ ...baseUser, subscriptionStatus: "active", paidAt: new Date().toISOString() }),
    true,
  );
});

test("isEntitled: expired trial is not entitled", () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  assert.equal(
    isEntitled({ ...baseUser, subscriptionStatus: "trialing", trialEndsAt: past }),
    false,
  );
});

test("isEntitled: valid 14-day trial is entitled", () => {
  const future = new Date(Date.now() + 14 * 86_400_000).toISOString();
  assert.equal(
    isEntitled({ ...baseUser, subscriptionStatus: "trialing", trialEndsAt: future }),
    true,
  );
});
