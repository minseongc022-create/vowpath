import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcPricing, MARKET_FEE_PROFILES } from "../../lib/matchcut/pricing-calc.ts";
import { AD_CARD_SPECS } from "../../lib/matchcut/ad-card-specs.ts";
import { getMarketConnectionStatuses } from "../../lib/matchcut/markets/types.ts";

describe("matchcut pricing", () => {
  it("recommends price above break-even with margin", () => {
    const pricing = calcPricing({
      costs: { costKrw: 10000, fulfillmentKrw: 2000, targetMarginRate: 0.25, marketId: "coupang" },
      competitors: [
        { title: "A", mallName: "쿠팡", price: 29900, platform: "coupang" },
        { title: "B", mallName: "스마트스토어", price: 27900, platform: "smartstore" },
        { title: "C", mallName: "쿠팡", price: 31900, platform: "coupang" },
      ],
    });
    assert.ok(pricing.recommendedPriceKrw >= pricing.breakEvenPriceKrw);
    assert.ok(pricing.competitorMedian);
    assert.equal(MARKET_FEE_PROFILES.length >= 4, true);
  });
});

describe("ad-card specs", () => {
  it("includes coupang and naver sizes", () => {
    assert.ok(AD_CARD_SPECS.some((s) => s.id === "coupang_square"));
    assert.ok(AD_CARD_SPECS.some((s) => s.id === "naver_square"));
  });
});

describe("markets status", () => {
  it("lists major channels", () => {
    const markets = getMarketConnectionStatuses();
    assert.ok(markets.some((m) => m.id === "coupang"));
    assert.ok(markets.some((m) => m.id === "smartstore"));
  });
});
