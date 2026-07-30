import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANGLE_PACKAGES,
  CREDIT_COSTS,
  estimateGenerateCredits,
  estimateRunCredits,
  getAnglePackage,
  WELCOME_CREDITS,
  packById,
} from "../../lib/matchcut/constants.ts";

describe("matchcut credits economics", () => {
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
    // 5장 단가가 1장보다 확실히 싸야 혜자
    assert.ok(five.credits / 5 < one.credits / 1);
  });

  it("full run credit estimate uses packages", () => {
    assert.equal(estimateRunCredits(3), CREDIT_COSTS.match + estimateGenerateCredits(3));
    assert.equal(estimateGenerateCredits(5), 56);
  });

  it("welcome credits allow match trial", () => {
    assert.ok(WELCOME_CREDITS >= CREDIT_COSTS.match);
  });

  it("pack pricing keeps margin room on 3-angle run", () => {
    const pack = packById("pack_150");
    assert.ok(pack);
    const perCredit = pack.priceKrw / pack.credits;
    const runCost = estimateRunCredits(3) * perCredit;
    // 고객 체감 저렴 + 원가 여유: 팩의 절반 이하로 1런
    assert.ok(runCost < pack.priceKrw * 0.55);
  });
});
