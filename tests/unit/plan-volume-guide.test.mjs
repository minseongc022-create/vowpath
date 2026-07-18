import assert from "node:assert/strict";
import test from "node:test";

/** Mirror list-price break-even math from lib/plan-volume-guide.ts */
function breakpoints() {
  const liteBase = 42;
  const litePer = 30;
  const flexBase = 75;
  const flexPer = 11;
  const unlimited = 169;

  const liteFlexCross = (flexBase - liteBase) / (litePer - flexPer);
  const flexUnlimitedCross = (unlimited - flexBase) / flexPer;
  const flexStarts = Math.ceil(liteFlexCross);
  const unlimitedStarts = Math.ceil(flexUnlimitedCross);

  return {
    liteFlexCross,
    flexUnlimitedCross,
    flexMin: flexStarts,
    flexMax: unlimitedStarts - 1,
    unlimitedMin: unlimitedStarts,
  };
}

test("plan volume breakpoints at current list prices", () => {
  const b = breakpoints();
  assert.ok(b.liteFlexCross > 1.7 && b.liteFlexCross < 1.8);
  assert.ok(b.flexUnlimitedCross > 8.5 && b.flexUnlimitedCross < 8.6);
  assert.equal(b.flexMin, 2);
  assert.equal(b.flexMax, 8);
  assert.equal(b.unlimitedMin, 9);
});
