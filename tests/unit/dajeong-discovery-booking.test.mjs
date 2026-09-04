import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { applyDiscoveryInstruction } from "../../dajeong/lib/discovery-conversation.ts";
import { prepareReservationOrder, syncPrepReservations } from "../../dajeong/lib/reservation-engine.ts";

function planWithDiscoveredEvent(overrides = {}) {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 여자친구와 데이트", budget: 200_000 });
  return {
    ...plan,
    discoveredEvents: [
      {
        id: "culture-1",
        title: "경복궁 야간개장",
        source: "culture_data",
        sourceLabel: "문화데이터광장 등록 정보",
        confidence: "official",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        place: "경복궁",
        detailsUrl: "https://apis.data.go.kr/example",
        signals: [],
        checkedAt: new Date().toISOString(),
        ...overrides,
      },
    ],
  };
}

test("발견 항목이 없으면 아무것도 처리하지 않는다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 여자친구와 데이트", budget: 200_000 });
  const result = applyDiscoveryInstruction(plan, "그거 넣어줘");
  assert.equal(result.handled, false);
});

test("'넣어줘'라고 하면 발견 항목이 예약 목록에 올라간다 — 일정에 몰래 끼워 넣지 않는다", () => {
  const plan = planWithDiscoveredEvent();
  const result = applyDiscoveryInstruction(plan, "경복궁 야간개장 넣어줘");
  assert.equal(result.handled, true);
  assert.equal(result.plan.discoveryBookings?.length, 1);
  assert.equal(result.plan.discoveryBookings[0].status, "interested");
  // 일정(items)에는 자동으로 추가되지 않는다.
  assert.equal(result.plan.items.some((item) => item.title === "경복궁 야간개장"), false);
  // 확정 정보라고 해도 예약 완료라고 말하면 안 된다.
  assert.equal(/예약.{0,4}완료/.test(result.message), false);
  assert.ok(result.message.includes("직접 확인"));
});

test("이미 목록에 있는 항목을 다시 넣으라고 하면 중복 생성하지 않는다", () => {
  const plan = planWithDiscoveredEvent();
  const first = applyDiscoveryInstruction(plan, "경복궁 야간개장 넣어줘");
  const second = applyDiscoveryInstruction(first.plan, "경복궁 야간개장 넣어줘");
  assert.equal(second.plan.discoveryBookings.length, 1);
  assert.ok(second.message.includes("이미"));
});

test("추정(inferred) 항목은 날짜를 단정하지 않고 확인하라고 안내한다", () => {
  const plan = planWithDiscoveredEvent({
    id: "naver-blog-1",
    title: "성수 신상 팝업",
    source: "naver_blog",
    sourceLabel: "네이버 블로그 반응",
    confidence: "inferred",
    startDate: undefined,
    endDate: undefined,
    detailsUrl: "https://blog.naver.com/example",
    signals: ["최근 21일 블로그 글 12건"],
  });
  const result = applyDiscoveryInstruction(plan, "성수 신상 팝업 가볼래");
  assert.equal(result.handled, true);
  assert.ok(result.message.includes("화제성으로만 확인"));
});

test("원문 링크가 없는 항목은 예약을 도와줄 수 없다고 정직하게 말한다", () => {
  const plan = planWithDiscoveredEvent({ detailsUrl: undefined });
  const result = applyDiscoveryInstruction(plan, "경복궁 야간개장 넣어줘");
  assert.ok(result.message.includes("직접 검색"));
});

test("'빼줘'라고 하면 예약 목록에서 취소 처리한다", () => {
  const plan = planWithDiscoveredEvent();
  const added = applyDiscoveryInstruction(plan, "경복궁 야간개장 넣어줘");
  const removed = applyDiscoveryInstruction(added.plan, "경복궁 야간개장 빼줘");
  assert.equal(removed.handled, true);
  assert.equal(removed.plan.discoveryBookings[0].status, "cancelled");
});

test("예약 목록에 오른 발견 항목은 syncPrepReservations로 실행(예약) 과제에 자동 반영된다", () => {
  const plan = planWithDiscoveredEvent();
  const added = applyDiscoveryInstruction(plan, "경복궁 야간개장 넣어줘");
  const synced = syncPrepReservations(added.plan);
  const task = synced.execution?.tasks.find((entry) => entry.itemId === added.plan.discoveryBookings[0].id);
  assert.ok(task);
  assert.equal(task.bookingMethod, "external_online");
  assert.equal(task.kind, "ticket");
  // 전화도 예약 URL도 원래 없던 정보라 자동 실행 대상이 아니다 — 사용자가 직접 확인해야 한다.
  assert.equal(task.capability, "assisted");
});

test("취소된 발견 예약은 실행 과제에서 빠진다", () => {
  const plan = planWithDiscoveredEvent();
  const added = applyDiscoveryInstruction(plan, "경복궁 야간개장 넣어줘");
  const removed = applyDiscoveryInstruction(added.plan, "경복궁 야간개장 빼줘");
  const order = prepareReservationOrder(removed.plan);
  assert.equal(order.tasks.some((task) => task.itemId === removed.plan.discoveryBookings[0].id), false);
});
