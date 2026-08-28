import test from "node:test";
import assert from "node:assert/strict";

import {
  checkPriceSanity,
  checkSupplierCostSanity,
  MAX_CONSIGNMENT_PRICE_KRW,
} from "../../toss-shop/lib/seller-engine/price-sanity.ts";
import { parseChatAction } from "../../toss-shop/lib/seller-engine/jarvis-chat.ts";
import { collectOwnerTodos } from "../../toss-shop/lib/seller-engine/owner-todo-alerts.ts";

// ─────────────────────────────────────────────────────────────
// 실제로 화면에 뜬 사고를 재현한다:
//   에피로드 태블릿케이스 블루투스 이어폰 ANC — 27,195,670원
// 마진 게이트는 이걸 못 잡는다. 원가 900만원에 판매가 2,700만원이면
// 마진 15%가 수학적으로 성립하기 때문이다.
// ─────────────────────────────────────────────────────────────

test("2,700만원짜리 위탁 상품은 차단된다 — 실제 사고 재현", () => {
  const v = checkPriceSanity({ priceKrw: 27_195_670, supplierCostKrw: 9_000_000 });
  assert.equal(v.sane, false);
  assert.equal(v.failed, "price_too_high");
});

test("마진율이 정상이어도 자릿수가 틀리면 막는다", () => {
  // 마진 15%가 성립하는 조합이지만 금액 자체가 비현실적이다
  const price = 27_000_000;
  const cost = 17_685_000; // 이 조합의 마진은 정상 범위
  const v = checkPriceSanity({ priceKrw: price, supplierCostKrw: cost });
  assert.equal(v.sane, false, "비율만 보면 통과하지만 금액으로 막혀야 한다");
});

test("정상 위탁 가격대는 통과한다", () => {
  for (const [price, cost] of [
    [12_900, 6_000],
    [24_900, 12_000],
    [49_900, 22_000],
    [180_000, 90_000],
  ]) {
    const v = checkPriceSanity({ priceKrw: price, supplierCostKrw: cost });
    assert.equal(v.sane, true, `${price}원/${cost}원은 정상이어야 한다: ${v.reason}`);
  }
});

test("배송비가 마진을 먹는 초저가는 막는다", () => {
  const v = checkPriceSanity({ priceKrw: 900, supplierCostKrw: 200 });
  assert.equal(v.sane, false);
  assert.equal(v.failed, "price_too_low");
});

test("원가 대비 배수가 비정상이면 막는다 — 묶음가가 섞였을 신호", () => {
  const v = checkPriceSanity({ priceKrw: 100_000, supplierCostKrw: 5_000 });
  assert.equal(v.sane, false);
  assert.equal(v.failed, "ratio_too_high");
});

test("NaN·0·음수는 통과시키지 않는다 (fail-closed)", () => {
  for (const bad of [NaN, 0, -1, Infinity]) {
    assert.equal(checkPriceSanity({ priceKrw: bad }).sane, false, `${bad}가 통과했다`);
  }
  assert.equal(checkPriceSanity({ priceKrw: 20_000, supplierCostKrw: NaN }).sane, false);
});

test("원가만으로도 먼저 걸러낸다 — 판매가 정해지기 전 단계", () => {
  assert.equal(checkSupplierCostSanity(9_000_000).sane, false);
  assert.equal(checkSupplierCostSanity(12_000).sane, true);
  assert.equal(checkSupplierCostSanity(0).sane, false);
});

test("상한 경계값이 정확히 동작한다", () => {
  assert.equal(checkPriceSanity({ priceKrw: MAX_CONSIGNMENT_PRICE_KRW }).sane, true);
  assert.equal(checkPriceSanity({ priceKrw: MAX_CONSIGNMENT_PRICE_KRW + 1 }).sane, false);
});

// ─────────────────────────────────────────────────────────────
// 초안 비우기 — 옛 엔진이 만든 상품을 말로 정리할 수 있어야 한다
// ─────────────────────────────────────────────────────────────

test("「초안 다 지워」를 알아듣는다", () => {
  for (const msg of ["초안 다 지워", "등록함 전부 비워줘", "만든거 다 삭제해", "대기 중인 상품 다 버려"]) {
    assert.equal(parseChatAction(msg).intent, "discard_drafts", `못 알아들음: ${msg}`);
  }
});

test("「지금 돌려」는 초안 삭제로 오해되지 않는다", () => {
  assert.equal(parseChatAction("지금 돌려줘").intent, "run_now");
  assert.equal(parseChatAction("실행해").intent, "run_now");
});

// ─────────────────────────────────────────────────────────────
// 검수 문자 — 잘려도 뜻이 뒤집히면 안 된다
// ─────────────────────────────────────────────────────────────

test("검수 문자 — 문구+URL 전체가 SMS 1건 한도 안에 들어간다", () => {
  // 종전 사고: 문구만 줄이고 URL 합산 길이를 안 봐서, 78자(문구 40+URL 37+개행)가
  // 67자 한도를 넘어 URL 한가운데("…effiroad.com/dashb" / "oard/review")에서
  // 쪼개졌다. 해외발신(Twilio)이라 통신사가 재조립도 안 해준다.
  for (const count of [1, 15, 100, 999]) {
    const todos = collectOwnerTodos([], Date.now(), {
      pendingReviewCount: count,
      reviewUrl: "https://effiroad.com/dashboard/review",
    });
    const review = todos.find((t) => t.kind === "need_review");
    assert.ok(review, `count=${count}`);
    assert.ok(
      review.message.length <= 67,
      `count=${count}: 전체 ${review.message.length}자 — 67자 한도를 넘으면 URL이 잘린다`,
    );
  }
});

test("검수 문자 — 앞부분만 읽어도 뜻이 통한다", () => {
  const todos = collectOwnerTodos([], Date.now(), {
    pendingReviewCount: 3,
    reviewUrl: "https://effiroad.com/dashboard/review",
  });
  const review = todos.find((t) => t.kind === "need_review");
  assert.ok(review);

  const [firstLine] = review.message.split("\n");
  // 종전 사고: 문자가 쪼개져 "바로 등록합니다"만 도착 → 뜻이 정반대로 읽혔다
  assert.ok(!firstLine.includes("바로 등록합니다"), "이미 등록했다는 뜻으로 읽히면 안 된다");
  assert.ok(firstLine.includes("확인"), "확인해 달라는 뜻이 앞부분에 있어야 한다");
  assert.ok(firstLine.length <= 45, `첫 줄 ${firstLine.length}자 — 분할되면 뜻이 깨진다`);
});
