import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcPricing, MARKET_FEE_PROFILES } from "../../lib/matchcut/pricing-calc.ts";
import { AD_CARD_STYLES } from "../../lib/matchcut/ad-card-specs.ts";
import { getMarketConnectionStatuses } from "../../lib/matchcut/markets/types.ts";
import { resolveDesignToolkit } from "../../lib/sourcing-detail/design-toolkit.ts";

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

describe("ad-card styles", () => {
  it("uses marketing concepts not platform specs", () => {
    assert.ok(AD_CARD_STYLES.some((s) => s.id === "benefit_hero"));
    assert.ok(AD_CARD_STYLES.some((s) => s.id === "editorial_premium"));
    assert.equal(
      AD_CARD_STYLES.some((s) => "width" in s),
      false,
    );
  });
});

describe("design toolkit", () => {
  it("picks category-matched toolkit", () => {
    const beauty = resolveDesignToolkit({
      category: "beauty",
      searchQuery: "세럼",
      productNameKo: "세럼",
      keyFeatures: [],
      targetAudience: "",
      sellingPoints: [],
      detailStyle: "premium",
    });
    assert.equal(beauty.id, "glow");
    const fashion = resolveDesignToolkit({
      category: "fashion",
      searchQuery: "가방",
      productNameKo: "가방",
      keyFeatures: [],
      targetAudience: "",
      sellingPoints: [],
      detailStyle: "premium",
    });
    assert.equal(fashion.id, "atelier");
  });
});

describe("markets status", () => {
  it("lists major channels", () => {
    const markets = getMarketConnectionStatuses();
    assert.ok(markets.some((m) => m.id === "coupang"));
    assert.ok(markets.some((m) => m.id === "smartstore"));
  });
});
