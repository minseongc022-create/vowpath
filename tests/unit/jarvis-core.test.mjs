import test from "node:test";
import assert from "node:assert/strict";

import {
  computeProfit,
  computeFees,
  computeAdBreakeven,
  priceForTargetMargin,
  toCharmPrice,
  SALES_FEE_RATE,
  PAYMENT_FEE_RATE,
} from "../../jarvis/core/money.ts";
import {
  decidePrice,
  checkCost,
  checkPrice,
  checkProfit,
  MIN_MARGIN_PCT,
  MIN_NET_PROFIT_KRW,
  MAX_PRICE_KRW,
  MIN_PRICE_KRW,
} from "../../jarvis/core/rules.ts";

// ─────────────────────────────────────────────────────────────
// 실제로 화면까지 올라갔던 사고를 재현한다.
//   에피로드 태블릿케이스 — 판매가 27,195,670원, 마진 55.3%, 자비스 신뢰도 99%
// 마진율 게이트로는 절대 못 잡는다. 비율이 수학적으로 성립하기 때문이다.
// ─────────────────────────────────────────────────────────────

test("2,700만원짜리 위탁 상품은 구조적으로 불가능하다 — 실제 사고 재현", () => {
  const v = checkPrice(27_195_670, 9_000_000);
  assert.equal(v.ok, false);
  assert.equal(v.failed, "price_out_of_range");
});

test("마진율이 정상이어도 자릿수가 틀리면 막는다 — 비율 게이트의 맹점", () => {
  // 마진이 건강하게 성립하는 조합이지만 금액 자체가 위탁에서 불가능하다
  const profit = computeProfit({ priceKrw: 27_000_000, landedCostKrw: 9_000_000 });
  assert.ok(
    profit.marginPct >= MIN_MARGIN_PCT,
    `실마진 ${profit.marginPct}% — 마진 게이트라면 이걸 통과시킨다. 그래서 비율로는 못 막는다`,
  );

  const v = checkPrice(27_000_000, 9_000_000);
  assert.equal(v.ok, false, "금액으로는 반드시 막혀야 한다");
});

test("원가 단계에서 먼저 걸러 뒤쪽 계산이 오염되지 않게 한다", () => {
  assert.equal(checkCost(9_000_000).ok, false, "900만원짜리 공급단가는 위탁이 아니다");
  assert.equal(checkCost(12_000).ok, true);
  assert.equal(checkCost(0).ok, false);
  assert.equal(checkCost(NaN).ok, false, "fail-closed — 못 읽으면 통과시키지 않는다");
});

test("가격 상·하한 경계가 정확하다", () => {
  assert.equal(checkPrice(MAX_PRICE_KRW, 100_000).ok, true);
  assert.equal(checkPrice(MAX_PRICE_KRW + 1, 100_000).ok, false);
  assert.equal(checkPrice(MIN_PRICE_KRW - 1, 3_000).ok, false);
});

// ─────────────────────────────────────────────────────────────
// 마진 — "팔면 남는 돈"이 아닌 마진은 쓰지 않는다
// ─────────────────────────────────────────────────────────────

test("마진은 수수료·광고비·반품충당을 모두 뺀 뒤의 값이다", () => {
  const price = 20_000;
  const cost = 10_000;
  const profit = computeProfit({ priceKrw: price, landedCostKrw: cost });

  // 조마진이라면 (20000-10000)/20000 = 50%
  // 실마진은 수수료 10.5% + 광고 8% + 반품 1%를 더 뺀 값이라 훨씬 낮다
  assert.ok(profit.marginPct < 35, `실마진 ${profit.marginPct}% — 조마진 50%와 달라야 한다`);

  const expectedFees = Math.round(price * SALES_FEE_RATE) + Math.round(price * PAYMENT_FEE_RATE);
  assert.equal(profit.fees.totalFeeKrw, expectedFees);
  assert.equal(
    profit.netProfitKrw,
    price - cost - expectedFees - profit.adCostKrw - profit.returnReserveKrw,
  );
});

test("배송 인센티브로 수수료 0%면 마진이 실제로 올라간다", () => {
  const base = computeProfit({ priceKrw: 20_000, landedCostKrw: 10_000 });
  const free = computeProfit({
    priceKrw: 20_000,
    landedCostKrw: 10_000,
    fees: { deliveryIncentive: true },
  });
  assert.equal(free.fees.salesFeeKrw, 0);
  assert.ok(free.netProfitKrw > base.netProfitKrw);
});

test("개당 순이익이 작으면 마진율이 좋아도 막는다 — 율이 아니라 금액이 목표를 만든다", () => {
  // 원가 1,500원짜리는 마진율이 좋아도 개당 남는 돈이 목표에 못 닿는다
  const decision = decidePrice({ landedCostKrw: 1_500 });
  assert.equal(decision.ok, false, "저가 상품은 통과하면 안 된다");
});

test("정상 위탁 상품은 통과하고 마진 하한을 지킨다", () => {
  for (const cost of [6_000, 12_000, 25_000, 60_000]) {
    const d = decidePrice({ landedCostKrw: cost });
    assert.equal(d.ok, true, `원가 ${cost}원이 막혔다: ${d.ok === false ? d.reason : ""}`);
    assert.ok(d.marginPct >= MIN_MARGIN_PCT, `마진 ${d.marginPct}%가 하한 미달`);
    assert.ok(d.netProfitKrw >= MIN_NET_PROFIT_KRW, `개당 ${d.netProfitKrw}원이 하한 미달`);
    assert.ok(d.priceKrw >= MIN_PRICE_KRW && d.priceKrw <= MAX_PRICE_KRW);
  }
});

// ─────────────────────────────────────────────────────────────
// 가격 결정 — 경쟁가를 따라가되 적자로는 안 간다
// ─────────────────────────────────────────────────────────────

test("경쟁가가 하한 위면 그 아래를 노린다", () => {
  const cost = 12_000;
  const floor = priceForTargetMargin({ landedCostKrw: cost, targetMarginPct: MIN_MARGIN_PCT });
  const competitor = floor + 8_000;

  const d = decidePrice({ landedCostKrw: cost, competitorLowKrw: competitor });
  assert.equal(d.ok, true);
  assert.ok(d.priceKrw < competitor, "경쟁가보다 싸야 한다");
  assert.ok(d.priceKrw >= d.floorKrw, "하한은 지켜야 한다");
});

test("경쟁가가 적자 구간이면 따라가지 않는다 — 못 이기는 싸움은 안 한다", () => {
  const cost = 30_000;
  const d = decidePrice({ landedCostKrw: cost, competitorLowKrw: 31_000 });
  if (d.ok) {
    assert.ok(d.marginPct >= MIN_MARGIN_PCT, "경쟁가를 따라가 적자가 되면 안 된다");
    assert.ok(d.priceKrw >= d.floorKrw);
  }
});

test("매력가격으로 다듬되 하한 아래로는 내리지 않는다", () => {
  assert.equal(toCharmPrice(23_400, 20_000) % 1000, 900);
  // 하한이 바로 위면 매력가격 때문에 하한을 깨지 않는다
  assert.ok(toCharmPrice(23_400, 23_500) >= 23_500);
});

test("가격 역산이 실제로 그 마진을 만든다 — 역산과 정산이 어긋나면 안 된다", () => {
  for (const cost of [5_000, 15_000, 40_000]) {
    for (const target of [18, 25, 30]) {
      const price = priceForTargetMargin({ landedCostKrw: cost, targetMarginPct: target });
      const profit = computeProfit({ priceKrw: price, landedCostKrw: cost });
      assert.ok(
        profit.marginPct >= target - 0.6,
        `원가 ${cost} 목표 ${target}% → 가격 ${price}인데 실제 마진 ${profit.marginPct}%`,
      );
    }
  }
});

test("변동비가 100%를 넘는 목표 마진은 가격이 없다고 답한다", () => {
  assert.equal(priceForTargetMargin({ landedCostKrw: 10_000, targetMarginPct: 95 }), null);
});

// ─────────────────────────────────────────────────────────────
// 광고 손익분기 — 마진을 빼먹으면 어떤 광고도 성립하지 않는다
// ─────────────────────────────────────────────────────────────

test("손익분기 CPC는 순이익과 수수료 면제분을 모두 반영한다", () => {
  const r = computeAdBreakeven({ priceKrw: 20_000, netProfitKrw: 6_000, conversionRatePct: 2 });
  // 면제분만 세는 옛 공식이면 20,000×8%×2% = 32원까지 떨어진다
  assert.ok(r.breakevenCpcKrw > 100, `손익분기 ${r.breakevenCpcKrw}원 — 32원짜리 옛 공식이면 안 된다`);
  assert.equal(r.valuePerSaleKrw, 6_000 + Math.round(20_000 * SALES_FEE_RATE));
  assert.ok(r.maxBidKrw < r.breakevenCpcKrw, "입찰가는 손익분기보다 낮아야 이익이 남는다");
});

test("남는 게 없으면 어떤 CPC도 정당화되지 않는다", () => {
  const r = computeAdBreakeven({ priceKrw: 20_000, netProfitKrw: 0, alreadyFeeFree: true });
  assert.equal(r.breakevenCpcKrw, 0);
  assert.equal(r.maxBidKrw, 0);
});

test("이미 수수료 0%여도 순이익만으로 손익분기가 성립한다", () => {
  const feeFree = computeAdBreakeven({ priceKrw: 20_000, netProfitKrw: 6_000, alreadyFeeFree: true });
  const normal = computeAdBreakeven({ priceKrw: 20_000, netProfitKrw: 6_000 });
  assert.equal(feeFree.feeSavedPerSaleKrw, 0);
  assert.ok(feeFree.breakevenCpcKrw > 0);
  assert.ok(feeFree.breakevenCpcKrw < normal.breakevenCpcKrw);
});

test("수수료 계산이 판매가에 정확히 비례한다", () => {
  const f = computeFees(50_000);
  assert.equal(f.salesFeeKrw, 4_000);
  assert.equal(f.paymentFeeKrw, 1_250);
  assert.equal(f.totalFeeKrw, 5_250);
});
