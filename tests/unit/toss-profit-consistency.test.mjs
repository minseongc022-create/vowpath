import test from "node:test";
import assert from "node:assert/strict";

import {
  netProfitPerUnitAfterAds,
  computePriceFloor,
  trueMarginPct,
} from "../../toss-shop/lib/seller-engine/price-floor.ts";
import { netProfitPerUnit, buildPricingScenarios } from "../../toss-shop/lib/seller-engine/revenue-engine.ts";

// ─────────────────────────────────────────────────────────────
// 이 테스트가 지키는 것: 가격 하한과 수익 전망이 **같은 기준**을 쓴다.
//
// 하한은 광고비를 반영하는데 전망은 안 하면, 게이트를 통과한 SKU가
// 광고를 켜는 순간 기대치에 못 미친다.
// ─────────────────────────────────────────────────────────────

test("광고비를 뺀 순익은 수수료만 뺀 순익보다 항상 작다", () => {
  const cost = 10_000;
  const price = 15_000;
  const feesOnly = netProfitPerUnit(cost, price);
  const afterAds = netProfitPerUnitAfterAds({ supplierCostKrw: cost, priceKrw: price });
  assert.ok(
    afterAds < feesOnly,
    `광고비 반영(${afterAds}) < 수수료만(${feesOnly}) 이어야 한다`,
  );
});

test("하한가에서 실제로 목표 마진이 나온다 — 전망과 하한이 일치", () => {
  const cost = 10_000;
  const target = 15;
  const floor = computePriceFloor({ supplierCostKrw: cost, targetMarginPct: target });
  const net = netProfitPerUnitAfterAds({ supplierCostKrw: cost, priceKrw: floor.floorKrw });
  const impliedMargin = (net / floor.floorKrw) * 100;
  assert.ok(
    Math.abs(impliedMargin - target) < 1,
    `하한가의 실마진이 ${impliedMargin.toFixed(1)}% — 목표 ${target}%와 어긋남`,
  );
});

test("trueMarginPct와 netProfitPerUnitAfterAds가 서로 맞는다", () => {
  const cost = 12_000;
  const price = 20_000;
  const net = netProfitPerUnitAfterAds({ supplierCostKrw: cost, priceKrw: price });
  const margin = trueMarginPct({ supplierCostKrw: cost, priceKrw: price });
  assert.ok(
    Math.abs((net / price) * 100 - margin) < 0.2,
    "같은 값을 두 방식으로 계산했는데 결과가 다르다",
  );
});

test("배송 인센티브가 있으면 순익이 커진다", () => {
  const base = netProfitPerUnitAfterAds({ supplierCostKrw: 10_000, priceKrw: 15_000 });
  const incentive = netProfitPerUnitAfterAds({
    supplierCostKrw: 10_000,
    priceKrw: 15_000,
    feeCtx: { deliveryIncentiveEligible: true },
  });
  assert.ok(incentive > base, "판매수수료 0%면 순익이 늘어야 한다");
});

test("수익 시나리오의 월 순익도 광고비를 뺀 값이다", () => {
  const intel = {
    searchVolume: 5000,
    competitionIntensity: 1.0,
    category: "home",
    trendPct: 0,
  };
  const competitors = [
    { sellerName: "A", priceKrw: 20_000, rank: 1 },
    { sellerName: "B", priceKrw: 22_000, rank: 2 },
  ];
  const scenarios = buildPricingScenarios(10_000, competitors, intel, 15);
  assert.ok(scenarios.length > 0, "시나리오가 나와야 한다");

  for (const s of scenarios) {
    const feesOnly = netProfitPerUnit(10_000, s.priceKrw);
    assert.ok(
      s.netProfitKrw <= feesOnly,
      `시나리오 ${s.id}의 순익 ${s.netProfitKrw}이 수수료만 뺀 값 ${feesOnly}보다 크다 — 광고비가 안 빠졌다`,
    );
  }
});

test("목표 마진이 달성 불가능하면 시나리오를 만들지 않는다", () => {
  // 비례비용(수수료+광고+반품)만 19.5%인데 목표 90%는 어떤 가격으로도 불가능
  const scenarios = buildPricingScenarios(
    10_000,
    [{ sellerName: "A", priceKrw: 20_000, rank: 1 }],
    { searchVolume: 5000, competitionIntensity: 1.0, category: "home", trendPct: 0 },
    90,
  );
  assert.equal(scenarios.length, 0, "달성 불가능한 목표에 가격을 제시하면 안 된다");
});
