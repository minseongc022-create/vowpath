import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CREDIT_COSTS,
  estimateRunCredits,
  WELCOME_CREDITS,
  packById,
} from "../../lib/matchcut/constants.ts";

describe("matchcut credits economics", () => {
  it("full run credit estimate", () => {
    assert.equal(estimateRunCredits(3), CREDIT_COSTS.match + CREDIT_COSTS.angle * 3);
  });

  it("welcome credits allow partial trial", () => {
    assert.ok(WELCOME_CREDITS >= CREDIT_COSTS.match);
  });

  it("pack pricing resolves", () => {
    const pack = packById("pack_150");
    assert.ok(pack);
    assert.equal(pack.priceKrw, 14900);
    const perCredit = pack.priceKrw / pack.credits;
    const runCost = estimateRunCredits(3) * perCredit;
    assert.ok(runCost < pack.priceKrw * 0.5, "multiple runs per pack");
  });
});
