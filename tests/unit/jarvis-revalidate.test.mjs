import test from "node:test";
import assert from "node:assert/strict";

import { decideRevalidation } from "../../jarvis/engine/revalidate.ts";

// ─────────────────────────────────────────────────────────────
// ★ 승인 시점의 변수 처리
//
// 초안은 아침에 만들어지고 승인은 저녁에 날 수 있다. 그 사이 공급처는
// 값을 올리고, 상품을 내리고, 낱개 판매를 막는다. 그런데 승인 게이트는
// **초안에 적힌 원가**를 다시 재기만 했다 — 그 숫자는 만들 때 찍힌 값이라
// 통과해도 "지금도 그 값"이라는 뜻이 아니었다.
//
// 여기서 지키는 것 하나: 값이 바뀌었는데 옛 숫자로 조용히 등록되는 일은
// 없어야 한다. 사장님이 승인한 상품과 실제로 팔리는 상품이 달라진다.
// ─────────────────────────────────────────────────────────────

function candidate(over = {}) {
  return {
    id: "c1",
    keyword: "휴대폰 거치대",
    title: "휴대폰 거치대",
    category: "digital_acc",
    supplier: {
      platform: "domeggook",
      itemNo: "9502515",
      title: "거치대",
      url: "https://domeggook.com/9502515",
      unitPriceKrw: 5000,
      shippingKrw: 2500,
      landedCostKrw: 7500,
      moq: 1,
      singleUnitVerified: true,
      imageUrls: ["a", "b"],
      live: true,
    },
    priceKrw: 15900,
    netProfitKrw: 3000,
    marginPct: 25,
    priceFloorKrw: 12000,
    pricingReason: "목표 마진 28% 기준가",
    maxBidKrw: 500,
    breakevenCpcKrw: 800,
    foundAt: new Date().toISOString(),
    ...over,
  };
}

function unit(over = {}) {
  return {
    available: true,
    unitPriceKrw: 5000,
    minOrderQty: 1,
    market: "domeggook",
    verified: true,
    reason: "낱개 발주 확인",
    ...over,
  };
}

test("원가가 그대로면 그대로 통과한다", () => {
  const r = decideRevalidation(candidate(), unit());
  assert.equal(r.ok, true);
  assert.equal(r.changed, false);
  assert.equal(r.candidate.priceKrw, 15900);
});

test("★ 품절이면 막는다 — 등록하면 주문을 못 채운다", () => {
  const r = decideRevalidation(
    candidate(),
    unit({ available: false, unitPriceKrw: null, reason: "판매 종료" }),
  );
  assert.equal(r.ok, false);
  assert.match(r.reason, /살 수 없습니다/);
});

test("★ 낱개 판매가 막히면 막는다 — 위탁이 성립하지 않는다", () => {
  const r = decideRevalidation(candidate(), unit({ minOrderQty: 5 }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /최소 5개/);
});

test("★ 원가가 오르면 옛 가격을 쓰지 않고 다시 정한다", () => {
  const r = decideRevalidation(candidate(), unit({ unitPriceKrw: 7000 }));
  assert.equal(r.ok, true);
  assert.equal(r.changed, true);
  assert.equal(r.candidate.supplier.landedCostKrw, 9500, "새 원가 = 7000 + 배송비 2500");
  assert.notEqual(r.candidate.priceKrw, 15900, "옛 가격이 그대로 남으면 안 된다");
  assert.match(r.note, /9,500원/);
});

test("★ 다시 정한 가격도 마진이 성립해야 한다 — 하한 아래로는 안 내려간다", () => {
  const r = decideRevalidation(candidate(), unit({ unitPriceKrw: 7000 }));
  assert.equal(r.ok, true);
  assert.ok(
    r.candidate.priceKrw >= r.candidate.priceFloorKrw,
    "새 가격이 새 하한 아래면 적자를 승인하는 것과 같다",
  );
  assert.ok(r.candidate.netProfitKrw > 0);
});

test("원가가 기준 밖으로 뛰면 막는다 — 다시 계산해도 팔 수 없는 값이다", () => {
  const r = decideRevalidation(candidate(), unit({ unitPriceKrw: 900_000 }));
  assert.equal(r.ok, false);
});

test("원가가 내려가면 가격을 낮춰 더 유리하게 간다", () => {
  const r = decideRevalidation(candidate(), unit({ unitPriceKrw: 3000 }));
  assert.equal(r.ok, true);
  assert.equal(r.changed, true);
  assert.ok(r.candidate.priceKrw < 15900);
  assert.match(r.note, /내렸/);
});

test("판독 실패는 막지 않는다 — 모르는 것과 확인된 품절은 다르다", () => {
  const r = decideRevalidation(
    candidate(),
    unit({ verified: false, reason: "가격 구간을 못 읽음" }),
  );
  assert.equal(r.ok, true, "일시적 판독 실패로 승인을 막으면 아무것도 못 한다");
  assert.equal(r.changed, false);
  assert.match(r.note, /재확인 미완료/);
});

test("값이 바뀌면 그 사실이 반드시 문구로 남는다 — 조용히 바꾸면 안 된다", () => {
  const r = decideRevalidation(candidate(), unit({ unitPriceKrw: 6000 }));
  assert.equal(r.changed, true);
  assert.match(r.note, /7,500원 → 8,500원/);
  assert.match(r.note, /다시 정했습니다/);
});

test("다시 확인된 공급처는 실시간 확인으로 표시된다", () => {
  const stale = candidate();
  stale.supplier.live = false;
  const r = decideRevalidation(stale, unit({ unitPriceKrw: 5500 }));
  assert.equal(r.candidate.supplier.live, true);
});
