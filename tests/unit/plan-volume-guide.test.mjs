import assert from "node:assert/strict";
import test from "node:test";

/** Mirror list prices + AI COGS from lib/constants.ts / plan-volume-guide.ts */
const LITE_BASE = 39;
const LITE_PER = 18;
const FLEX_BASE = 69;
const FLEX_PER = 12;
const PRO = 299;
const SCALE = 399;
const PRO_INCLUDED = 25;
const PREMIUM_COGS = 6;
const PRO_OVERAGE_MULT = 2.5;
const VOICE_STARTER_INCLUDED = 250;
const VOICE_PRO_INCLUDED = 1000;

function breakpoints() {
  const liteFlexCross = (FLEX_BASE - LITE_BASE) / (LITE_PER - FLEX_PER);
  const flexProCross = (PRO - FLEX_BASE) / FLEX_PER;
  const proOverageRate = PREMIUM_COGS * PRO_OVERAGE_MULT;
  const proScaleCross = (SCALE - PRO) / proOverageRate;
  const flexStarts = Math.ceil(liteFlexCross);
  const proStarts = Math.ceil(flexProCross);
  const scaleStarts = Math.ceil(proScaleCross) + PRO_INCLUDED;
  return {
    liteFlexCross,
    flexProCross,
    liteMax: flexStarts - 1,
    flexMin: flexStarts,
    flexMax: proStarts - 1,
    proMin: proStarts,
    proMax: scaleStarts - 1,
    scaleMin: scaleStarts,
  };
}

function aiTier(_plan) {
  return "premium";
}

function billableMinutesFromDurationSec(durationSec) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0;
  return Math.ceil(durationSec / 60);
}

function overageMinutesFromCall(included, minutesBeforeCall, callMinutes) {
  if (callMinutes <= 0) return 0;
  const after = minutesBeforeCall + callMinutes;
  if (after <= included) return 0;
  if (minutesBeforeCall >= included) return callMinutes;
  return after - included;
}

function isPerMinutePlan(plan) {
  return plan === "voice_starter" || plan === "voice_pro";
}

function isDispatchBillingPlan(plan) {
  return plan === "lite" || plan === "flex" || plan === "pro" || plan === "scale";
}

test("AI tier: all live plans use premium", () => {
  assert.equal(aiTier("lite"), "premium");
  assert.equal(aiTier("flex"), "premium");
  assert.equal(aiTier("pro"), "premium");
  assert.equal(aiTier("scale"), "premium");
  assert.equal(aiTier("voice_starter"), "premium");
  assert.equal(aiTier("voice_pro"), "premium");
});

test("plan volume breakpoints encourage Flex then Pro then Scale", () => {
  const b = breakpoints();
  // Lite $39+$18 · Flex $69+$12 · Pro $299/25 · Scale $399/40 · Pro overage $15
  assert.ok(b.liteFlexCross > 4.9 && b.liteFlexCross < 5.1);
  assert.ok(b.flexProCross > 19.1 && b.flexProCross < 19.2);
  assert.equal(b.liteMax, 4);
  assert.equal(b.flexMin, 5);
  assert.equal(b.flexMax, 19);
  assert.equal(b.proMin, 20);
  assert.equal(b.scaleMin, 32);
  assert.equal(b.proMax, 31);
});

test("voice plans are separate from dispatch billing", () => {
  assert.equal(isPerMinutePlan("voice_starter"), true);
  assert.equal(isPerMinutePlan("voice_pro"), true);
  assert.equal(isPerMinutePlan("flex"), false);
  assert.equal(isDispatchBillingPlan("flex"), true);
  assert.equal(isDispatchBillingPlan("voice_starter"), false);
});

test("voice minutes ceil per call and overage straddles included cap", () => {
  assert.equal(billableMinutesFromDurationSec(1), 1);
  assert.equal(billableMinutesFromDurationSec(60), 1);
  assert.equal(billableMinutesFromDurationSec(61), 2);
  assert.equal(billableMinutesFromDurationSec(0), 0);

  assert.equal(overageMinutesFromCall(VOICE_STARTER_INCLUDED, 240, 5), 0);
  assert.equal(overageMinutesFromCall(VOICE_STARTER_INCLUDED, 248, 5), 3);
  assert.equal(overageMinutesFromCall(VOICE_STARTER_INCLUDED, 250, 4), 4);
  assert.equal(overageMinutesFromCall(VOICE_PRO_INCLUDED, 999, 5), 4);
});
