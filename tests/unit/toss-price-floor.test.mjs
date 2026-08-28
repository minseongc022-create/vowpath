import test from "node:test";
import assert from "node:assert/strict";

import {
  computePriceFloor,
  trueMarginPct,
  toCharmPrice,
  applyCharmPricing,
} from "../../toss-shop/lib/seller-engine/price-floor.ts";
import { autoMatchPrice, marginPct } from "../../toss-shop/lib/seller-engine/pricing.ts";

// ─────────────────────────────────────────────────────────────
// 이 테스트가 지키는 것: "목표 마진을 넣으면 실제로 그 마진이 나온다"
//
// 종전 공식 `공급가 × (1 + m/100)`은 원가 인상률이라, 12%를 넣으면 실제
// 마진이 0.2%로 나왔다. 그 회귀를 막는 게 이 파일의 목적이다.
// ─────────────────────────────────────────────────────────────

test("옛 공식(공급가×1.12)은 실제 마진이 0.2% — 이게 우리가 고친 버그다", () => {
  const cost = 10_000;
  const oldFloor = Math.round(cost * 1.12);
  // 수수료만 빼도 (광고비는 세지도 않고) 마진이 사실상 0이다
  const actual = marginPct(cost, oldFloor);
  assert.ok(actual < 1, `옛 공식 마진이 ${actual}% — 1% 미만이어야 버그가 재현된 것`);
});

test("새 하한은 목표 마진을 실제로 만들어낸다 (광고비 제외 시)", () => {
  const cost = 10_000;
  for (const target of [12, 15, 20, 25]) {
    const floor = computePriceFloor({
      supplierCostKrw: cost,
      targetMarginPct: target,
      adCostRatePct: 0,
      returnReserveRatePct: 0,
    });
    assert.ok(floor.floorKrw !== null, `목표 ${target}%는 달성 가능해야 한다`);
    const actual = marginPct(cost, floor.floorKrw);
    // 올림(ceil) 때문에 목표보다 아주 조금 높게 나오는 건 정상. 낮으면 버그다.
    assert.ok(
      actual >= target - 0.1,
      `목표 ${target}% → 실제 ${actual}% (하한 ${floor.floorKrw}원) — 목표 미달`,
    );
    assert.ok(actual < target + 1, `목표 ${target}% → 실제 ${actual}% — 과도하게 높다`);
  }
});

test("광고비를 포함하면 trueMarginPct가 목표와 일치한다", () => {
  const cost = 10_000;
  const target = 15;
  const floor = computePriceFloor({ supplierCostKrw: cost, targetMarginPct: target });
  assert.ok(floor.floorKrw !== null);
  const actual = trueMarginPct({ supplierCostKrw: cost, priceKrw: floor.floorKrw });
  assert.ok(
    actual >= target - 0.1 && actual < target + 1,
    `광고·반품 포함 실마진 ${actual}% — 목표 ${target}%와 어긋남`,
  );
});

test("광고비를 빼먹으면 마진이 부풀려진다 — 하한이 광고비를 반영해야 하는 이유", () => {
  const cost = 10_000;
  // 광고비 0으로 잡은 하한을, 실제로는 광고를 켜서 판다고 하면
  const naive = computePriceFloor({
    supplierCostKrw: cost,
    targetMarginPct: 15,
    adCostRatePct: 0,
    returnReserveRatePct: 0,
  });
  const realised = trueMarginPct({ supplierCostKrw: cost, priceKrw: naive.floorKrw });
  assert.ok(realised < 15, `광고비 무시 하한의 실마진이 ${realised}% — 15% 미만이어야 한다`);
});

test("달성 불가능한 목표는 null을 돌려준다 — 큰 수를 지어내지 않는다", () => {
  const floor = computePriceFloor({
    supplierCostKrw: 10_000,
    // 비례비용(수수료 10.5% + 광고 8% + 반품 1%)만 19.5%인데 목표 90%는 불가능
    targetMarginPct: 90,
  });
  assert.equal(floor.floorKrw, null);
  assert.equal(floor.achievable, false);
  assert.match(floor.reason, /달성 불가/);
});

test("배송 인센티브(판매수수료 0%)가 있으면 하한이 내려간다", () => {
  const cost = 10_000;
  const without = computePriceFloor({ supplierCostKrw: cost, targetMarginPct: 15 });
  const with_ = computePriceFloor({
    supplierCostKrw: cost,
    targetMarginPct: 15,
    feeCtx: { deliveryIncentiveEligible: true },
  });
  assert.ok(
    with_.floorKrw < without.floorKrw,
    `인센티브 하한 ${with_.floorKrw} < 일반 하한 ${without.floorKrw} 이어야 한다`,
  );
});

// ─────────────────────────────────────────────────────────────
// 매력가격 — 심리 효과를 위해 마진을 깎지 않는다
// ─────────────────────────────────────────────────────────────

test("매력가격은 항상 올림 — 입력보다 낮아지지 않는다", () => {
  for (const p of [1_234, 9_800, 9_950, 13_847, 24_100, 99_500, 128_000]) {
    const charm = toCharmPrice(p);
    assert.ok(charm >= p, `${p}원 → ${charm}원 — 내려가면 마진이 깨진다`);
  }
});

test("매력가격 끝자리가 가격대에 맞게 정리된다", () => {
  assert.equal(toCharmPrice(13_847), 13_900);
  assert.equal(toCharmPrice(9_850), 9_890);
  assert.equal(toCharmPrice(24_100), 24_900);
  // 이미 매력가격이면 그대로 둔다
  assert.equal(toCharmPrice(12_900), 12_900);
});

test("매력가격이 상한을 넘으면 올리지 않는다", () => {
  const r = applyCharmPricing({ priceKrw: 13_847, floorKrw: 13_000, ceilingKrw: 13_850 });
  assert.equal(r.priceKrw, 13_847);
  assert.equal(r.adjusted, false);
});

// ─────────────────────────────────────────────────────────────
// autoMatchPrice — 경쟁가가 하한 아래일 때 숨기지 않는다
// ─────────────────────────────────────────────────────────────

test("경쟁가로 마진이 안 나오면 belowFloor로 드러낸다", () => {
  const result = autoMatchPrice(10_000, [{ sellerName: "A", priceKrw: 10_500, rank: 1 }], 15);
  assert.equal(result.belowFloor, true);
  assert.match(result.strategy, /마진 15%가 안 나온다/);
  // 그래도 하한 아래로는 팔지 않는다
  assert.ok(result.priceKrw >= result.floorKrw);
});

test("경쟁가가 넉넉하면 최저가 아래를 노리되 하한은 지킨다", () => {
  const result = autoMatchPrice(10_000, [{ sellerName: "A", priceKrw: 20_000, rank: 1 }], 15);
  assert.equal(result.belowFloor, false);
  assert.ok(result.priceKrw >= result.floorKrw, "하한 미만이면 안 된다");
  assert.ok(result.priceKrw <= 20_000, "경쟁 최저가보다 비싸면 안 된다");
});

test("경쟁 데이터가 없어도 지어낸 배수(+35%) 대신 하한을 쓴다", () => {
  const result = autoMatchPrice(10_000, [], 15);
  assert.ok(result.floorKrw !== null);
  assert.ok(result.priceKrw >= result.floorKrw);
  const actual = trueMarginPct({ supplierCostKrw: 10_000, priceKrw: result.priceKrw });
  assert.ok(actual >= 15, `실마진 ${actual}% — 목표 15% 이상이어야 한다`);
});
