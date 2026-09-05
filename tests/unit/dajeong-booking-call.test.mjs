import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { prepareReservationOrder, applyBookingCallOutcome, markTaskCalling } from "../../dajeong/lib/reservation-engine.ts";
import {
  callPreviewScript,
  bookingCallVariables,
  canCallForBooking,
  koreaHour,
  outcomeMessage,
  spokenDate,
  spokenTime,
  statusForOutcome,
  withinCallableHours,
} from "../../dajeong/lib/booking-call-brief.ts";

function phoneTask(overrides = {}) {
  return {
    id: "execute_p1_i1",
    itemId: "i1",
    title: "까사올리브",
    time: "19:00",
    kind: "reservation",
    bookingMethod: "phone_only",
    capability: "automatic",
    status: "phone_required",
    providerLabel: "하루위드가 대신 전화",
    bookingUrl: "",
    explanation: "",
    availability: "unknown",
    price: { currency: "KRW", estimatedAmount: 80_000, onsiteAmount: 80_000, confidence: "estimate" },
    privacy: { requiredFields: ["name", "phone"], approvedFields: [], purpose: "" },
    phoneNumber: "02-123-4567",
    itemFingerprint: "fp",
    ...overrides,
  };
}

function callRecord(overrides = {}) {
  const now = new Date("2026-09-10T05:00:00Z").toISOString();
  return {
    id: "call_abc",
    planId: "p1",
    taskId: "execute_p1_i1",
    ownerId: "person_A",
    toNumber: "+820212345678",
    placeName: "까사올리브",
    status: "finished",
    createdAt: now,
    updatedAt: now,
    endedAt: now,
    ...overrides,
  };
}

test("전화로 말할 날짜·시간은 요일과 오전/오후를 붙여 읽는다", () => {
  assert.equal(spokenDate("2026-09-12"), "9월 12일 토요일");
  assert.equal(spokenTime("19:00"), "저녁 7시");
  assert.equal(spokenTime("09:30"), "오전 9시 30분");
});

test("전화번호가 없거나 이미 예약된 항목엔 전화를 걸지 않는다", () => {
  assert.equal(canCallForBooking(phoneTask()), true);
  assert.equal(canCallForBooking(phoneTask({ phoneNumber: undefined })), false);
  assert.equal(canCallForBooking(phoneTask({ status: "booked" })), false);
  // 이미 통화 중인 항목에 또 걸면 가게에 전화가 두 번 간다.
  assert.equal(canCallForBooking(phoneTask({ status: "executing" })), false);
});

test("새벽·늦은 밤에는 가게에 전화하지 않는다", () => {
  assert.equal(koreaHour(new Date("2026-09-10T00:00:00Z")), 9);
  assert.equal(withinCallableHours(new Date("2026-09-10T05:00:00Z")).ok, true); // 한국 14시
  assert.equal(withinCallableHours(new Date("2026-09-09T18:00:00Z")).ok, false); // 한국 새벽 3시
  assert.equal(withinCallableHours(new Date("2026-09-10T12:00:00Z")).ok, false); // 한국 21시
});

test("오늘이 휴무일로 적혀 있으면 걸지 않는다", () => {
  // 2026-09-10T05:00Z = 목요일 14시(KST)
  const closed = withinCallableHours(new Date("2026-09-10T05:00:00Z"), ["목요일 정기휴무"]);
  assert.equal(closed.ok, false);
  assert.match(closed.reason, /휴무/);
});

test("사용자가 승인 전에 볼 통화 문구는 AI라고 먼저 밝힌다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁 먹고 싶어", budget: 200_000 });
  const script = callPreviewScript({ task: phoneTask(), plan, contact: { name: "김민성" } });
  assert.match(script, /AI 비서/);
  assert.match(script, /김민성/);
  assert.match(script, /취소 조건/);
});

test("승인하지 않은 개인정보는 통화 변수에 담기지 않는다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁 먹고 싶어", budget: 200_000 });
  const withoutConsent = bookingCallVariables({ task: phoneTask(), plan, contact: {} });
  assert.equal(withoutConsent.guest_name, "");
  assert.equal(withoutConsent.guest_phone, "");

  const withConsent = bookingCallVariables({ task: phoneTask(), plan, contact: { name: "김민성", phone: "010-1111-2222" } });
  assert.equal(withConsent.guest_name, "김민성");
  assert.equal(withConsent.guest_phone, "010-1111-2222");
  // 예산은 우리 쪽 사정이라 가게에 알려주지 않는다.
  assert.equal(withConsent.budget_hint, "");
});

test("확정된 통화만 예약 완료로 넘어간다", () => {
  assert.equal(statusForOutcome("confirmed", phoneTask()), "booked");
  assert.equal(statusForOutcome("confirmed", phoneTask({ kind: "purchase" })), "purchased");
  assert.equal(statusForOutcome("declined", phoneTask()), "alternative_required");
  assert.equal(statusForOutcome("alternative_offered", phoneTask()), "alternative_required");
  assert.equal(statusForOutcome("unreachable", phoneTask()), "phone_required");
  assert.equal(statusForOutcome("needs_human", phoneTask()), "phone_required");
  // 결과를 모르면 절대 완료가 아니다.
  assert.equal(statusForOutcome(undefined, phoneTask()), "phone_required");
});

test("통화 결과 문구는 확인된 것만 말한다", () => {
  const confirmed = outcomeMessage(callRecord({ outcome: "confirmed", confirmedDetail: "창가 자리로 잡아주셨어.", quotedAmount: 90_000 }));
  assert.match(confirmed, /예약됐어/);
  assert.match(confirmed, /90,000원/);

  const unreachable = outcomeMessage(callRecord({ outcome: "unreachable" }));
  assert.match(unreachable, /안 받으셔/);
  assert.equal(/예약됐어/.test(unreachable), false);
});

test("확정 통화는 실행 목록에 확인 기록과 확정 금액까지 남긴다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁 먹고 싶어", budget: 200_000 });
  const order = { ...prepareReservationOrder(plan), tasks: [phoneTask()] };
  const applied = applyBookingCallOutcome(order, callRecord({
    outcome: "confirmed",
    confirmedDetail: "토요일 저녁 7시 2명 예약 확인",
    quotedAmount: 90_000,
    cancellationTerms: "당일 취소는 불가",
  }));
  const task = applied.tasks[0];
  assert.equal(task.status, "booked");
  assert.equal(task.confirmation.source, "provider");
  assert.match(task.confirmation.details, /취소 조건/);
  assert.equal(task.price.confidence, "provider_quote");
  assert.equal(task.price.confirmedTotalAmount, 90_000);
});

test("가게가 다른 시간을 제안하면 확정이 아니라 사용자 승인 대상으로 남는다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁 먹고 싶어", budget: 200_000 });
  const order = { ...prepareReservationOrder(plan), tasks: [phoneTask()] };
  const applied = applyBookingCallOutcome(order, callRecord({ outcome: "alternative_offered", offeredAlternative: "저녁 8시 30분" }));
  const task = applied.tasks[0];
  assert.equal(task.status, "alternative_required");
  assert.equal(task.proposedChange.requiresApproval, true);
  assert.match(task.proposedChange.time, /8시 30분/);
  assert.equal(task.confirmation, undefined);
});

test("통화가 시작되면 그 항목은 진행 중으로 잠긴다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁 먹고 싶어", budget: 200_000 });
  const order = { ...prepareReservationOrder(plan), tasks: [phoneTask()] };
  const calling = markTaskCalling(order, "execute_p1_i1");
  assert.equal(calling.tasks[0].status, "executing");
  assert.equal(canCallForBooking(calling.tasks[0]), false);
});

test("대신 전화가 가능한 배포에서만 전화 예약이 자동 실행 항목이 된다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁 먹고 싶어", budget: 200_000 });
  const withPhone = {
    ...plan,
    items: plan.items.map((item, index) => index === 0
      ? { ...item, reservationRequired: true, reality: { ...(item.reality ?? {}), phoneNumber: "02-123-4567", bookingMethod: "phone_only", priceLabel: "", priceConfidence: "unknown", openNow: null, openingHours: [], businessStatus: "unknown", checkedAt: "", freshness: "reference", imageKind: "reference", detailsUrl: "", reservationState: "manual", reservationLabel: "", source: "kakao_local", sourceLabel: "" } }
      : item),
  };
  const manual = prepareReservationOrder(withPhone, { autoCall: false });
  const auto = prepareReservationOrder(withPhone, { autoCall: true });
  const manualTask = manual.tasks.find((task) => task.bookingMethod === "phone_only");
  const autoTask = auto.tasks.find((task) => task.bookingMethod === "phone_only");
  assert.ok(manualTask && autoTask);
  assert.equal(manualTask.capability, "assisted");
  assert.equal(autoTask.capability, "automatic");
  assert.equal(auto.autoCallEnabled, true);
});

test("자동 통화 설정은 계획을 다시 계산해도 유지된다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 저녁 먹고 싶어", budget: 200_000 });
  const first = prepareReservationOrder(plan, { autoCall: true });
  const again = prepareReservationOrder(plan, { previous: first });
  assert.equal(again.autoCallEnabled, true);
});
