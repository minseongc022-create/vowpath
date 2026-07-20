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
