import assert from "node:assert/strict";
import test from "node:test";

/** Mirror list prices + AI COGS from lib/constants.ts / plan-volume-guide.ts */
const LITE_BASE = 55;
const LITE_PER = 24;
const FLEX_BASE = 75;
const FLEX_PER = 16;
const PRO = 199;
const SCALE = 369;
const PRO_INCLUDED = 15;
const PREMIUM_COGS = 6;
const PRO_OVERAGE_MULT = 3.6;

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
  // Lite $55+$24 · Flex $75+$16 · Pro $199/15 · Scale $369/30 · Pro overage $22
  assert.ok(b.liteFlexCross > 2.4 && b.liteFlexCross < 2.6);
  assert.ok(b.flexProCross > 7.7 && b.flexProCross < 7.8);
  assert.equal(b.liteMax, 2);
  assert.equal(b.flexMin, 3);
  assert.equal(b.flexMax, 7);
  assert.equal(b.proMin, 8);
  assert.equal(b.scaleMin, 23);
  assert.equal(b.proMax, 22);
});
