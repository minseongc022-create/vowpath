import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANGLE_PACKAGES,
  CREDIT_COSTS,
  CREDIT_PACKS,
  estimateFullPageCredits,
  estimateGenerateCredits,
  estimateStandardPageCredits,
  FLOOR_CREDIT_KRW,
  getAnglePackage,
  standardPagesForPack,
  SUBSCRIPTION_PLANS,
  TOPUP_PACK,
  WELCOME_CREDITS,
  packById,
} from "../../lib/matchcut/constants.ts";
import {
  assertMarginFloor,
  assertPackWorstCaseMargin,
  floorCreditKrw,
  grossMarginRate,
  POLICY_FLOOR_CREDIT_KRW,
  worstFullPageApiKrw,
  worstGeneratePackageApiKrw,
  worstPackStandardPageApiKrw,
  worstStandardPageApiKrw,
  WORST_API_COST_KRW,
} from "../../lib/matchcut/economics.ts";

const ALL_PACKS = [...CREDIT_PACKS, ...SUBSCRIPTION_PLANS, TOPUP_PACK];
const STANDARD_PAGE_CREDITS = estimateStandardPageCredits();

describe("matchcut credits economics", () => {
  it("floor credit KRW uses policy minimum", () => {
    assert.equal(
      FLOOR_CREDIT_KRW,
      Math.max(floorCreditKrw(ALL_PACKS), POLICY_FLOOR_CREDIT_KRW),
    );
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

  it("standard page estimate uses 1-angle package", () => {
    assert.equal(
      estimateStandardPageCredits(),
      CREDIT_COSTS.match + estimateGenerateCredits(1),
    );
  });

  it("full page estimate uses 3-angle package", () => {
    assert.equal(
      estimateFullPageCredits(),
      CREDIT_COSTS.match + estimateGenerateCredits(3),
    );
  });

  it("welcome credits allow match trial", () => {
    assert.equal(WELCOME_CREDITS, CREDIT_COSTS.match);
  });

  it("every operation keeps ≥30% gross margin at floor credit price", () => {
    const floor = FLOOR_CREDIT_KRW;

    assertMarginFloor({
      credits: CREDIT_COSTS.match,
      apiCostKrw: WORST_API_COST_KRW.match,
      floorKrwPerCredit: floor,
    });

    assertMarginFloor({
      credits: estimateStandardPageCredits(),
      apiCostKrw: worstStandardPageApiKrw(),
      floorKrwPerCredit: floor,
    });

    assertMarginFloor({
      credits: estimateFullPageCredits(),
      apiCostKrw: worstFullPageApiKrw(3),
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
  });

  it("seller pack targets ~20 standard pages with ≥30% worst-case pack margin", () => {
    const pack = packById("pack_150");
    assert.ok(pack);
    const pages = standardPagesForPack(pack);
    assert.ok(pages >= 18 && pages <= 22, `expected ~20 pages, got ${pages}`);
    assertPackWorstCaseMargin({ pack, creditsPerStandardPage: STANDARD_PAGE_CREDITS });
    const api = worstPackStandardPageApiKrw(pack, STANDARD_PAGE_CREDITS);
    const margin = grossMarginRate(pack.priceKrw, api);
    assert.ok(margin >= 0.3, `margin ${(margin * 100).toFixed(1)}%`);
  });

  it("all permanent and subscription packs keep ≥30% worst-case margin", () => {
    for (const pack of [...CREDIT_PACKS, ...SUBSCRIPTION_PLANS]) {
      assertPackWorstCaseMargin({ pack, creditsPerStandardPage: STANDARD_PAGE_CREDITS });
    }
  });

  it("power pack scales page count with price tier", () => {
    const seller = packById("pack_150");
    const power = packById("pack_500");
    assert.ok(seller && power);
    const sellerPages = standardPagesForPack(seller);
    const powerPages = standardPagesForPack(power);
    assert.ok(powerPages > sellerPages);
    assert.ok(powerPages >= 45, `got ${powerPages} pages`);
  });

  it("gross margin helper matches expectations", () => {
    const margin = grossMarginRate(10000, 2000);
    assert.ok(margin >= 0.5);
  });
});
