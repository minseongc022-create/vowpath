import { buildExperienceFlow } from "./experience";
import { haversineKm, travelMinutes } from "./place-utils";
import type { DajeongPlan, PlanCategory, PlanItem, ScheduleDensity, WeatherContext, WeatherDay } from "./types";

type ScheduleOptions = {
  preserveOrder?: boolean;
  applyWeatherReordering?: boolean;
};

const DEFAULT_DURATION: Record<PlanCategory, [number, number, number]> = {
  activity: [60, 90, 120],
  cafe: [40, 70, 100],
  meal: [60, 80, 110],
  view: [35, 55, 80],
  lodging: [25, 40, 60],
  cake: [15, 25, 40],
  flower: [15, 25, 40],
  gift: [20, 35, 55],
  moment: [10, 20, 35],
};

const REMOVAL_PRIORITY: Record<PlanCategory, number> = {
  gift: 1,
  cafe: 2,
  moment: 3,
  activity: 4,
  view: 5,
  cake: 6,
  flower: 7,
  meal: 8,
  lodging: 9,
};

export function clockToMinutes(value?: string): number {
  const [hour, minute] = (value ?? "00:00").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return Math.max(0, Math.min(24 * 60 - 1, hour * 60 + minute));
}

export function minutesToClock(total: number): string {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function shiftClock(value: string, minutes: number): string {
  return minutesToClock(clockToMinutes(value) + minutes);
}

function dateForDay(startDate: string, dayNumber: number): string {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + Math.max(0, dayNumber - 1));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function durationRange(item: PlanItem): NonNullable<PlanItem["durationRange"]> {
  if (item.durationRange?.source === "user") return item.durationRange;
  let [minimumMinutes, recommendedMinutes, leisurelyMinutes] = DEFAULT_DURATION[item.category];
  const description = `${item.title} ${item.subtitle} ${item.notes.join(" ")}`;
  if (item.category === "meal" && /코스|오마카세|파인다이닝|다이닝/.test(description)) [minimumMinutes, recommendedMinutes, leisurelyMinutes] = [90, 120, 150];
  if (item.category === "activity" && /소품샵|편집샵|독립서점|팝업/.test(description)) [minimumMinutes, recommendedMinutes, leisurelyMinutes] = [25, 45, 70];
  if (item.category === "activity" && /전시|미술관|박물관|미디어아트/.test(description)) [minimumMinutes, recommendedMinutes, leisurelyMinutes] = [60, 90, 120];
  if (item.durationMinutes > 0 && item.durationMinutes !== DEFAULT_DURATION[item.category][1]) {
    recommendedMinutes = Math.max(minimumMinutes, item.durationMinutes);
    leisurelyMinutes = Math.max(leisurelyMinutes, recommendedMinutes + 25);
  }
  return { minimumMinutes, recommendedMinutes, leisurelyMinutes, source: item.reality?.source && item.reality.source !== "curated" ? "place" : "category" };
}

function durationFor(range: NonNullable<PlanItem["durationRange"]>, density: ScheduleDensity, conditionLow: boolean): number {
  if (range.source === "user") return range.recommendedMinutes;
  if (conditionLow || density === "relaxed") return range.leisurelyMinutes;
  if (density === "compact") return Math.max(range.minimumMinutes, range.recommendedMinutes - 15);
  return range.recommendedMinutes;
}

function defaultBuffer(density: ScheduleDensity, conditionLow: boolean): number {
  if (conditionLow) return 25;
  return density === "compact" ? 10 : density === "relaxed" ? 25 : 15;
}

function defaultHomeTravel(plan: DajeongPlan): number {
  if (plan.situation.homeTravelMinutes != null) return plan.situation.homeTravelMinutes;
  if (plan.situation.transport === "car") return 30;
  if (plan.situation.transport === "walking") return 20;
  return 45;
}

function dayWindow(plan: DajeongPlan, dayNumber: number): { dayNumber: number; startTime: string; endTime: string; source: "availability" | "travel" | "default" } {
  if (plan.situation.planScope !== "trip") {
    const homeTravel = plan.situation.homeByTime ? defaultHomeTravel(plan) : 0;
    const homeLimit = plan.situation.homeByTime ? shiftClock(plan.situation.homeByTime, -homeTravel) : undefined;
    const endTime = homeLimit && (!plan.situation.availabilityEndTime || clockToMinutes(homeLimit) < clockToMinutes(plan.situation.availabilityEndTime))
      ? homeLimit
      : plan.situation.availabilityEndTime ?? "22:00";
    return { dayNumber: 1, startTime: plan.situation.startTime, endTime, source: plan.situation.availabilityEndTime || plan.situation.homeByTime ? "availability" : "default" };
  }
  const lastDay = Math.max(1, plan.situation.tripDays ?? 1);
  if (dayNumber === 1) {
    const start = plan.situation.arrivalTime ? shiftClock(plan.situation.arrivalTime, plan.situation.transport === "car" ? 60 : 45) : "10:00";
    return { dayNumber, startTime: start, endTime: "22:00", source: plan.situation.arrivalTime ? "travel" : "default" };
  }
  if (dayNumber === lastDay && plan.situation.returnDepartureTime) {
    const margin = plan.situation.transport === "car" ? 120 : 90;
    return { dayNumber, startTime: "09:00", endTime: shiftClock(plan.situation.returnDepartureTime, -margin), source: "travel" };
  }
  return { dayNumber, startTime: "09:30", endTime: "22:00", source: "default" };
}

function weatherForDay(plan: DajeongPlan, dayNumber: number): WeatherDay | undefined {
  return plan.schedule?.weather.days.find((day) => day.date === dateForDay(plan.situation.targetDate, dayNumber));
}

function isWetWeather(plan: DajeongPlan, dayNumber: number): boolean {
  const weather = weatherForDay(plan, dayNumber);
  return weather?.impact === "high" || (weather?.precipitationProbabilityMax ?? 0) >= 60 || plan.schedule?.weather.status === "user_report";
}

function coordinates(item?: PlanItem) {
  return item?.reality?.latitude != null && item.reality.longitude != null
    ? { latitude: item.reality.latitude, longitude: item.reality.longitude }
    : undefined;
}

function travelProfile(plan: DajeongPlan, previous: PlanItem | undefined, item: PlanItem): NonNullable<PlanItem["travelFromPrevious"]> | undefined {
  if (!previous || (previous.dayNumber ?? 1) !== (item.dayNumber ?? 1)) return undefined;
  const distance = haversineKm(coordinates(previous), coordinates(item));
  const minutes = travelMinutes(distance, plan.situation.transport) ?? item.travelFromPrevious?.minutes ?? (plan.situation.transport === "car" ? 18 : plan.situation.transport === "walking" ? 14 : 20);
  const walkingMinutes = plan.situation.transport === "walking" ? minutes : plan.situation.transport === "public_transit" ? Math.min(22, Math.max(6, Math.round(minutes * 0.4))) : Math.min(10, Math.round(minutes * 0.2));
  const transfers = plan.situation.transport === "public_transit" ? (minutes >= 35 ? 2 : minutes >= 16 ? 1 : 0) : 0;
  const wet = isWetWeather(plan, item.dayNumber ?? 1);
  const weatherExposure = plan.schedule?.weather.status === "unavailable" || plan.schedule?.weather.status === "outside_forecast"
    ? "unknown"
    : wet && walkingMinutes >= 12 ? "high" : wet && walkingMinutes >= 6 ? "medium" : "low";
  const fatigueScore = walkingMinutes / 10 + transfers * 0.8 + (plan.situation.transport === "car" ? 0.5 : 0) + (weatherExposure === "high" ? 1.4 : weatherExposure === "medium" ? 0.6 : 0);
  const fatigue = fatigueScore >= 2.7 ? "high" : fatigueScore >= 1.4 ? "medium" : "low";
  const mode = plan.situation.transport === "car" ? "차량" : plan.situation.transport === "walking" ? "도보" : "대중교통";
  const evidence = item.reality?.travelEstimateBasis === "route" ? "실제 경로 기준" : distance != null ? "직선거리 기반 예상" : "교통수단별 기본 예상";
  const weatherNote = weatherExposure === "high" ? " · 날씨 노출이 커 이동이 피곤할 수 있음" : transfers >= 2 ? " · 환승 2회 예상" : "";
  return { minutes, mode, note: `${evidence}${weatherNote}`, walkingMinutes, transfers, fatigue, weatherExposure };
}

function strongLock(plan: DajeongPlan, item: PlanItem): boolean {
  const execution = plan.execution?.tasks.find((task) => task.itemId === item.id);
  return Boolean(item.timeLocked || execution?.confirmation || ["booked", "purchased", "completed"].includes(execution?.status ?? ""));
}

function reassignForWeather(plan: DajeongPlan, items: PlanItem[]): PlanItem[] {
  if (plan.situation.planScope !== "trip" || plan.schedule?.weather.status !== "verified") return items;
  const days = plan.schedule.weather.days.filter((day) => day.date >= plan.situation.targetDate);
  if (days.length < 2) return items;
  const worst = [...days].sort((a, b) => (b.impact === "high" ? 2 : b.impact === "medium" ? 1 : 0) - (a.impact === "high" ? 2 : a.impact === "medium" ? 1 : 0))[0];
  const best = [...days].sort((a, b) => (a.impact === "high" ? 2 : a.impact === "medium" ? 1 : 0) - (b.impact === "high" ? 2 : b.impact === "medium" ? 1 : 0))[0];
  if (!worst || !best || worst.date === best.date || worst.impact === best.impact) return items;
  const worstDay = Math.round((new Date(`${worst.date}T12:00:00`).getTime() - new Date(`${plan.situation.targetDate}T12:00:00`).getTime()) / 86_400_000) + 1;
  const bestDay = Math.round((new Date(`${best.date}T12:00:00`).getTime() - new Date(`${plan.situation.targetDate}T12:00:00`).getTime()) / 86_400_000) + 1;
  const outdoor = items.find((item) => item.dayNumber === worstDay && item.venueType === "outdoor" && !item.placeLocked && !strongLock(plan, item) && item.liveState !== "done");
  const indoor = items.find((item) => item.dayNumber === bestDay && item.venueType === "indoor" && !item.placeLocked && !strongLock(plan, item) && !["lodging", "meal"].includes(item.category) && item.liveState !== "done");
  if (!outdoor || !indoor) return items;
  return items.map((item) => item.id === outdoor.id
    ? { ...item, dayNumber: bestDay, time: indoor.time }
    : item.id === indoor.id ? { ...item, dayNumber: worstDay, time: outdoor.time } : item);
}

function fitDurations(items: PlanItem[], windowMinutes: number, density: ScheduleDensity, conditionLow: boolean): PlanItem[] {
  let prepared = items.map((item) => {
    const range = durationRange(item);
    return { ...item, durationRange: range, durationMinutes: durationFor(range, density, conditionLow), bufferAfterMinutes: item.bufferAfterMinutes ?? defaultBuffer(density, conditionLow) };
  });
  const cost = () => prepared.reduce((sum, item, index) => sum + item.durationMinutes + (index < prepared.length - 1 ? (item.bufferAfterMinutes ?? 0) + (prepared[index + 1].travelFromPrevious?.minutes ?? 20) : 0), 0);
  if (cost() <= windowMinutes) return prepared;
  prepared = prepared.map((item) => item.durationRange?.source === "user" || item.timeLocked
    ? item
    : { ...item, durationMinutes: item.durationRange?.minimumMinutes ?? item.durationMinutes });
  while (prepared.length > 1 && cost() > windowMinutes) {
    const removable = prepared
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.placeLocked && !item.timeLocked && !["meal", "lodging"].includes(item.category))
      .sort((a, b) => REMOVAL_PRIORITY[a.item.category] - REMOVAL_PRIORITY[b.item.category])[0];
    if (!removable) break;
    prepared = prepared.filter((_, index) => index !== removable.index);
  }
  return prepared;
}

function emptyWeather(existing?: WeatherContext): WeatherContext {
  return existing ?? { status: "unavailable", sourceLabel: "날씨 데이터 미연결", days: [], message: "실제 예보를 확인하지 못해 날씨를 확정 조건으로 사용하지 않았어요." };
}

export function scheduleDajeongPlan(plan: DajeongPlan, options: ScheduleOptions = {}): DajeongPlan {
  const density = plan.situation.temporaryCondition.energy === "low" ? "relaxed" : plan.situation.scheduleDensity;
  const conditionLow = plan.situation.temporaryCondition.energy === "low" || plan.situation.temporaryCondition.walkingLimited;
  const seeded: DajeongPlan = { ...plan, schedule: { density, dayWindows: [], estimatedEndTime: plan.situation.startTime, homeTravelMinutes: plan.situation.homeByTime ? defaultHomeTravel(plan) : undefined, reserveRatio: plan.situation.budgetUsage === "full" ? 1 : 0.9, warnings: [], weather: emptyWeather(plan.schedule?.weather) } };
  let items = options.applyWeatherReordering === false ? [...plan.items] : reassignForWeather(seeded, [...plan.items]);
  items = [...items].sort((a, b) => (a.dayNumber ?? 1) - (b.dayNumber ?? 1) || clockToMinutes(a.time) - clockToMinutes(b.time));
  const dayNumbers = Array.from(new Set(items.map((item) => item.dayNumber ?? 1)));
  const scheduled: PlanItem[] = [];
  const warnings: string[] = [];
  const windows = dayNumbers.map((dayNumber) => dayWindow(seeded, dayNumber));
  for (const window of windows) {
    const originals = items.filter((item) => (item.dayNumber ?? 1) === window.dayNumber);
    // Items already lived through (liveState "done") are frozen history: they keep their
    // real time/duration untouched, and only the remaining items are re-flowed forward from
    // wherever the day actually stands right now. Without this split, a day-of delay report
    // would retroactively reshuffle things that already happened.
    const doneItems = originals.filter((item) => item.liveState === "done");
    const activeOriginals = originals.filter((item) => item.liveState !== "done");
    const lastDone = doneItems.at(-1);
    const withTravel = activeOriginals.map((item, index) => ({ ...item, travelFromPrevious: travelProfile(seeded, index === 0 ? lastDone : activeOriginals[index - 1], item) }));
    const windowStartMinutes = lastDone
      ? Math.max(clockToMinutes(window.startTime), clockToMinutes(lastDone.endTime ?? lastDone.time))
      : clockToMinutes(window.startTime);
    const fitted = fitDurations(withTravel, Math.max(60, clockToMinutes(window.endTime) - windowStartMinutes), density, conditionLow);
    scheduled.push(...doneItems);
    let cursor = windowStartMinutes;
    let previousItem: PlanItem | undefined = lastDone;
    fitted.forEach((item) => {
      const travel = previousItem ? item.travelFromPrevious?.minutes ?? 0 : 0;
      const earliest = cursor + (previousItem ? (previousItem.bufferAfterMinutes ?? 0) + travel : 0);
      let start = earliest;
      if (strongLock(seeded, item)) {
        const locked = clockToMinutes(item.time);
        if (locked < earliest) warnings.push(`${item.title}의 고정 시간과 앞 일정이 ${earliest - locked}분 충돌해 확인이 필요해요.`);
        start = locked;
      }
      if (!strongLock(seeded, item) && ["meal", "view", "lodging"].includes(item.category) && clockToMinutes(item.time) > start) start = clockToMinutes(item.time);
      if (item.category === "meal" && start < 17 * 60 && previousItem && clockToMinutes(item.time) >= 17 * 60) start = Math.max(start, clockToMinutes(seeded.situation.preferredTime));
      const end = start + item.durationMinutes;
      const scheduledItem = { ...item, time: minutesToClock(start), endTime: minutesToClock(end) };
      scheduled.push(scheduledItem);
      cursor = end;
      previousItem = scheduledItem;
    });
    if (cursor > clockToMinutes(window.endTime)) warnings.push(`${window.dayNumber}일차가 가용시간을 ${cursor - clockToMinutes(window.endTime)}분 넘겨 조정이 필요해요.`);
    const lateMeal = scheduled.find((item) => item.dayNumber === window.dayNumber && item.category === "meal" && clockToMinutes(item.time) > 20 * 60);
    if (lateMeal) warnings.push(`${lateMeal.title} 식사가 ${lateMeal.time}에 시작해 늦을 수 있어요.`);
    scheduled.filter((item) => item.dayNumber === window.dayNumber && item.travelFromPrevious?.weatherExposure === "high")
      .forEach((item) => warnings.push(`${item.title} 이동은 비·눈 노출과 도보 시간을 다시 확인해야 해요.`));
  }
  const total = scheduled.reduce((sum, item) => sum + item.price, 0);
  const last = scheduled.at(-1);
  const estimatedEndTime = last?.endTime ?? plan.situation.startTime;
  const homeTravel = plan.situation.homeByTime ? defaultHomeTravel(plan) : undefined;
  const estimatedHomeArrival = homeTravel != null ? shiftClock(estimatedEndTime, homeTravel) : undefined;
  if (plan.situation.homeByTime && estimatedHomeArrival && clockToMinutes(estimatedHomeArrival) > clockToMinutes(plan.situation.homeByTime)) warnings.push(`예상 귀가가 ${estimatedHomeArrival}라 ${plan.situation.homeByTime} 귀가 조건을 넘겨요.`);
  return {
    ...plan,
    items: scheduled,
    subtotal: total,
    total,
    reserve: Math.max(0, plan.budget - total),
    budgetRemaining: plan.budget - total,
    experienceFlow: buildExperienceFlow(scheduled),
    schedule: { ...seeded.schedule!, dayWindows: windows, estimatedEndTime, estimatedHomeArrival, warnings: Array.from(new Set(warnings)) },
  };
}

export function lockPlanItem(plan: DajeongPlan, itemId: string, lock: "place" | "time" | "both", reason: string): DajeongPlan {
  return scheduleDajeongPlan({
    ...plan,
    items: plan.items.map((item) => item.id === itemId ? { ...item, placeLocked: lock !== "time" || item.placeLocked, timeLocked: lock !== "place" || item.timeLocked, lockReason: reason } : item),
  });
}

export function setItemDuration(plan: DajeongPlan, itemId: string, minutes: number, bufferAfterMinutes?: number): DajeongPlan {
  const safe = Math.max(10, Math.min(240, Math.round(minutes)));
  return scheduleDajeongPlan({
    ...plan,
    items: plan.items.map((item) => item.id === itemId ? {
      ...item,
      durationMinutes: safe,
      durationRange: { minimumMinutes: Math.min(item.durationRange?.minimumMinutes ?? safe, safe), recommendedMinutes: safe, leisurelyMinutes: Math.max(safe, item.durationRange?.leisurelyMinutes ?? safe), source: "user" },
      bufferAfterMinutes: bufferAfterMinutes ?? item.bufferAfterMinutes,
    } : item),
  });
}

export function weatherContextFromUser(message: string): WeatherContext {
  return { status: "user_report", sourceLabel: "사용자 제공 정보", checkedAt: new Date().toISOString(), days: [], message: `사용자가 “${message.slice(0, 80)}”라고 알려줬어요. 실제 강수 시간과 강도는 아직 외부 예보로 확인하지 않았습니다.` };
}
