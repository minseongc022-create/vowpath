import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { clockToMinutes, lockPlanItem } from "../../dajeong/lib/schedule-engine.ts";
import {
  applyDelayReport,
  applyLeaveEarly,
  applySkipNext,
  applyStayLonger,
  buildLiveSnapshot,
  DELAY_PATTERN,
  LEAVE_EARLY_PATTERN,
  markLiveProgress,
  resolveCurrentItem,
  SKIP_NEXT_PATTERN,
  STAY_LONGER_PATTERN,
} from "../../dajeong/lib/live-engine.ts";
import {
  applySecrecyInstruction,
  revealAllItems,
  setItemVisibility,
  setVisibilityFrom,
} from "../../dajeong/lib/secrecy-actions.ts";
import { hasSecretContent, planAccessRole, redactPlanForViewer } from "../../dajeong/lib/secrecy.ts";
import { classifyPaceFeedback } from "../../dajeong/lib/pace.ts";

function datePlan() {
  return createDajeongPlan({ request: "이번 토요일 성수에서 여자친구와 20만원 데이트", budget: 200_000 });
}

function sharedPlan() {
  const plan = datePlan();
  return { ...plan, ownerId: "person_A", ownerName: "에이", planKind: "shared", companionId: "person_B", companionName: "비" };
}

// ── Day-of engine (TEST A/B/C) ─────────────────────────────────────────────

test("[TEST A] 지연 반영 — 고정된 예약은 그대로 두고 유동 일정만 조정한다", () => {
  const plan = datePlan();
  assert.ok(plan.items.length >= 3, "테스트를 위해 최소 3개 일정이 필요하다");
  const lockedItem = plan.items.at(-1);
  const locked = lockPlanItem(plan, lockedItem.id, "time", "예약 확정");
  const lockedTimeBefore = locked.items.find((item) => item.id === lockedItem.id).time;

  const target = locked.items[0];
  const result = applyDelayReport(locked, { itemId: target.id, extraMinutes: 40, reason: "여기서 많이 늦어지고 있어" });

  const updatedTarget = result.plan.items.find((item) => item.id === target.id);
  assert.equal(updatedTarget.durationMinutes, target.durationMinutes + 40, "지연 보고한 일정의 체류시간이 늘어나야 한다");

  const updatedLocked = result.plan.items.find((item) => item.id === lockedItem.id);
  assert.ok(updatedLocked, "고정된 일정은 삭제되지 않아야 한다");
  assert.equal(updatedLocked.time, lockedTimeBefore, "고정된(예약 확정) 일정의 시간은 지연 때문에 바뀌지 않아야 한다");
});

test("[TEST 4] 40분 지연됐다고 바로 다음 장소를 삭제하지 않는다", () => {
  const plan = datePlan();
  const target = plan.items[0];
  const before = plan.items.length;
  const result = applyDelayReport(plan, { itemId: target.id, extraMinutes: 40, reason: "test" });
  assert.equal(result.plan.items.length, before, "여유가 있는 40분 지연으로는 일정을 통째로 빼지 않아야 한다");
});

test("[TEST B] 여기 더 있고 싶어 — 현재 일정 체류시간만 늘리고 전체를 재계산한다", () => {
  const plan = datePlan();
  const target = plan.items[0];
  const next = plan.items[1];
  const beforeNextTime = clockToMinutes(next.time);

  const result = applyStayLonger(plan, { itemId: target.id, extraMinutes: 30, reason: "여기 더 있고 싶어" });
  const updatedTarget = result.plan.items.find((item) => item.id === target.id);
  const updatedNext = result.plan.items.find((item) => item.id === next.id);

  assert.equal(updatedTarget.durationMinutes, target.durationMinutes + 30);
  assert.ok(clockToMinutes(updatedNext.time) >= beforeNextTime, "뒤 일정은 앞으로 당겨지지 않고 그대로거나 밀려야 한다");
});

test("[TEST C] 집에 좀 일찍 갈래 — 새 귀가시간을 반영해 남은 일정을 줄인다", () => {
  const plan = datePlan();
  const result = applyLeaveEarly(plan, { reason: "집에 좀 일찍 갈래", nowClock: "15:00", wrapMinutes: 40 });
  assert.equal(result.plan.situation.homeByTime, "15:40");
  assert.ok(result.message.length > 0);
});

test("완료된(liveState done) 일정은 이후 재계산에서 시간이 바뀌지 않는다", () => {
  const plan = datePlan();
  const item0 = plan.items[0];
  const item1 = plan.items[1];
  const marked = markLiveProgress(plan, item1.time, 1);
  assert.equal(marked.items.find((item) => item.id === item0.id).liveState, "done");

  const stayed = applyStayLonger(marked, { itemId: item1.id, extraMinutes: 20, reason: "test" });
  const frozen = stayed.plan.items.find((item) => item.id === item0.id);
  assert.equal(frozen.time, item0.time, "지난 일정의 시간은 실시간 조정에서 다시 계산되지 않아야 한다");
  assert.equal(frozen.liveState, "done");
});

test("다음 거 그냥 빼자 — 고정된 일정은 거부하고, 아니면 뺀다", () => {
  const plan = datePlan();
  const removable = plan.items[1];
  const removed = applySkipNext(plan, { itemId: removable.id, reason: "다음 거 그냥 빼자" });
  assert.equal(removed.plan.items.some((item) => item.id === removable.id), false);

  const lockedTarget = plan.items[2];
  const locked = lockPlanItem(plan, lockedTarget.id, "place", "꼭 가고 싶은 곳");
  const refused = applySkipNext(locked, { itemId: lockedTarget.id, reason: "다음 거 그냥 빼자" });
  assert.equal(refused.plan.items.some((item) => item.id === lockedTarget.id), true, "고정된 일정은 삭제 요청에도 유지돼야 한다");
});

test("day-of 자연어 패턴이 의도한 문장만 인식한다", () => {
  assert.equal(STAY_LONGER_PATTERN.test("여기 더 있고 싶어"), true);
  assert.equal(DELAY_PATTERN.test("우리 아직 밥 먹고 있어"), true);
  assert.equal(DELAY_PATTERN.test("밥이 늦게 나와서 아직 식당이야"), true);
  assert.equal(DELAY_PATTERN.test("여기 더 있고 싶어"), false, "지연과 연장 요청은 서로 다른 의도다");
  assert.equal(LEAVE_EARLY_PATTERN.test("집에 좀 일찍 갈래"), true);
  assert.equal(SKIP_NEXT_PATTERN.test("다음 거 그냥 빼자"), true);
});

test("resolveCurrentItem / buildLiveSnapshot — 지금과 다음을 정확히 짚는다", () => {
  const plan = datePlan();
  const first = plan.items[0];
  const { current } = resolveCurrentItem(plan, first.time, 1);
  assert.equal(current?.id, first.id);

  const snapshot = buildLiveSnapshot(plan, first.time, 1);
  assert.equal(snapshot.current?.id, first.id);
  assert.equal(snapshot.allDone, false);

  const endOfDay = buildLiveSnapshot(plan, "23:55", 1);
  assert.equal(endOfDay.allDone, true);
  assert.equal(endOfDay.remaining.length, 0);
});

// ── Companion sharing & secrecy (TEST D–L) ──────────────────────────────────

test("[TEST D 전제] 공유되지 않은 계획은 소유자만 접근할 수 있다", () => {
  const plan = datePlan();
  const owned = { ...plan, ownerId: "person_A" };
  assert.equal(planAccessRole(owned, "person_A"), "owner");
  assert.equal(planAccessRole(owned, "person_stranger"), "none");
  assert.equal(redactPlanForViewer(owned, "person_stranger"), null);
});

test("[TEST D] 공유된 계획은 연결된 동반자가 볼 수 있다", () => {
  const plan = sharedPlan();
  assert.equal(planAccessRole(plan, "person_B"), "companion");
  const redacted = redactPlanForViewer(plan, "person_B");
  assert.ok(redacted);
  assert.equal(redacted.items.length, plan.items.length, "비공개 항목이 없다면 전체가 보여야 한다");
});

test("[TEST E] 전체 계획을 비공개로 두면(공유하지 않으면) 동반자에게 전혀 노출되지 않는다", () => {
  const plan = { ...datePlan(), ownerId: "person_A", planKind: "solo" };
  assert.equal(hasSecretContent(plan), false);
  assert.equal(planAccessRole(plan, "person_B"), "none");
  assert.equal(redactPlanForViewer(plan, "person_B"), null);
  // 소유자 자신에게는 항상 온전히 남아 있어야 한다 (앱을 나갔다 들어와도 사라지지 않는 것과 동치: 필드가 그대로 보존됨)
  assert.equal(redactPlanForViewer(plan, "person_A"), plan);
});

test("[TEST F/J] 마지막 일정만 비공개로 — 버튼과 자연어가 동일한 상태를 만든다", () => {
  const plan = sharedPlan();
  const target = plan.items.at(-1);

  const viaButton = setItemVisibility(plan, target.id, "secret", "서프라이즈");
  const viaNaturalLanguage = applySecrecyInstruction(plan, `마지막 장소는 여자친구한테 비밀로 해줘`).plan;

  assert.equal(viaButton.items.find((item) => item.id === target.id).visibility, "secret");
  assert.equal(
    viaButton.items.find((item) => item.id === target.id).visibility,
    viaNaturalLanguage.items.find((item) => item.id === target.id).visibility,
    "버튼과 자연어 명령은 같은 실제 상태를 바꿔야 한다",
  );

  const ownerView = redactPlanForViewer(viaButton, "person_A");
  assert.equal(ownerView.items.some((item) => item.id === target.id), true, "계획 소유자는 계속 실제 장소·시간을 알아야 한다");

  const companionView = redactPlanForViewer(viaButton, "person_B");
  assert.equal(companionView.items.some((item) => item.id === target.id), false, "동반자 화면에는 비공개 일정이 보이면 안 된다");
  assert.equal(companionView.items.length, plan.items.length - 1);
});

test("[TEST G] 시크릿 일정도 일정 엔진의 동선·시간 계산에는 계속 포함된다", () => {
  const plan = sharedPlan();
  const secretItem = plan.items.at(-1);
  const withSecret = setItemVisibility(plan, secretItem.id, "secret", "깜짝 이벤트");
  const beforeTime = withSecret.items.find((item) => item.id === secretItem.id).time;

  const mealItem = withSecret.items.find((item) => item.category === "meal");
  const delayed = applyDelayReport(withSecret, { itemId: mealItem.id, extraMinutes: 60, reason: "밥이 늦게 나와서 아직 식당이야" });
  const afterTime = delayed.plan.items.find((item) => item.id === secretItem.id)?.time;

  assert.ok(afterTime, "시크릿 일정은 재계산 후에도 여전히 존재해야 한다 (엔진이 계속 알고 있다는 뜻)");
  assert.ok(
    clockToMinutes(afterTime) >= clockToMinutes(beforeTime),
    "앞 일정이 크게 지연되면 시크릿 일정 시간도 뒤로 밀리며 함께 다시 계산돼야 한다",
  );
  assert.notEqual(afterTime, beforeTime, "이번 지연 폭에서는 시크릿 일정도 실제로 밀려야 확인이 된다");

  const companionView = redactPlanForViewer(delayed.plan, "person_B");
  assert.equal(companionView.items.some((item) => item.id === secretItem.id), false, "동선 계산에는 쓰이지만 동반자에게는 여전히 숨겨져야 한다");
});

test("[TEST H] 시크릿 일정 관련 대화는 동반자 화면으로 새어나가지 않는다", () => {
  const plan = sharedPlan();
  const target = plan.items[0];
  const secretResult = applySecrecyInstruction(plan, `${target.title} 일정은 여자친구한테 숨겨줘`, target.id);
  assert.equal(secretResult.handled, true);

  const ownerConversation = secretResult.plan.conversation ?? [];
  assert.ok(ownerConversation.some((message) => message.text.includes(target.title)), "소유자 대화 기록에는 남아 있어야 한다");

  const companionView = redactPlanForViewer(secretResult.plan, "person_B");
  const leaked = (companionView.conversation ?? []).some((message) => message.text.includes(target.title));
  assert.equal(leaked, false, "동반자에게 전달되는 대화에는 비공개 장소 이름이 나오면 안 된다");
});

test("[TEST I] 이제 공개해도 돼 — 지정한 범위를 공유 상태로 되돌린다", () => {
  const plan = sharedPlan();
  const target = plan.items.at(-1);
  const secret = setItemVisibility(plan, target.id, "secret", "note");
  assert.equal(redactPlanForViewer(secret, "person_B").items.some((item) => item.id === target.id), false);

  const revealed = applySecrecyInstruction(secret, `${target.title}은 이제 공개해도 돼`, target.id);
  assert.equal(revealed.handled, true);
  assert.equal(redactPlanForViewer(revealed.plan, "person_B").items.some((item) => item.id === target.id), true);
});

test("시간 기준 일괄 비공개 — 저녁까지만 보여줘", () => {
  const plan = sharedPlan();
  const cutoff = plan.items[Math.floor(plan.items.length / 2)].time;
  const { plan: next, changedItemIds } = setVisibilityFrom(plan, 1, cutoff, "secret");
  assert.ok(changedItemIds.length > 0);
  const companionView = redactPlanForViewer(next, "person_B");
  assert.ok(companionView.items.every((item) => clockToMinutesLocal(item.time) < clockToMinutesLocal(cutoff)));

  const revealed = revealAllItems(next).plan;
  const revealedView = redactPlanForViewer(revealed, "person_B");
  assert.equal(revealedView.items.length, plan.items.length);
});

function clockToMinutesLocal(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

// ── Pace feedback: session vs long-term profile (TEST K/L) ────────────────

test("[TEST K] 오늘 좀 천천히 놀자 — 오늘 세션에만 적용되는 여유 신호로 분류한다", () => {
  const feedback = classifyPaceFeedback("오늘 좀 천천히 놀자");
  assert.ok(feedback);
  assert.equal(feedback.scope, "session");
  assert.equal(feedback.density, "relaxed");
});

test("[TEST L 전제] 장기 취향 발언은 profile 스코프로, 상황성 발언과 구분된다", () => {
  const durable = classifyPaceFeedback("난 원래 데이트할 때 여기저기 많이 다니는 게 좋아");
  assert.ok(durable);
  assert.equal(durable.scope, "profile");
  assert.equal(durable.density, "compact");

  const situational = classifyPaceFeedback("오늘 피곤해서 여유롭게 다니자");
  assert.ok(situational);
  assert.equal(situational.scope, "session");

  const unrelated = classifyPaceFeedback("사진 예쁘게 나오는 곳으로 해줘");
  assert.equal(unrelated, null, "일정 밀도와 무관한 말은 페이스 신호로 분류하지 않아야 한다");
});
