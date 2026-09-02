import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { clockToMinutes } from "../../dajeong/lib/schedule-engine.ts";
import {
  checkPrepFeasibility,
  createPrepItem,
  isLeadTimeFeasible,
  recommendHandling,
  resolveLeadTimeDays,
  shiftDate,
  shouldOfferPrepCheck,
  suggestPrepCategories,
} from "../../dajeong/lib/prep-engine.ts";
import { applyPrepInstruction } from "../../dajeong/lib/prep-conversation.ts";
import {
  applySecrecyInstruction,
  setItemDisclosure,
  setItemVisibility,
  setPrepVisibility,
} from "../../dajeong/lib/secrecy-actions.ts";
import { hasSecretContent, planAccessRole, redactPlanForViewer, sanitizeMessageForViewer } from "../../dajeong/lib/secrecy.ts";
import { applySegmentTransport } from "../../dajeong/lib/live-engine.ts";
import { prepareReservationOrder, syncPrepReservations } from "../../dajeong/lib/reservation-engine.ts";

function birthdayPlan() {
  return createDajeongPlan({ request: "다음 주 여자친구 생일 데이트 짜고 싶어", budget: 250_000 });
}

function plainDatePlan() {
  return createDajeongPlan({ request: "오늘 그냥 밥 먹고 카페 가려고", budget: 100_000 });
}

function sharedPlan() {
  const plan = birthdayPlan();
  return { ...plan, ownerId: "person_A", ownerName: "에이", planKind: "shared", companionId: "person_B", companionName: "비" };
}

// ── 1. 준비 일정 발견 (TEST 1) ──────────────────────────────────────────────

test("[TEST 1] 생일처럼 준비할 가치가 높은 상황에서만 먼저 물어본다", () => {
  const birthday = birthdayPlan();
  assert.equal(birthday.prepAsked, true);
  assert.ok(birthday.conversation?.some((m) => m.role === "assistant" && /서프라이즈|선물/.test(m.text)));

  const plain = plainDatePlan();
  assert.notEqual(plain.prepAsked, true);
  assert.equal(plain.conversation?.some((m) => /서프라이즈나 선물/.test(m.text)), false);
});

test("[TEST 1] 꽃이랑 케이크 하고 싶어 — 실제 준비 항목이 생성된다", () => {
  const plan = birthdayPlan();
  const result = applyPrepInstruction(plan, "꽃이랑 케이크 하고 싶어");
  assert.equal(result.handled, true);
  const categories = (result.plan.prep ?? []).map((item) => item.category).sort();
  assert.deepEqual(categories, ["cake", "flower"]);
  assert.ok(result.plan.prep.every((item) => item.status === "suggested"));
});

// ── 2. 이미 준비함 (TEST 2) ─────────────────────────────────────────────────

test("[TEST 2] 선물은 이미 샀어 — 다시 추천하지 않고, 꽃만 새로 준비한다", () => {
  let plan = birthdayPlan();
  const already = applyPrepInstruction(plan, "선물은 이미 샀어");
  assert.equal(already.handled, true);
  plan = already.plan;

  const flowerOnly = applyPrepInstruction(plan, "꽃 준비해줘");
  assert.equal(flowerOnly.handled, true);
  const categories = (flowerOnly.plan.prep ?? []).map((item) => item.category);
  assert.deepEqual(categories, ["flower"]);
});

test("아무것도 안 할래 — 계속 권하지 않도록 기억한다", () => {
  const plan = birthdayPlan();
  const result = applyPrepInstruction(plan, "아무것도 안 할래");
  assert.equal(result.handled, true);
  assert.equal(result.plan.prepDeclined, true);
});

// ── 3. 타이밍 — 전날 준비 (TEST 3) ──────────────────────────────────────────

test("[TEST 3] 꽃은 전날 살래 — D-1 준비 일정으로 옮기고 메인 계획과 연결된다", () => {
  let plan = birthdayPlan();
  plan = applyPrepInstruction(plan, "꽃 준비해줘").plan;
  const flower = plan.prep.find((item) => item.category === "flower");
  assert.equal(flower.date, plan.situation.targetDate);

  const moved = applyPrepInstruction(plan, "꽃은 전날 살래");
  assert.equal(moved.handled, true);
  const updated = moved.plan.prep.find((item) => item.id === flower.id);
  assert.equal(updated.date, shiftDate(plan.situation.targetDate, -1));
  assert.equal(updated.planId, plan.id, "준비 일정은 같은 계획에 속한다");
});

// ── 4. 보관 문제 (TEST 4) ───────────────────────────────────────────────────

test("[TEST 4] 케이크 들고 하루 종일 다니기 싫다면 배송/전달 방식으로 바꾼다", () => {
  let plan = birthdayPlan();
  plan = applyPrepInstruction(plan, "케이크 준비해줘").plan;
  const result = applyPrepInstruction(plan, "케이크 들고 하루 종일 다니기는 싫어");
  assert.equal(result.handled, true);
  const cake = result.plan.prep.find((item) => item.category === "cake");
  assert.equal(cake.handling, "delivery");
  assert.ok(cake.storageNote);
});

// ── 5. 리드타임 (TEST 5) ────────────────────────────────────────────────────

test("[TEST 5] 주문제작 케이크는 리드타임이 있고, 당일 불가능하면 정직하게 알린다", () => {
  assert.equal(resolveLeadTimeDays("cake", "주문제작 레터링 케이크"), 2);
  assert.equal(resolveLeadTimeDays("cake", "그냥 조각 케이크"), 0);

  const plan = birthdayPlan();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // 오늘 당장 주문제작 케이크를 요청 — 리드타임(2일)을 지킬 방법이 없는 상황을 재현한다.
  const item = createPrepItem(plan, { category: "cake", title: "주문제작 포토케이크", date: todayKey });
  assert.equal(item.leadTimeDays, 2);
  assert.equal(item.orderDeadline, shiftDate(todayKey, -2));
  assert.equal(isLeadTimeFeasible(item, todayKey), false);

  const withItem = { ...plan, prep: [item] };
  const warnings = checkPrepFeasibility(withItem);
  assert.ok(warnings.some((warning) => warning.includes("주문제작 포토케이크")));
});

test("리드타임이 없는 준비물은 항상 실행 가능하다고 판단한다", () => {
  const advice = recommendHandling("flower");
  assert.equal(advice.handling, "pickup");
  assert.ok(advice.note.length > 0);
});

test("프로포즈 상황에서는 꽃·선물 위주로, 최대 2개만 제안한다", () => {
  const plan = createDajeongPlan({ request: "프로포즈 준비하고 싶어", budget: 500_000 });
  const suggestions = suggestPrepCategories(plan.situation);
  assert.ok(suggestions.length <= 2);
  assert.ok(suggestions.some((s) => s.category === "flower"));
});

// ── 6/9. 완전 비공개 + 존재 자체 유출 금지 (TEST 6, TEST 9) ─────────────────

test("[TEST 6] 완전 숨김 — 동반자에게 항목 자체가 전달되지 않는다", () => {
  let plan = sharedPlan();
  const target = plan.items.at(-1);
  plan = setItemVisibility(plan, target.id, "secret", "이벤트");
  const forCompanion = redactPlanForViewer(plan, "person_B");
  assert.equal(forCompanion.items.some((item) => item.id === target.id), false);
});

test("[TEST 9] 완전 숨김 상태에서도 '비공개 일정이 있다'는 사실 자체를 알리지 않는다", () => {
  let plan = sharedPlan();
  const target = plan.items.at(-1);
  plan = setItemVisibility(plan, target.id, "secret");
  const forCompanion = redactPlanForViewer(plan, "person_B");
  assert.equal(forCompanion.notice, plan.notice, "리댁션 때문에 notice 문구가 바뀌면 안 된다 (존재 힌트 금지)");
  assert.doesNotMatch(forCompanion.notice, /비공개|숨김|시크릿/);
});

// ── 7. 서프라이즈로만 표시 (TEST 7) ──────────────────────────────────────────

test("[TEST 7] '서프라이즈라고만 보여줘' — 시간은 보이되 장소/내용은 감춘다", () => {
  const plan = sharedPlan();
  const target = plan.items.at(-1);
  const result = applySecrecyInstruction(plan, "내용은 숨기고 저녁 8시부터 서프라이즈 있다고만 보여줘");
  assert.equal(result.handled, true);
  const updated = result.plan.items.find((item) => item.id === target.id);
  assert.equal(updated.visibility, "secret");
  assert.equal(updated.secretDisclosure, "label_only");

  const companionView = redactPlanForViewer(result.plan, "person_B");
  const shown = companionView.items.find((item) => item.id === target.id);
  assert.ok(shown, "완전히 숨기지 않고 시간대는 유지되어야 한다");
  assert.equal(shown.title, "서프라이즈 일정");
  assert.equal(shown.location, "");
  assert.equal(shown.price, 0);
  assert.equal(shown.reality, undefined);

  const ownerView = redactPlanForViewer(result.plan, "person_A");
  assert.equal(ownerView.items.find((item) => item.id === target.id).title, target.title, "소유자는 실제 제목을 계속 본다");
});

test("시간만 표시 공개 수준도 지원한다", () => {
  const plan = sharedPlan();
  const target = plan.items[0];
  let next = setItemVisibility(plan, target.id, "secret");
  next = setItemDisclosure(next, target.id, "time_only");
  const companionView = redactPlanForViewer(next, "person_B");
  const shown = companionView.items.find((item) => item.id === target.id);
  assert.equal(shown.title, "일정 있음");
  assert.equal(shown.location, "");
});

// ── 8. 유출 방지 — 채팅/메시지 스크럽 ────────────────────────────────────────

test("[TEST 8] 대화 중 장소명이 노출되지 않는다 — sanitizeMessageForViewer", () => {
  const plan = sharedPlan();
  const target = plan.items[0];
  const secret = setItemVisibility(plan, target.id, "secret");
  const message = `${target.title} 시작 시간을 뒤로 밀었어요.`;
  const sanitizedForCompanion = sanitizeMessageForViewer(secret, "person_B", message);
  assert.equal(sanitizedForCompanion.includes(target.title), false);
  const sanitizedForOwner = sanitizeMessageForViewer(secret, "person_A", message);
  assert.equal(sanitizedForOwner, message, "소유자에게는 원문 그대로 전달돼야 한다");
});

// ── 10. 준비 항목도 시크릿 가능 ──────────────────────────────────────────────

test("[TEST 10 관련] 준비 항목(꽃/케이크)도 시크릿으로 지정할 수 있다", () => {
  let plan = sharedPlan();
  plan = applyPrepInstruction(plan, "꽃 준비해줘").plan;
  const flower = plan.prep.find((item) => item.category === "flower");

  const result = applySecrecyInstruction(plan, "꽃 준비하는 거 여자친구한테 비밀로 해줘");
  assert.equal(result.handled, true);
  const updated = result.plan.prep.find((item) => item.id === flower.id);
  assert.equal(updated.visibility, "secret");

  const companionView = redactPlanForViewer(result.plan, "person_B");
  assert.equal(companionView.prep.some((item) => item.id === flower.id), false, "비공개 준비물은 동반자 목록에서 빠져야 한다");
  const ownerView = redactPlanForViewer(result.plan, "person_A");
  assert.equal(ownerView.prep.some((item) => item.id === flower.id), true);
});

test("공유 준비물(우산 챙기기 등)은 그대로 함께 보인다", () => {
  let plan = sharedPlan();
  plan = applyPrepInstruction(plan, "선물 준비해줘").plan;
  const gift = plan.prep.find((item) => item.category === "gift");
  const shared = setPrepVisibility(plan, gift.id, "shared");
  const companionView = redactPlanForViewer(shared, "person_B");
  assert.equal(companionView.prep.some((item) => item.id === gift.id), true);
});

// ── 11. 공개 전환 ────────────────────────────────────────────────────────────

test("[TEST 15] 이제 공개해도 돼 — 지정한 항목만 공개된다", () => {
  let plan = sharedPlan();
  const secretTarget = plan.items.at(-1);
  const otherTarget = plan.items[0];
  plan = setItemVisibility(plan, secretTarget.id, "secret");
  plan = setItemVisibility(plan, otherTarget.id, "secret");

  const result = applySecrecyInstruction(plan, `${secretTarget.title}은 이제 공개해도 돼`);
  assert.equal(result.handled, true);
  const revealed = result.plan.items.find((item) => item.id === secretTarget.id);
  assert.equal(revealed.visibility, "shared");
  const stillSecret = result.plan.items.find((item) => item.id === otherTarget.id);
  assert.equal(stillSecret.visibility, "secret", "다른 비공개 항목까지 같이 공개되면 안 된다");
});

// ── 16. 구간별 이동수단 ──────────────────────────────────────────────────────

test("[TEST 16] 여기서 다음 데까지만 택시 — 해당 구간만 바뀌고 나머지는 그대로다", () => {
  const plan = birthdayPlan();
  const first = plan.items[0];
  const second = plan.items[1];
  const nowClock = first.time;
  const result = applySegmentTransport(plan, { nowClock, reason: "여기서 다음 데까지만 택시 타자" });
  const updatedSecond = result.plan.items.find((item) => item.id === second.id);
  assert.equal(updatedSecond.segmentTransportOverride, "car");
  const laterItems = result.plan.items.filter((item) => clockToMinutes(item.time) > clockToMinutes(updatedSecond.time));
  assert.ok(laterItems.every((item) => item.segmentTransportOverride == null), "다른 구간의 이동수단은 그대로여야 한다");
});

test("돌아갈 때만 택시 — 귀가 이동수단만 바뀐다", () => {
  const plan = birthdayPlan();
  const result = applySegmentTransport(plan, { reason: "돌아갈 때만 택시 탈래" });
  assert.equal(result.plan.situation.homeTransportOverride, "car");
  assert.equal(result.plan.situation.transport, plan.situation.transport, "전체 기본 이동수단은 그대로여야 한다");
});

// ── 권한 모델 기본값 ─────────────────────────────────────────────────────────

test("권한이 불분명하면 기본적으로 거부한다 (deny by default)", () => {
  const plan = sharedPlan();
  assert.equal(planAccessRole(plan, "unknown_stranger"), "none");
  assert.equal(redactPlanForViewer(plan, "unknown_stranger"), null);
  assert.equal(planAccessRole(plan, null), "none");
  assert.equal(redactPlanForViewer(plan, null), null);
});

test("hasSecretContent가 prep의 personal/secret도 함께 감지한다", () => {
  let plan = sharedPlan();
  assert.equal(hasSecretContent(plan), false);
  plan = applyPrepInstruction(plan, "선물 준비해줘").plan;
  const gift = plan.prep.find((item) => item.category === "gift");
  plan = setPrepVisibility(plan, gift.id, "personal");
  assert.equal(hasSecretContent(plan), true);
});

// ── 준비물 예약 자동화 (TEST 18~21) ──────────────────────────────────────────

test("[TEST 18] 준비물 예약: 꽃/케이크 준비물도 실행 항목에 포함된다", () => {
  let plan = birthdayPlan();
  plan = applyPrepInstruction(plan, "꽃이랑 케이크 준비해줘").plan;
  const order = prepareReservationOrder(plan);
  const prepIds = new Set(plan.prep.map((item) => item.id));
  const prepTasks = order.tasks.filter((task) => prepIds.has(task.itemId));
  assert.equal(prepTasks.length, 2);
  assert.ok(prepTasks.every((task) => task.kind === "purchase"));
  assert.ok(order.requestedItemIds.some((id) => prepIds.has(id)));
});

test("[TEST 19] 준비물 예약: 직접 준비(self_prepared)로 바꾸면 실행 항목에서 빠진다", () => {
  let plan = birthdayPlan();
  plan = applyPrepInstruction(plan, "선물 준비해줘").plan;
  const gift = plan.prep.find((item) => item.category === "gift");
  plan = { ...plan, prep: plan.prep.map((item) => item.id === gift.id ? { ...item, handling: "self_prepared" } : item) };
  const order = prepareReservationOrder(plan);
  assert.equal(order.tasks.some((task) => task.itemId === gift.id), false);
});

test("[TEST 20] syncPrepReservations: 준비물만 있어도 자동으로 실행 계획을 만든다 (사전 실행 요청 없이도)", () => {
  let plan = birthdayPlan();
  assert.equal(plan.execution, undefined);
  plan = applyPrepInstruction(plan, "꽃 준비해줘").plan;
  const flower = plan.prep.find((item) => item.category === "flower");
  const synced = syncPrepReservations(plan);
  assert.ok(synced.execution);
  assert.ok(synced.execution.tasks.some((task) => task.itemId === flower.id));
  // 최종 결제·확정은 여전히 사용자 승인이 필요한 상태를 벗어나지 않는다.
  assert.equal(synced.execution.tasks.some((task) => task.status === "booked" || task.status === "purchased"), false);
});

test("[TEST 21] syncPrepReservations: 이미 특정 항목으로 좁혀진 실행 계획의 범위는 유지하면서 준비물만 추가한다", () => {
  let plan = birthdayPlan();
  const meal = plan.items.find((item) => item.category === "meal");
  plan = { ...plan, execution: prepareReservationOrder(plan, { targetItemIds: [meal.id], includeTravel: false }) };
  assert.deepEqual(plan.execution.requestedItemIds, [meal.id]);
  plan = applyPrepInstruction(plan, "케이크 준비해줘").plan;
  const cake = plan.prep.find((item) => item.category === "cake");
  const synced = syncPrepReservations(plan);
  assert.ok(synced.execution.requestedItemIds.includes(meal.id));
  assert.ok(synced.execution.requestedItemIds.includes(cake.id));
  const otherMainItems = plan.items.filter((item) => item.id !== meal.id && item.reservationRequired);
  assert.ok(otherMainItems.every((item) => !synced.execution.requestedItemIds.includes(item.id)), "명시적으로 선택하지 않은 다른 메인 항목까지 끌려오면 안 된다");
});

// ── 실행 화면 유출 방지 (TEST 22) ────────────────────────────────────────────

test("[TEST 22] 실행 화면 유출 방지: time_only/label_only로 공개된 시크릿 항목도 실행 작업 자체는 동반자에게 숨긴다", () => {
  let plan = sharedPlan();
  const secretTarget = plan.items[0];
  plan = setItemVisibility(plan, secretTarget.id, "secret");
  plan = setItemDisclosure(plan, secretTarget.id, "time_only");
  plan = { ...plan, execution: prepareReservationOrder(plan, { includeTravel: false }) };
  assert.ok(plan.execution.tasks.some((task) => task.itemId === secretTarget.id), "테스트 전제: 원본 실행 계획에는 시크릿 항목의 작업이 있어야 한다");

  const companionView = redactPlanForViewer(plan, "person_B");
  assert.equal(companionView.execution.tasks.some((task) => task.itemId === secretTarget.id), false, "time_only여도 실행 작업(실제 장소·전화번호·가격)까지 보이면 안 된다");
});

test("[TEST 23] 실행 화면 유출 방지: 공개되지 않은 준비물(personal/secret)의 예약 작업도 동반자에게 숨긴다", () => {
  let plan = sharedPlan();
  plan = applyPrepInstruction(plan, "케이크 준비해줘").plan;
  const cake = plan.prep.find((item) => item.category === "cake");
  plan = setPrepVisibility(plan, cake.id, "secret");
  plan = syncPrepReservations(plan);
  assert.ok(plan.execution?.tasks.some((task) => task.itemId === cake.id), "테스트 전제: 원본 실행 계획에는 준비물 작업이 있어야 한다");

  const companionView = redactPlanForViewer(plan, "person_B");
  assert.equal(companionView.prep.some((item) => item.id === cake.id), false);
  assert.equal(companionView.execution?.tasks.some((task) => task.itemId === cake.id), false, "비공개 준비물의 예약 작업(실제 업체·가격)이 실행 화면을 통해 유출되면 안 된다");
});
