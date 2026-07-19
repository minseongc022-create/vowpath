import assert from "node:assert/strict";
import test from "node:test";

/** Mirror list prices + AI COGS from lib/constants.ts / plan-volume-guide.ts */
const LITE_BASE = 29;
const LITE_PER = 18;
const FLEX_BASE = 55;
const FLEX_PER = 8;
const PRO = 149;
const SCALE = 299;
const PRO_INCLUDED = 20;
const PREMIUM_COGS = 6;
const PRO_OVERAGE_MULT = 2;

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

function aiTier(plan) {
  return plan === "pro" || plan === "scale" ? "premium" : "economy";
}

test("AI tier: Lite/Flex economy, Pro/Scale premium", () => {
  assert.equal(aiTier("lite"), "economy");
  assert.equal(aiTier("flex"), "economy");
  assert.equal(aiTier("pro"), "premium");
  assert.equal(aiTier("scale"), "premium");
});

test("plan volume breakpoints encourage Flex then Pro then Scale", () => {
  const b = breakpoints();
  assert.ok(b.liteFlexCross > 2.5 && b.liteFlexCross < 2.7);
  assert.ok(b.flexProCross > 11.7 && b.flexProCross < 11.8);
  assert.equal(b.liteMax, 2);
  assert.equal(b.flexMin, 3);
  assert.equal(b.flexMax, 11);
  assert.equal(b.proMin, 12);
  assert.equal(b.scaleMin, 33);
  assert.equal(b.proMax, 32);
});
