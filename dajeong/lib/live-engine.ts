import { clockToMinutes, scheduleDajeongPlan, setItemDuration, shiftClock } from "./schedule-engine";
import type { DajeongPlan, PlanItem } from "./types";

export type LiveTargets = { current?: PlanItem; next?: PlanItem; previous?: PlanItem };

export type LiveSnapshot = {
  nowClock: string;
  dayNumber: number;
  current?: PlanItem;
  next?: PlanItem;
  remaining: PlanItem[];
  runningLateMinutes: number;
  weatherNote?: string;
  prepReminders: string[];
  allDone: boolean;
};

export type LiveActionResult = {
  plan: DajeongPlan;
  message: string;
  changedItemIds: string[];
};

const DEFAULT_STAY_EXTRA_MINUTES = 30;
const DELAY_TAIL_MINUTES = 15;
const MAX_EXTENSION_MINUTES = 180;

// Exported so the day-of instruction router (concierge.ts) and tests share one definition —
// what counts as "a delay" must never drift between what's matched and what's verified.
export const STAY_LONGER_PATTERN = /더\s*있고\s*싶|더\s*있을래|좀\s*더\s*있|여기\s*더\s*있|아직\s*더\s*보고/;
export const DELAY_PATTERN = /아직\s*(밥|식사|여기|거기|중이야|이야|끝나지)|늦게\s*(나와|나온|끝나|시작)|많이\s*늦었|\d{1,3}\s*분\s*(정도\s*)?늦었|다\s*못\s*끝냈/;
export const LEAVE_EARLY_PATTERN = /집에\s*(좀)?\s*일찍\s*갈|먼저\s*갈래|그만\s*(놀고|하고)\s*집에|일찍\s*마무리|이제\s*그만\s*집에/;
export const SKIP_NEXT_PATTERN = /다음\s*(거|일정|곳|건)\s*(그냥\s*)?빼자|다음\s*일정\s*(빼|없애|생략)/;

export function currentClock(referenceDate: Date = new Date()): string {
  return `${String(referenceDate.getHours()).padStart(2, "0")}:${String(referenceDate.getMinutes()).padStart(2, "0")}`;
}

export function resolveDayNumber(plan: DajeongPlan, referenceDate: Date = new Date()): number {
  if (plan.situation.planScope !== "trip") return 1;
  const start = new Date(`${plan.situation.targetDate}T00:00:00`);
  const today = new Date(referenceDate.toDateString());
  const diffDays = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  return Math.min(Math.max(1, diffDays + 1), plan.situation.tripDays ?? diffDays + 1);
}

function itemsForDay(plan: DajeongPlan, dayNumber: number): PlanItem[] {
  return plan.items.filter((item) => (item.dayNumber ?? 1) === dayNumber).sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time));
}

export function resolveCurrentItem(plan: DajeongPlan, nowClock: string, dayNumber = 1): LiveTargets {
  const items = itemsForDay(plan, dayNumber);
  const nowMin = clockToMinutes(nowClock);
  let previous: PlanItem | undefined;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const start = clockToMinutes(item.time);
    const end = start + item.durationMinutes;
    if (nowMin >= start && nowMin < end) return { current: item, next: items[index + 1], previous };
    if (nowMin < start) return { current: undefined, next: item, previous };
    previous = item;
  }
  return { current: undefined, next: undefined, previous };
}

/** Derived, idempotent — tags each of today's items upcoming/current/done from the real clock. */
export function markLiveProgress(plan: DajeongPlan, nowClock: string, dayNumber = 1): DajeongPlan {
  const nowMin = clockToMinutes(nowClock);
  const items = plan.items.map((item) => {
    if ((item.dayNumber ?? 1) !== dayNumber || item.liveState === "skipped" || item.liveState === "done") return item;
    const start = clockToMinutes(item.time);
    const end = start + item.durationMinutes;
    if (nowMin >= end) return { ...item, liveState: "done" as const };
    if (nowMin >= start) return { ...item, liveState: "current" as const, actualStartTime: item.actualStartTime ?? item.time };
    return { ...item, liveState: "upcoming" as const };
  });
  return { ...plan, items };
}

function reservationReminder(plan: DajeongPlan, item: PlanItem): string | null {
  if (!item.reservationRequired) return null;
  const task = plan.execution?.tasks.find((entry) => entry.itemId === item.id);
  if (task && ["booked", "purchased", "completed"].includes(task.status)) return null;
  return `${item.title}은 예약 확인이 아직 안 끝났어 (${item.reality?.reservationLabel ?? "확인 필요"}).`;
}

export function buildLiveSnapshot(plan: DajeongPlan, nowClock: string = currentClock(), dayNumber: number = resolveDayNumber(plan)): LiveSnapshot {
  const marked = markLiveProgress(plan, nowClock, dayNumber);
  const dayItems = itemsForDay(marked, dayNumber);
  const { current, next } = resolveCurrentItem(marked, nowClock, dayNumber);
  const nowMin = clockToMinutes(nowClock);
  const runningLateMinutes = current ? Math.max(0, nowMin - (clockToMinutes(current.time) + current.durationMinutes)) : 0;
  const remaining = dayItems.filter((item) => item.liveState !== "done");
  const weatherDay = marked.schedule?.weather.days.find((day) => day.date === marked.situation.targetDate);
  const weatherNote = weatherDay && weatherDay.impact !== "low"
    ? `${weatherDay.impact === "high" ? "비·눈 영향이 커" : "날씨 변화가 있을 수 있어"} · ${marked.schedule?.weather.message ?? ""}`
    : marked.schedule?.weather.status === "user_report" ? marked.schedule.weather.message : undefined;
  const prepReminders = [
    next ? reservationReminder(marked, next) : null,
    next?.travelFromPrevious?.weatherExposure === "high" ? `${next.title}로 이동은 비·눈에 노출될 수 있어. 우산이나 여유 시간을 챙겨.` : null,
    current?.reality?.openNow === false ? `${current.title}은 지금 영업 종료로 표시돼. 현장에서 다시 확인해줘.` : null,
  ].filter((value): value is string => Boolean(value));
  return {
    nowClock,
    dayNumber,
    current,
    next,
    remaining,
    runningLateMinutes,
    weatherNote,
    prepReminders,
    allDone: dayItems.length > 0 && dayItems.every((item) => item.liveState === "done"),
  };
}

function diffAfterReschedule(before: DajeongPlan, after: DajeongPlan, anchorId: string): { removedTitles: string[]; shiftedTitles: string[] } {
  const beforeIds = new Set(before.items.map((item) => item.id));
  const afterIds = new Set(after.items.map((item) => item.id));
  const removedTitles = before.items.filter((item) => !afterIds.has(item.id)).map((item) => item.title);
  const shiftedTitles = after.items
    .filter((item) => item.id !== anchorId && beforeIds.has(item.id))
    .filter((item) => before.items.find((entry) => entry.id === item.id)?.time !== item.time)
    .map((item) => item.title);
  return { removedTitles, shiftedTitles };
}

function resolveTarget(plan: DajeongPlan, nowClock: string, dayNumber: number, itemId?: string): PlanItem | undefined {
  if (itemId) return plan.items.find((item) => item.id === itemId);
  const { current, previous, next } = resolveCurrentItem(plan, nowClock, dayNumber);
  // If the real clock sits before the day's first item (e.g. someone messages early, or a
  // server/client timezone mismatch), a "우리 아직 ~야" report almost always means the item
  // that's about to start — falling back to `next` beats refusing to guess at all.
  return current ?? previous ?? next;
}

export type DelayReportInput = { itemId?: string; nowClock?: string; extraMinutes?: number; reason: string };

/** "우리 아직 밥 먹고 있어" / "밥이 늦게 나와서" — stretch the item we're actually stuck in to cover real elapsed time, then let flexible items downstream absorb it; locked/booked items and unrelated earlier items are never touched. */
export function applyDelayReport(plan: DajeongPlan, input: DelayReportInput): LiveActionResult {
  const now = input.nowClock ?? currentClock();
  const dayNumber = resolveDayNumber(plan);
  const target = resolveTarget(plan, now, dayNumber, input.itemId);
  if (!target) return { plan, message: "지금 어떤 일정 이야기인지 정확히 못 짚었어. 장소 이름을 함께 말해줘.", changedItemIds: [] };
  const startMin = clockToMinutes(target.time);
  const nowMin = clockToMinutes(now);
  const elapsed = Math.max(0, nowMin - startMin);
  const newDuration = input.extraMinutes != null
    ? Math.min(target.durationMinutes + input.extraMinutes, target.durationMinutes + MAX_EXTENSION_MINUTES)
    : Math.max(target.durationMinutes, Math.min(elapsed + DELAY_TAIL_MINUTES, target.durationMinutes + MAX_EXTENSION_MINUTES));

  const marked = markLiveProgress(plan, now, dayNumber);
  let next = setItemDuration(marked, target.id, newDuration);
  next = { ...next, items: next.items.map((item) => item.id === target.id ? { ...item, liveState: "current" as const, actualStartTime: item.actualStartTime ?? target.time } : item) };

  const { removedTitles, shiftedTitles } = diffAfterReschedule(plan, next, target.id);
  const warnings = next.schedule?.warnings ?? [];
  const message = [
    `${target.title}이(가) 예정보다 늦어지는 걸 반영해서 지금 머무는 시간을 약 ${newDuration}분으로 다시 잡았어.`,
    shiftedTitles.length ? `이어서 ${shiftedTitles.join(", ")} 시작 시간을 뒤로 밀었어.` : null,
    removedTitles.length ? `그래도 시간이 부족해서 이번엔 ${removedTitles.join(", ")} 일정은 뺐어. 원하면 다시 넣거나 다른 날로 옮길 수 있어.` : null,
    !shiftedTitles.length && !removedTitles.length ? "다른 일정은 그대로 유지했어." : null,
    warnings.length ? warnings.join(" ") : null,
  ].filter(Boolean).join(" ");
  return { plan: next, message, changedItemIds: [target.id, ...removedTitles.length ? next.items.filter((i) => removedTitles.includes(i.title)).map((i) => i.id) : []] };
}

export type StayLongerInput = { itemId?: string; extraMinutes?: number; nowClock?: string; reason: string };

/** "여기 더 있고 싶어" — a wish, not a delay report; same cascading mechanics, different framing. */
export function applyStayLonger(plan: DajeongPlan, input: StayLongerInput): LiveActionResult {
  const now = input.nowClock ?? currentClock();
  const dayNumber = resolveDayNumber(plan);
  const target = resolveTarget(plan, now, dayNumber, input.itemId);
  if (!target) return { plan, message: "어떤 일정에 더 있고 싶은지 알려줘.", changedItemIds: [] };
  const extra = input.extraMinutes ?? DEFAULT_STAY_EXTRA_MINUTES;
  const newDuration = Math.min(target.durationMinutes + extra, target.durationMinutes + MAX_EXTENSION_MINUTES);
  const marked = markLiveProgress(plan, now, dayNumber);
  let next = setItemDuration(marked, target.id, newDuration);
  next = { ...next, items: next.items.map((item) => item.id === target.id ? { ...item, liveState: "current" as const, actualStartTime: item.actualStartTime ?? target.time } : item) };
  const { removedTitles, shiftedTitles } = diffAfterReschedule(plan, next, target.id);
  const message = [
    `${target.title}에서 ${extra}분 더 머무는 걸로 바꿨어.`,
    shiftedTitles.length ? `${shiftedTitles.join(", ")}은 뒤로 조금씩 밀렸어.` : "다른 일정 시간은 그대로야.",
    removedTitles.length ? `${removedTitles.join(", ")}은 시간이 부족해서 이번엔 뺐어.` : null,
  ].filter(Boolean).join(" ");
  return { plan: next, message, changedItemIds: [target.id] };
}

export type LeaveEarlyInput = { nowClock?: string; reason: string; wrapMinutes?: number };

/** "집에 좀 일찍 갈래" — pull the day's end time toward now; low-priority remaining items shrink or drop, done items untouched. */
export function applyLeaveEarly(plan: DajeongPlan, input: LeaveEarlyInput): LiveActionResult {
  const now = input.nowClock ?? currentClock();
  const dayNumber = resolveDayNumber(plan);
  const wrap = input.wrapMinutes ?? 40;
  const homeByTime = shiftClock(now, wrap);
  const marked = markLiveProgress(plan, now, dayNumber);
  const next = scheduleDajeongPlan({ ...marked, situation: { ...marked.situation, homeByTime } });
  const { removedTitles, shiftedTitles } = diffAfterReschedule(plan, next, "");
  const message = [
    `오늘은 ${homeByTime}쯤 마무리하는 걸로 맞췄어.`,
    removedTitles.length ? `남은 일정 중 ${removedTitles.join(", ")}은 이번엔 빼기로 했어.` : null,
    shiftedTitles.length ? `${shiftedTitles.join(", ")}은 앞당겨서 할게.` : null,
    next.schedule?.estimatedHomeArrival ? `예상 귀가는 ${next.schedule.estimatedHomeArrival}쯤이야.` : null,
  ].filter(Boolean).join(" ");
  return { plan: next, message, changedItemIds: next.items.map((item) => item.id) };
}

const TRANSPORT_WORD: Array<[RegExp, "car" | "public_transit" | "walking"]> = [
  [/택시|차\s*타/, "car"],
  [/버스|지하철|대중교통|전철/, "public_transit"],
  [/걸어서|도보로|걸어\s*가/, "walking"],
];

function detectTransportWord(instruction: string): "car" | "public_transit" | "walking" | undefined {
  return TRANSPORT_WORD.find(([pattern]) => pattern.test(instruction))?.[1];
}

const TRANSPORT_LABEL: Record<"car" | "public_transit" | "walking", string> = { car: "차량/택시", public_transit: "대중교통", walking: "도보" };

/** Only fires on explicitly scoped phrasing ("여기서 다음 데까지만", "남은 건 다", "돌아갈 때만") —
 * an unscoped "택시 타자" is left to the whole-plan transport update it already was. */
export const SEGMENT_TRANSPORT_PATTERN = /(까지만|구간만|이동만|여기서\s*다음|다음\s*(?:데|곳|장소)까지)|(남은\s*(?:건|거|일정)\s*다|이후는\s*다|나머지\s*(?:는|다))|(돌아갈\s*때만|집\s*갈\s*때만|귀가할\s*때만)/;

export type SegmentTransportInput = { nowClock?: string; reason: string };

export function applySegmentTransport(plan: DajeongPlan, input: SegmentTransportInput): LiveActionResult {
  const mode = detectTransportWord(input.reason);
  if (!mode) return { plan, message: "어떤 이동수단으로 바꿀지 정확히 못 들었어. 택시·대중교통·도보처럼 말해줘.", changedItemIds: [] };
  const now = input.nowClock ?? currentClock();
  const dayNumber = resolveDayNumber(plan);
  const dayItems = itemsForDay(plan, dayNumber);
  const { current, next } = resolveCurrentItem(plan, now, dayNumber);

  if (/돌아갈\s*때만|집\s*갈\s*때만|귀가할\s*때만/.test(input.reason)) {
    const nextPlan = { ...plan, situation: { ...plan.situation, homeTransportOverride: mode } };
    return { plan: nextPlan, message: `귀가할 때는 ${TRANSPORT_LABEL[mode]}(으)로 반영했어. 나머지 이동수단은 그대로야.`, changedItemIds: [] };
  }

  const scopeAll = /남은\s*(?:건|거|일정)\s*다|이후는\s*다|나머지\s*(?:는|다)/.test(input.reason);
  const anchor = current ?? next;
  if (!anchor) return { plan, message: "지금부터 어느 구간을 바꿀지 정확히 못 짚었어.", changedItemIds: [] };
  const anchorIndex = dayItems.findIndex((item) => item.id === anchor.id);
  const targets = scopeAll ? dayItems.slice(Math.max(0, anchorIndex + (current ? 1 : 0))) : next ? [next] : [];
  if (!targets.length) return { plan, message: "바꿀 다음 이동 구간을 찾지 못했어.", changedItemIds: [] };

  const targetIds = new Set(targets.map((item) => item.id));
  const withOverride = { ...plan, items: plan.items.map((item) => targetIds.has(item.id) ? { ...item, segmentTransportOverride: mode } : item) };
  const next2 = scheduleDajeongPlan(withOverride);
  const message = scopeAll
    ? `지금부터 남은 이동은 ${TRANSPORT_LABEL[mode]}(으)로 바꿨어. 이미 지난 구간과 앞서 정한 전체 이동수단은 그대로야.`
    : `${targets[0].title} 가는 길만 ${TRANSPORT_LABEL[mode]}(으)로 바꿨어. 나머지 구간은 그대로야.`;
  return { plan: next2, message, changedItemIds: targets.map((item) => item.id) };
}

export type SkipNextInput = { itemId?: string; nowClock?: string; reason: string };

/** "다음 거 그냥 빼자" — explicit removal request, still refuses to drop anything the user locked. */
export function applySkipNext(plan: DajeongPlan, input: SkipNextInput): LiveActionResult {
  const now = input.nowClock ?? currentClock();
  const dayNumber = resolveDayNumber(plan);
  const marked = markLiveProgress(plan, now, dayNumber);
  const target = input.itemId ? marked.items.find((item) => item.id === input.itemId) : resolveCurrentItem(marked, now, dayNumber).next;
  if (!target) return { plan: marked, message: "뺄 다음 일정을 찾지 못했어. 장소 이름으로 말해줘.", changedItemIds: [] };
  if (target.placeLocked) return { plan: marked, message: `${target.title}은 꼭 유지하기로 고정한 일정이라 그대로 두었어. 먼저 고정을 해제하면 뺄 수 있어.`, changedItemIds: [] };
  const next = scheduleDajeongPlan({ ...marked, items: marked.items.filter((item) => item.id !== target.id) });
  return { plan: next, message: `${target.title} 일정은 빼고 남은 시간표를 다시 맞췄어.`, changedItemIds: [target.id] };
}
