import { clockToMinutes, minutesToClock, scheduleDajeongPlan, shiftClock } from "./schedule-engine";
import type { DajeongPlan, LiveDayState, PlanItem } from "./types";

export type LiveDaySnapshot = {
  date: string;
  nowTime: string;
  current?: PlanItem;
  next?: PlanItem;
  remaining: PlanItem[];
  delayMinutes: number;
  nextTravelMinutes?: number;
  fixedUpcoming: PlanItem[];
};

function localDate(now: Date): string {
  const offset = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offset.toISOString().slice(0, 10);
}

function localClock(now: Date): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function dateForDay(startDate: string, dayNumber: number): string {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + dayNumber - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function itemsForDate(plan: DajeongPlan, date: string): PlanItem[] {
  return plan.items.filter((item) => dateForDay(plan.situation.targetDate, item.dayNumber ?? 1) === date).sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time));
}

function isStrong(plan: DajeongPlan, item: PlanItem): boolean {
  const task = plan.execution?.tasks.find((entry) => entry.itemId === item.id);
  return Boolean(item.timeLocked || item.placeLocked || task?.confirmation || ["booked", "purchased", "completed"].includes(task?.status ?? ""));
}

export function liveDaySnapshot(plan: DajeongPlan, now = new Date()): LiveDaySnapshot {
  const date = localDate(now);
  const nowTime = localClock(now);
  const today = itemsForDate(plan, date);
  const progress = new Map(plan.liveDay?.itemProgress.map((entry) => [entry.itemId, entry]) ?? []);
  const explicitCurrent = plan.liveDay?.currentItemId ? today.find((item) => item.id === plan.liveDay?.currentItemId) : undefined;
  const current = explicitCurrent ?? today.find((item) => {
    const state = progress.get(item.id)?.state;
    return state === "current" || (state !== "done" && state !== "skipped" && clockToMinutes(item.time) <= clockToMinutes(nowTime) && clockToMinutes(item.endTime ?? shiftClock(item.time, item.durationMinutes)) > clockToMinutes(nowTime));
  });
  const remaining = today.filter((item) => {
    const state = progress.get(item.id)?.state;
    return state !== "done" && state !== "skipped" && (!current || item.id !== current.id) && clockToMinutes(item.time) >= clockToMinutes(current?.time ?? nowTime);
  });
  const next = remaining.find((item) => clockToMinutes(item.time) >= clockToMinutes(current?.time ?? nowTime));
  return {
    date,
    nowTime,
    current,
    next,
    remaining,
    delayMinutes: plan.liveDay?.delayMinutes ?? 0,
    nextTravelMinutes: next?.travelFromPrevious?.minutes,
    fixedUpcoming: remaining.filter((item) => isStrong(plan, item)),
  };
}

export function activateLiveDay(plan: DajeongPlan, now = new Date()): DajeongPlan {
  const snapshot = liveDaySnapshot(plan, now);
  const currentItemId = snapshot.current?.id ?? snapshot.next?.id;
  const liveDay: LiveDayState = {
    mode: "active",
    activeDate: snapshot.date,
    currentItemId,
    delayMinutes: plan.liveDay?.delayMinutes ?? 0,
    lastUpdatedAt: now.toISOString(),
    lastKnownLocation: snapshot.current?.location ?? plan.liveDay?.lastKnownLocation,
    itemProgress: plan.items.map((item) => {
      const existing = plan.liveDay?.itemProgress.find((entry) => entry.itemId === item.id);
      const state = item.id === currentItemId ? "current" : existing?.state ?? (clockToMinutes(item.endTime ?? shiftClock(item.time, item.durationMinutes)) < clockToMinutes(snapshot.nowTime) && (item.dayNumber ?? 1) === (snapshot.current?.dayNumber ?? 1) ? "done" : "upcoming");
      return { itemId: item.id, state, delayMinutes: existing?.delayMinutes ?? 0, actualStart: existing?.actualStart, actualEnd: existing?.actualEnd };
    }),
  };
  return { ...plan, updatedAt: now.toISOString(), liveDay };
}

function cascadeDelay(plan: DajeongPlan, current: PlanItem, delayMinutes: number, now: Date): DajeongPlan {
  const day = current.dayNumber ?? 1;
  const nowMinutes = clockToMinutes(localClock(now));
  const originalEnd = clockToMinutes(current.endTime ?? shiftClock(current.time, current.durationMinutes));
  const extendedEnd = Math.max(originalEnd + delayMinutes, nowMinutes + 15);
  let cursor = extendedEnd;
  const warnings = [...(plan.schedule?.warnings ?? [])];
  const items = plan.items.map((item) => {
    if (item.id === current.id) {
      const duration = Math.max(item.durationMinutes, extendedEnd - clockToMinutes(item.time));
      return { ...item, durationMinutes: duration, endTime: minutesToClock(extendedEnd), durationRange: { minimumMinutes: Math.min(item.durationRange?.minimumMinutes ?? duration, duration), recommendedMinutes: duration, leisurelyMinutes: Math.max(duration, item.durationRange?.leisurelyMinutes ?? duration), source: "user" as const } };
    }
    if ((item.dayNumber ?? 1) !== day || clockToMinutes(item.time) <= clockToMinutes(current.time)) return item;
    const travel = item.travelFromPrevious?.minutes ?? 0;
    const earliest = cursor + (plan.items.find((entry) => entry.id === current.id)?.bufferAfterMinutes ?? 0) + travel;
    if (isStrong(plan, item)) {
      if (clockToMinutes(item.time) < earliest) warnings.push(`${item.title}은 고정된 ${item.time} 일정이라 앞 일정과 충돌할 수 있어요. 삭제하지 않고 확인 대상으로 남겼어요.`);
      cursor = clockToMinutes(item.endTime ?? shiftClock(item.time, item.durationMinutes));
      return item;
    }
    const start = Math.max(clockToMinutes(item.time), earliest);
    const duration = Math.max(item.durationRange?.minimumMinutes ?? 10, item.durationMinutes);
    cursor = start + duration;
    return { ...item, time: minutesToClock(start), endTime: minutesToClock(cursor) };
  });
  const last = [...items].filter((item) => (item.dayNumber ?? 1) === day).at(-1);
  const estimatedEndTime = last?.endTime ?? plan.schedule?.estimatedEndTime ?? current.endTime ?? current.time;
  const home = plan.schedule?.homeTravelMinutes != null ? shiftClock(estimatedEndTime, plan.schedule.homeTravelMinutes) : plan.schedule?.estimatedHomeArrival;
  return {
    ...plan,
    items,
    updatedAt: now.toISOString(),
    schedule: plan.schedule ? { ...plan.schedule, estimatedEndTime, estimatedHomeArrival: home, warnings: [...new Set(warnings)] } : plan.schedule,
    liveDay: {
      ...(activateLiveDay(plan, now).liveDay!),
      currentItemId: current.id,
      delayMinutes: (plan.liveDay?.delayMinutes ?? 0) + delayMinutes,
      lastUpdatedAt: now.toISOString(),
      itemProgress: (activateLiveDay(plan, now).liveDay?.itemProgress ?? []).map((entry) => entry.itemId === current.id ? { ...entry, state: "current", delayMinutes: entry.delayMinutes + delayMinutes } : entry),
    },
  };
}

export type LiveDayInstructionResult = { handled: boolean; plan: DajeongPlan; message: string; changedItemIds: string[] };

export function applyLiveDayInstruction(plan: DajeongPlan, instruction: string, requestedItemId?: string, now = new Date()): LiveDayInstructionResult {
  const text = instruction.trim();
  const active = activateLiveDay(plan, now);
  const snapshot = liveDaySnapshot(active, now);
  const selected = requestedItemId ? active.items.find((item) => item.id === requestedItemId) : undefined;
  const current = selected ?? snapshot.current ?? snapshot.next;
  const explicitDelay = Number(text.match(/(\d{1,3})\s*분.{0,5}(늦|지연)/)?.[1]);
  if ((/아직.{0,10}(밥|식당|카페|여기)|늦게\s*나와|지연/.test(text) || explicitDelay) && current) {
    const delay = explicitDelay || Math.max(20, clockToMinutes(snapshot.nowTime) - clockToMinutes(current.endTime ?? current.time) + 20);
    const next = cascadeDelay(active, current, delay, now);
    const fixed = liveDaySnapshot(next, now).fixedUpcoming;
    return { handled: true, plan: next, message: `${current.title}에서 약 ${delay}분 지연된 것으로 반영해 이후 유동 일정만 뒤로 조정했어요.${fixed.length ? ` ${fixed.map((item) => `${item.time} ${item.title}`).join(", ")}은 고정 상태로 유지하고 충돌을 표시했어요.` : " 바로 다음 일정을 삭제하지는 않았어요."}`, changedItemIds: next.items.filter((item) => plan.items.find((old) => old.id === item.id)?.time !== item.time || item.id === current.id).map((item) => item.id) };
  }
  if (/여기.{0,5}더\s*있|더\s*있고\s*싶|오래\s*있고/.test(text) && current) {
    const next = cascadeDelay(active, current, 30, now);
    return { handled: true, plan: next, message: `${current.title} 체류를 30분 늘리고 이후 유동 일정만 다시 맞췄어요. 고정 일정은 그대로 유지합니다.`, changedItemIds: [current.id, ...snapshot.remaining.filter((item) => !isStrong(active, item)).map((item) => item.id)] };
  }
  if (/카페.{0,8}(안\s*가|빼|패스)|다음\s*(거|일정).{0,5}(빼|안\s*가)|그냥\s*빼자/.test(text)) {
    const target = /카페/.test(text) ? active.items.find((item) => item.category === "cafe" && snapshot.remaining.some((entry) => entry.id === item.id)) : snapshot.next;
    if (target && !isStrong(active, target)) {
      const next = scheduleDajeongPlan({ ...active, items: active.items.filter((item) => item.id !== target.id) });
      return { handled: true, plan: activateLiveDay(next, now), message: `${target.title}을 남은 일정에서 빼고 이후 시간과 귀가 예상시간을 다시 계산했어요.`, changedItemIds: [target.id] };
    }
  }
  if (/집에.{0,8}일찍|일찍\s*갈래|귀가.{0,5}당겨/.test(text)) {
    const existing = active.situation.homeByTime ?? active.schedule?.estimatedHomeArrival ?? shiftClock(snapshot.nowTime, 180);
    const homeByTime = shiftClock(existing, -60);
    let next = scheduleDajeongPlan({ ...active, situation: { ...active.situation, homeByTime } });
    const priority: Record<PlanItem["category"], number> = { gift: 1, cafe: 2, moment: 3, activity: 4, view: 5, cake: 6, flower: 7, meal: 8, lodging: 9 };
    while (next.schedule?.estimatedHomeArrival && clockToMinutes(next.schedule.estimatedHomeArrival) > clockToMinutes(homeByTime)) {
      const removable = next.items
        .filter((item) => clockToMinutes(item.time) >= clockToMinutes(snapshot.nowTime) && !isStrong(next, item) && !["meal", "lodging"].includes(item.category))
        .sort((a, b) => priority[a.category] - priority[b.category])[0];
      if (!removable) break;
      next = scheduleDajeongPlan({ ...next, items: next.items.filter((item) => item.id !== removable.id) });
    }
    return { handled: true, plan: activateLiveDay(next, now), message: `귀가 목표를 ${homeByTime}로 한 시간 당기고, 고정 일정은 보호하면서 중요도가 낮은 남은 일정부터 조정했어요.`, changedItemIds: next.items.filter((item) => !active.items.some((old) => old.id === item.id) || active.items.find((old) => old.id === item.id)?.time !== item.time).map((item) => item.id) };
  }
  if (/택시\s*타|택시로/.test(text)) {
    const next = scheduleDajeongPlan({ ...active, situation: { ...active.situation, transport: "car", temporaryCondition: { ...active.situation.temporaryCondition, notes: [...new Set([...active.situation.temporaryCondition.notes, "당일 택시 이동"])] } } });
    return { handled: true, plan: activateLiveDay(next, now), message: "남은 이동을 택시 기준으로 바꾸고 이동시간과 피로도를 다시 계산했어요.", changedItemIds: snapshot.remaining.map((item) => item.id) };
  }
  return { handled: false, plan: active, message: "", changedItemIds: [] };
}
