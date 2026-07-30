import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANGLE_PACKAGES,
  CREDIT_COSTS,
  CREDIT_PACKS,
  estimateGenerateCredits,
  estimateRunCredits,
  FLOOR_CREDIT_KRW,
  getAnglePackage,
  SUBSCRIPTION_PLANS,
  TOPUP_PACK,
  WELCOME_CREDITS,
  packById,
} from "../../lib/matchcut/constants.ts";
import {
  assertMarginFloor,
  floorCreditKrw,
  grossMarginRate,
  POLICY_FLOOR_CREDIT_KRW,
  worstGeneratePackageApiKrw,
  WORST_API_COST_KRW,
} from "../../lib/matchcut/economics.ts";

const ALL_PACKS = [...CREDIT_PACKS, ...SUBSCRIPTION_PLANS, TOPUP_PACK];

describe("matchcut credits economics", () => {
  it("floor credit KRW uses policy minimum", () => {
    assert.equal(FLOOR_CREDIT_KRW, Math.max(floorCreditKrw(ALL_PACKS), POLICY_FLOOR_CREDIT_KRW));
  });

  it("offers 1 through 5 angle packages", () => {
    assert.deepEqual(
      ANGLE_PACKAGES.map((p) => p.angles),
      [1, 2, 3, 4, 5],
    );
  });

  it("volume discount feels like a deal vs list price", () => {
    for (const p of ANGLE_PACKAGES) {
      assert.ok(p.credits < p.listCredits, `${p.angles}장 should discount`);
    }
    const one = getAnglePackage(1);
    const five = getAnglePackage(5);
    assert.ok(five.credits / 5 < one.credits / 1);
  });

  it("full run credit estimate uses packages", () => {
    assert.equal(estimateRunCredits(3), CREDIT_COSTS.match + estimateGenerateCredits(3));
  });

  it("welcome credits allow match trial only", () => {
    assert.equal(WELCOME_CREDITS, CREDIT_COSTS.match);
    assert.ok(WELCOME_CREDITS >= CREDIT_COSTS.match);
  });

  it("every operation keeps ≥30% gross margin at floor credit price", () => {
    const floor = FLOOR_CREDIT_KRW;

    assertMarginFloor({
      credits: CREDIT_COSTS.match,
      apiCostKrw: WORST_API_COST_KRW.match,
      floorKrwPerCredit: floor,
    });

    assertMarginFloor({
      credits: CREDIT_COSTS.fixAngle,
      apiCostKrw: WORST_API_COST_KRW.fixAngle,
      floorKrwPerCredit: floor,
    });

    assertMarginFloor({
      credits: CREDIT_COSTS.adCard,
      apiCostKrw: WORST_API_COST_KRW.adCard,
      floorKrwPerCredit: floor,
    });

    for (const pkg of ANGLE_PACKAGES) {
      assertMarginFloor({
        credits: pkg.credits,
        apiCostKrw: worstGeneratePackageApiKrw(pkg.angles),
        floorKrwPerCredit: floor,
      });
    }

    const runCredits = estimateRunCredits(3);
    const runApi =
      WORST_API_COST_KRW.match + worstGeneratePackageApiKrw(3);
    assertMarginFloor({
      credits: runCredits,
      apiCostKrw: runApi,
      floorKrwPerCredit: floor,
    });
  });

  it("pack_150 supports at least 3 full runs", () => {
    const pack = packById("pack_150");
    assert.ok(pack);
    const runs = Math.floor(pack.credits / estimateRunCredits(3));
    assert.ok(runs >= 3);
  });

  it("pack_500 supports at least 5 full runs", () => {
    const pack = packById("pack_500");
    assert.ok(pack);
    const runs = Math.floor(pack.credits / estimateRunCredits(3));
    assert.ok(runs >= 5);
  });

  it("gross margin helper matches expectations", () => {
    const margin = grossMarginRate(10000, 2000);
    assert.ok(margin >= 0.5);
  });
});
