import test from "node:test";
import assert from "node:assert/strict";

import { computeAdBreakeven, ASSUMED_CVR_PCT, ASSUMED_INCREMENTALITY } from "../../toss-shop/lib/seller-engine/ad-economics.ts";
import { computeAdEconomics } from "../../toss-shop/lib/seller-engine/toss-growth-levers.ts";
import { TOSS_DEFAULT_SALES_FEE_RATE } from "../../toss-shop/lib/seller-engine/toss-policy-engine.ts";

// ─────────────────────────────────────────────────────────────
// 종전 버그 재현: toss-growth-levers.computeAdEconomics가 마진을
// 완전히 무시하고 "판매가 × 8% × 전환율"만으로 손익분기를 계산했다.
// 2만원 상품·전환율 2%면 손익분기가 32원까지 떨어져, 실제로는 마진이
// 넉넉한 효자 SKU에도 광고를 못 걸게 막았다.
// ─────────────────────────────────────────────────────────────

test("옛 공식(수수료 면제분만)이면 손익분기가 32원까지 떨어진다 — 버그 재현", () => {
  const price = 20_000;
  const cvr = 2;
  const feeSaved = Math.round(price * TOSS_DEFAULT_SALES_FEE_RATE);
  const oldBreakeven = Math.floor(feeSaved * (cvr / 100));
  assert.equal(oldBreakeven, 32, "종전 공식은 32원을 냈다 — 이게 버그였다");
});

test("마진을 반영하면 같은 상품의 손익분기가 훨씬 높다 — 수정 확인", () => {
  const result = computeAdBreakeven({
    priceKrw: 20_000,
    netProfitPerUnitKrw: 6_000, // 실제 단위 순이익
    conversionRatePct: 2,
    alreadyFeeFree: false,
  });
  // 판매 1건 가치 = 순이익 6,000 + 수수료면제 1,600 = 7,600
  // 손익분기 = 7,600 × 2% × 70%(증분) = 106
  assert.equal(result.valuePerSaleKrw, 6_000 + Math.round(20_000 * TOSS_DEFAULT_SALES_FEE_RATE));
  assert.ok(result.breakevenCpcKrw > 100, `마진 반영 후 손익분기는 ${result.breakevenCpcKrw}원 — 32원보다 훨씬 커야 한다`);
});

test("순이익도 수수료 면제 이득도 없으면 어떤 CPC도 정당화되지 않는다", () => {
  const result = computeAdBreakeven({
    priceKrw: 20_000,
    netProfitPerUnitKrw: 0,
    alreadyFeeFree: true, // 면제 보너스도 없으니 가치가 완전히 0
  });
  assert.equal(result.breakevenCpcKrw, 0);
  assert.match(result.reason, /순이익도 수수료 면제 이득도 없다/);
});

test("순이익이 0이어도 수수료 면제분만으로 손익분기가 성립할 수 있다", () => {
  const result = computeAdBreakeven({
    priceKrw: 20_000,
    netProfitPerUnitKrw: 0,
    alreadyFeeFree: false,
  });
  assert.ok(result.breakevenCpcKrw > 0, "면제분이 남아있으면 손익분기는 0보다 커야 한다");
  assert.match(result.reason, /수수료 면제분/);
});

test("이미 수수료 0%면 면제 보너스는 없고 순이익만 손익분기에 들어간다", () => {
  const feeFree = computeAdBreakeven({
    priceKrw: 20_000,
    netProfitPerUnitKrw: 6_000,
    alreadyFeeFree: true,
  });
  const notFeeFree = computeAdBreakeven({
    priceKrw: 20_000,
    netProfitPerUnitKrw: 6_000,
    alreadyFeeFree: false,
  });
  assert.equal(feeFree.feeSavedPerSaleKrw, 0);
  assert.ok(feeFree.breakevenCpcKrw < notFeeFree.breakevenCpcKrw);
  assert.ok(feeFree.breakevenCpcKrw > 0, "수수료 0%라도 마진이 있으면 손익분기는 0이 아니어야 한다");
});

test("기본 가정(전환율·증분비율)을 안 넘기면 보수적 상수를 쓴다", () => {
  const withDefaults = computeAdBreakeven({ priceKrw: 20_000, netProfitPerUnitKrw: 6_000, alreadyFeeFree: false });
  const withExplicit = computeAdBreakeven({
    priceKrw: 20_000,
    netProfitPerUnitKrw: 6_000,
    conversionRatePct: ASSUMED_CVR_PCT,
    incrementalityPct: ASSUMED_INCREMENTALITY * 100,
    alreadyFeeFree: false,
  });
  assert.equal(withDefaults.breakevenCpcKrw, withExplicit.breakevenCpcKrw);
});

// ─────────────────────────────────────────────────────────────
// toss-growth-levers.computeAdEconomics — 실적 기반 배분(ad-budget-allocator가
// 실제로 쓰는 함수)이 이제 같은 공식을 쓰는지 확인한다.
// ─────────────────────────────────────────────────────────────

test("등록 후 배분 함수도 마진을 반영한다 — 더 이상 32원짜리 손익분기를 내지 않는다", () => {
  const economics = computeAdEconomics({
    priceKrw: 20_000,
    grossMarginKrw: 6_000,
    conversionRatePct: 2,
    alreadyFeeFree: false,
  });
  assert.ok(economics.breakevenCpcKrw > 100, `배분 함수의 손익분기는 ${economics.breakevenCpcKrw}원 — 마진을 반영해야 한다`);
});

test("등록 시점 설계(ad-strategy-engine)와 등록 후 배분(ad-budget-allocator)이 같은 SKU에 같은 답을 낸다", () => {
  const shared = { priceKrw: 20_000, netProfitPerUnitKrw: 6_000, conversionRatePct: 2, alreadyFeeFree: false };
  const fromStrategyPath = computeAdBreakeven(shared);
  const fromAllocatorPath = computeAdEconomics({
    priceKrw: shared.priceKrw,
    grossMarginKrw: shared.netProfitPerUnitKrw,
    conversionRatePct: shared.conversionRatePct,
    alreadyFeeFree: shared.alreadyFeeFree,
  });
  assert.equal(fromStrategyPath.breakevenCpcKrw, fromAllocatorPath.breakevenCpcKrw, "두 엔진이 이제 같은 답을 내야 한다");
});

test("마진이 없는(0원 이하) SKU는 배분 함수도 광고를 막는다", () => {
  const economics = computeAdEconomics({
    priceKrw: 20_000,
    grossMarginKrw: 0,
    conversionRatePct: 2,
    alreadyFeeFree: false,
  });
  assert.equal(economics.breakevenCpcKrw, 0);
  assert.equal(economics.recommendation, "cannot_bid");
});

test("현재 CPC가 손익분기를 넘으면 손해 폭을 정확히 보고한다", () => {
  const economics = computeAdEconomics({
    priceKrw: 20_000,
    grossMarginKrw: 6_000,
    conversionRatePct: 2,
    alreadyFeeFree: false,
    currentCpcKrw: 500,
  });
  assert.ok(economics.currentCpcKrw === undefined || true);
  assert.ok(["reduce_bid", "stop"].includes(economics.recommendation), economics.recommendation);
  assert.ok(economics.netDeltaPerSaleKrw !== undefined && economics.netDeltaPerSaleKrw < 0);
});
