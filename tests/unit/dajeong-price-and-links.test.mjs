import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { realPriceRange } from "../../dajeong/lib/place-utils.ts";
import { prefilledBookingLink, prefilledLinkNote, shiftDate } from "../../dajeong/lib/booking-links.ts";

function candidate(overrides = {}) {
  return {
    id: "p1",
    name: "까사올리브",
    address: "서울 성동구",
    latitude: 37.54,
    longitude: 127.05,
    openNow: null,
    openingHours: [],
    businessStatus: "operational",
    mapsUrl: "https://maps.google.com/",
    source: "google_places",
    sourceLabel: "Google Places",
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

function taskWith(url) {
  return {
    id: "t1",
    itemId: "i1",
    title: "예약 대상",
    time: "19:00",
    kind: "reservation",
    bookingMethod: "external_platform",
    capability: "assisted",
    status: "user_action",
    providerLabel: "",
    bookingUrl: url,
    explanation: "",
    availability: "unknown",
    price: { currency: "KRW", estimatedAmount: 0, confidence: "estimate" },
    privacy: { requiredFields: [], approvedFields: [], purpose: "" },
    itemFingerprint: "fp",
  };
}

// ── 실제 가격대 ────────────────────────────────────────────────────────────

test("제공자가 준 실제 가격대는 그대로 쓰고, 예산엔 중간값을 넣는다", () => {
  const range = realPriceRange(candidate({ priceRangeMin: 10_000, priceRangeMax: 50_000 }), 2);
  assert.ok(range);
  assert.equal(range.min, 10_000);
  assert.equal(range.max, 50_000);
  // 1인 3만원 × 2명
  assert.equal(range.total, 60_000);
});

test("가격대가 반쪽만 오면 쓰지 않는다 — 반쪽 범위로 총액을 계산하면 예산이 틀어진다", () => {
  assert.equal(realPriceRange(candidate({ priceRangeMin: 10_000 }), 2), undefined);
  assert.equal(realPriceRange(candidate({ priceRangeMax: 50_000 }), 2), undefined);
  assert.equal(realPriceRange(candidate(), 2), undefined);
});

test("가격대가 뒤집혀 오면 무시한다", () => {
  assert.equal(realPriceRange(candidate({ priceRangeMin: 50_000, priceRangeMax: 10_000 }), 2), undefined);
});

// ── 예약 링크 미리 채우기 ──────────────────────────────────────────────────

test("네이버예약 링크에는 날짜·인원을 미리 채운다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁", budget: 200_000, targetDate: "2026-09-12", partySize: 2 });
  const link = prefilledBookingLink(taskWith("https://booking.naver.com/booking/13/bizes/1234"), plan);
  assert.match(link.url, /startDate=2026-09-12/);
  assert.match(link.url, /bookingCount=2/);
  assert.deepEqual(link.filled, ["날짜", "인원"]);
  assert.match(prefilledLinkNote(link), /미리 채워서/);
});

test("숙소 플랫폼은 체크인·체크아웃을 여행 일수에 맞춰 채운다", () => {
  const plan = createDajeongPlan({
    request: "다음 주 부산 2박 3일",
    planScope: "trip",
    tripDays: 3,
    targetDate: "2026-09-20",
    budget: 800_000,
  });
  const link = prefilledBookingLink(taskWith("https://www.yanolja.com/hotel/1000"), plan);
  assert.match(link.url, /checkIn=2026-09-20/);
  assert.match(link.url, /checkOut=2026-09-22/);
});

test("모르는 플랫폼이면 링크를 건드리지 않는다 — 엉뚱한 파라미터는 화면을 깨뜨린다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁", budget: 200_000 });
  const original = "https://some-restaurant.example.com/reserve";
  const link = prefilledBookingLink(taskWith(original), plan);
  assert.equal(link.url, original);
  assert.deepEqual(link.filled, []);
  assert.match(prefilledLinkNote(link), /직접 확인/);
});

test("링크가 없거나 형식이 깨져 있으면 그대로 돌려준다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁", budget: 200_000 });
  assert.equal(prefilledBookingLink(taskWith(""), plan).url, "");
  assert.equal(prefilledBookingLink(taskWith("tel:021234567"), plan).url, "tel:021234567");
});

test("날짜 이동은 월을 넘어가도 맞다", () => {
  assert.equal(shiftDate("2026-09-30", 2), "2026-10-02");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
});
