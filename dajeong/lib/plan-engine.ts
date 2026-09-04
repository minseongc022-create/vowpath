import { getOptions } from "./catalog";
import { buildExperienceFlow, journeyRoleFor, MOOD_LABEL } from "./experience";
import { haversineKm, travelMinutes } from "./place-utils";
import { parseSituation } from "./situation";
import { reconcileReservationOrder, syncPrepReservations } from "./reservation-engine";
import { clockToMinutes, scheduleDajeongPlan } from "./schedule-engine";
import { createPrepOfferMessage, shouldOfferPrepCheck } from "./prep-engine";
import type { ConciergeMessage, DajeongPlan, ParsedSituation, PlanCategory, PlanItem, PlanLogisticsItem, PlanOption, PlanRequest, PlanRevisionResult, PlanVersion } from "./types";

const CATEGORY_LABEL: Record<PlanCategory, string> = {
  activity: "경험",
  cafe: "카페",
  meal: "저녁 식사",
  view: "야경",
  lodging: "숙소 체크인",
  cake: "케이크",
  flower: "꽃",
  gift: "선물",
  moment: "마음 한 조각",
};

const CATEGORY_OFFSET: Record<PlanCategory, number> = {
  activity: 0,
  cafe: 120,
  gift: 180,
  flower: 195,
  cake: 210,
  meal: 270,
  view: 390,
  lodging: 240,
  moment: 440,
};

const CATEGORY_TERMS: Array<[PlanCategory, RegExp]> = [
  ["meal", /식당|저녁|식사|밥/],
  ["cafe", /카페|커피|디저트/],
  ["activity", /전시|체험|활동|클래스|놀거리|첫 일정/],
  ["view", /야경|전망|마지막 일정|피날레/],
  ["lodging", /숙소|호텔|펜션|체크인|숙박/],
  ["cake", /케이크/],
  ["flower", /꽃|꽃다발/],
  ["gift", /선물/],
  ["moment", /편지|카드|마음/],
];

function planConversationMessage(role: ConciergeMessage["role"], text: string): ConciergeMessage {
  return {
    id: `conversation_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    status: "done",
    createdAt: new Date().toISOString(),
  };
}

export function appendPlanConversation(plan: DajeongPlan, userText: string, assistantText: string): DajeongPlan {
  return {
    ...plan,
    conversation: [
      ...(plan.conversation ?? []),
      planConversationMessage("user", userText),
      planConversationMessage("assistant", assistantText),
    ].slice(-30),
  };
}

/** A proactive assistant-only follow-up (no synthetic user turn) — e.g. the one-time prep check. */
export function appendAssistantNote(plan: DajeongPlan, assistantText: string): DajeongPlan {
  return { ...plan, conversation: [...(plan.conversation ?? []), planConversationMessage("assistant", assistantText)].slice(-30) };
}

function copyItems(items: PlanItem[]): PlanItem[] {
  return items.map((item) => ({
    ...item,
    alternatives: item.alternatives.map((option) => ({ ...option })),
    travelFromPrevious: item.travelFromPrevious ? { ...item.travelFromPrevious } : undefined,
    durationRange: item.durationRange ? { ...item.durationRange } : undefined,
  }));
}

function planVersion(plan: DajeongPlan, instruction: string, summary: string): PlanVersion {
  return {
    id: `version_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    instruction,
    summary,
    situation: { ...plan.situation },
    title: plan.title,
    summaryText: plan.summary,
    items: copyItems(plan.items),
    logistics: (plan.logistics ?? []).map((item) => ({ ...item })),
    subtotal: plan.subtotal,
    reserve: plan.reserve,
    total: plan.total,
    budget: plan.budget,
    budgetRemaining: plan.budgetRemaining,
    experienceFlow: plan.experienceFlow ? { ...plan.experienceFlow, labels: [...plan.experienceFlow.labels] } : undefined,
    discovery: plan.discovery ? { ...plan.discovery } : undefined,
    schedule: plan.schedule ? {
      ...plan.schedule,
      dayWindows: plan.schedule.dayWindows.map((window) => ({ ...window })),
      warnings: [...plan.schedule.warnings],
      weather: { ...plan.schedule.weather, days: plan.schedule.weather.days.map((day) => ({ ...day, hours: day.hours.map((hour) => ({ ...hour })) })) },
    } : undefined,
  };
}

export function appendPlanVersion(plan: DajeongPlan, instruction: string, summary: string): DajeongPlan {
  return {
    ...plan,
    versions: [...(plan.versions ?? []), planVersion(plan, instruction, summary)].slice(-16),
  };
}

export function initializePlanVersion(plan: DajeongPlan): DajeongPlan {
  return { ...plan, versions: [planVersion(plan, "처음 계획", "처음 만든 계획")] };
}

export function restorePlanVersion(plan: DajeongPlan, version: PlanVersion, instruction: string): DajeongPlan {
  const restored: DajeongPlan = {
    ...plan,
    situation: { ...version.situation },
    title: version.title,
    summary: version.summaryText,
    items: copyItems(version.items),
    logistics: version.logistics.map((item) => ({ ...item })),
    subtotal: version.subtotal,
    reserve: version.reserve,
    total: version.total,
    budget: version.budget,
    budgetRemaining: version.budgetRemaining,
    experienceFlow: version.experienceFlow ? { ...version.experienceFlow, labels: [...version.experienceFlow.labels] } : undefined,
    discovery: version.discovery ? { ...version.discovery } : undefined,
    schedule: version.schedule ? {
      ...version.schedule,
      dayWindows: version.schedule.dayWindows.map((window) => ({ ...window })),
      warnings: [...version.schedule.warnings],
      weather: { ...version.schedule.weather, days: version.schedule.weather.days.map((day) => ({ ...day, hours: day.hours.map((hour) => ({ ...hour })) })) },
    } : undefined,
    execution: undefined,
    status: "draft",
  };
  return appendPlanVersion(restored, instruction, `${version.summary} 상태로 복원`);
}

function minutesToTime(start: string, minutes: number): string {
  const [hour, minute] = start.split(":").map(Number);
  const total = Math.max(0, hour * 60 + minute + minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function buildPlanLogistics(situation: ParsedSituation): PlanLogisticsItem[] {
  if (situation.planScope !== "trip") return [];
  const lastDay = Math.max(1, situation.tripDays ?? 1);
  const result: PlanLogisticsItem[] = [];
  if (situation.arrivalTime) {
    result.push({
      id: "logistics_arrival",
      dayNumber: 1,
      time: situation.arrivalTime,
      kind: "arrival",
      title: `${situation.region} 도착`,
      note: situation.transport === "car" ? "렌터카 수령·짐 적재 시간을 60분 확보" : "짐 수령과 첫 이동 시간을 45분 확보",
    });
  }
  if (situation.needsLodging) {
    result.push({
      id: "logistics_checkin",
      dayNumber: 1,
      time: situation.checkInTime ?? "15:00",
      kind: "checkin",
      title: "숙소 체크인 기준",
      note: "실제 숙소 확정 후 체크인 마감과 주차 여부를 다시 확인",
    });
    result.push({
      id: "logistics_checkout",
      dayNumber: lastDay,
      time: situation.checkOutTime ?? "11:00",
      kind: "checkout",
      title: "체크아웃",
      note: situation.transport === "car" ? "짐은 차량에 보관하고 마지막 일정을 진행" : "숙소 또는 역·공항 보관소에 짐을 맡긴 뒤 이동",
    });
    if (situation.transport !== "car") {
      result.push({
        id: "logistics_luggage",
        dayNumber: lastDay,
        time: minutesToTime(situation.checkOutTime ?? "11:00", 15),
        kind: "luggage",
        title: "짐 보관",
        note: "확정된 숙소의 체크아웃 후 보관 가능 여부가 확인되지 않으면 역·공항 보관소 사용",
      });
    }
  }
  if (situation.returnDepartureTime) {
    result.push({
      id: "logistics_departure",
      dayNumber: lastDay,
      time: situation.returnDepartureTime,
      kind: "departure",
      title: "귀가편 출발",
      note: `공항·역에는 최소 ${situation.transport === "car" ? "90분" : "60분"} 전에 도착하도록 마지막 장소를 마감`,
    });
  }
  return result.sort((a, b) => a.dayNumber - b.dayNumber || a.time.localeCompare(b.time));
}

function selectWithinBudget(options: PlanOption[], remaining: number, situation: ParsedSituation): PlanOption {
  let candidates = options;
  if (situation.indoorPreference) {
    const indoor = options.filter((option) => option.venueType === "indoor");
    if (indoor.length) candidates = indoor;
  }
  if (situation.transport !== "car") {
    const noDrive = candidates.filter((option) => !option.id.includes("night-drive"));
    if (noDrive.length) candidates = noDrive;
  }
  const fitting = candidates.filter((option) => option.price <= remaining);
  const ranked = (fitting.length ? fitting : candidates).sort((a, b) => {
    const score = (option: PlanOption) => {
      const experience = option.experience;
      const moodFit = experience?.moods.filter((mood) => situation.desiredMoods.includes(mood)).length ?? 0;
      const wantsSpecial = situation.preferences.some((value) => /특별|이색|흔하지|신비/.test(value)) || situation.desiredMoods.some((mood) => ["mysterious", "hidden", "luxurious"].includes(mood));
      return (experience?.specialnessScore ?? 50) * (wantsSpecial ? 0.42 : 0.15)
        + (experience?.qualityScore ?? 60) * (wantsSpecial ? 0.25 : 0.42)
        + (experience?.rarityScore ?? 45) * (wantsSpecial ? 0.2 : 0.08)
        + moodFit * 8
        + (option.price <= remaining ? 7 : -20);
    };
    return score(b) - score(a);
  });
  return ranked[0] ?? [...candidates].sort((a, b) => a.price - b.price)[0];
}

type PlanSlot = { category: PlanCategory; dayNumber: number; offset: number; time?: string };

function timeToMinutes(value?: string): number {
  const [hour, minute] = (value ?? "00:00").split(":").map(Number);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function laterTime(first: string, second: string): string {
  return timeToMinutes(first) >= timeToMinutes(second) ? first : second;
}

function categorySet(situation: ParsedSituation): PlanSlot[] {
  if (situation.planScope === "single" && situation.singleCategory) {
    return [{ category: situation.singleCategory, dayNumber: 1, offset: 0 }];
  }
  if (situation.planScope === "trip") {
    const days = Math.max(1, Math.min(7, situation.tripDays ?? 2));
    const slots: PlanSlot[] = [];
    const arrival = situation.arrivalTime ?? "11:00";
    const departure = situation.returnDepartureTime ?? "18:00";
    const lateArrival = timeToMinutes(arrival) >= 14 * 60;
    for (let day = 1; day <= days; day += 1) {
      const isFirst = day === 1;
      const isLast = day === days;
      if (isFirst && lateArrival && situation.needsLodging) {
        const checkIn = laterTime(situation.checkInTime ?? "15:00", minutesToTime(arrival, 60));
        slots.push({ category: "lodging", dayNumber: day, offset: 0, time: checkIn });
        slots.push({ category: "activity", dayNumber: day, offset: 0, time: minutesToTime(checkIn, 75) });
        slots.push({ category: "meal", dayNumber: day, offset: 0, time: minutesToTime(checkIn, 240) });
        if (!isLast) slots.push({ category: "view", dayNumber: day, offset: 0, time: minutesToTime(checkIn, 360) });
      } else if (isFirst) {
        slots.push({ category: "activity", dayNumber: day, offset: 0, time: minutesToTime(arrival, 60) });
        if (timeToMinutes(arrival) <= 12 * 60) slots.push({ category: "cafe", dayNumber: day, offset: 0, time: minutesToTime(arrival, 210) });
        if (situation.needsLodging) slots.push({ category: "lodging", dayNumber: day, offset: 0, time: situation.checkInTime ?? "15:00" });
        slots.push({ category: "meal", dayNumber: day, offset: 0, time: laterTime("18:00", minutesToTime(arrival, 360)) });
        if (!isLast) slots.push({ category: "view", dayNumber: day, offset: 0, time: laterTime("20:00", minutesToTime(arrival, 480)) });
      } else if (isLast) {
        slots.push({ category: "activity", dayNumber: day, offset: 0, time: "09:00" });
        const latestMeal = minutesToTime(departure, -210);
        slots.push({ category: "meal", dayNumber: day, offset: 0, time: laterTime("11:30", latestMeal) });
        if (timeToMinutes(departure) >= 17 * 60) slots.push({ category: "cafe", dayNumber: day, offset: 0, time: minutesToTime(departure, -150) });
      } else {
        slots.push({ category: "activity", dayNumber: day, offset: 0, time: "09:30" });
        slots.push({ category: "cafe", dayNumber: day, offset: 0, time: "13:00" });
        slots.push({ category: "meal", dayNumber: day, offset: 0, time: "18:30" });
        slots.push({ category: "view", dayNumber: day, offset: 0, time: "20:30" });
      }
    }
    return slots.filter((slot) => !situation.excludedCategories.includes(slot.category));
  }
  const availableMinutes = situation.availabilityEndTime ? Math.max(0, clockToMinutes(situation.availabilityEndTime) - clockToMinutes(situation.startTime)) : undefined;
  if (availableMinutes != null && availableMinutes <= 210) {
    const categories: PlanCategory[] = /밥|식사|저녁/.test(situation.preferences.join(" ")) || situation.preferredTime === situation.startTime ? ["meal", "view"] : ["cafe", "meal"];
    return categories.filter((category) => !situation.excludedCategories.includes(category)).map((category, index) => ({ category, dayNumber: 1, offset: index * 90 }));
  }
  if ((availableMinutes != null && availableMinutes <= 330) || situation.scheduleDensity === "relaxed" || situation.temporaryCondition.energy === "low") {
    return (["activity", "meal", "view"] as PlanCategory[]).filter((category) => !situation.excludedCategories.includes(category)).map((category, index) => ({ category, dayNumber: 1, offset: index * 120 }));
  }
  const categories: PlanCategory[] = ["activity"];
  if (situation.budget >= 100_000) categories.push("cafe");
  categories.push("meal");
  if (situation.occasion === "thanks") categories.push("moment");
  else categories.push("view");
  situation.requestedCategories.forEach((category) => {
    if (!categories.includes(category)) categories.push(category);
  });
  return categories.filter((category) => !situation.excludedCategories.includes(category)).map((category) => ({ category, dayNumber: 1, offset: CATEGORY_OFFSET[category] }));
}

function travelFor(situation: ParsedSituation, index: number): PlanItem["travelFromPrevious"] {
  if (index === 0) return undefined;
  if (situation.transport === "car") return { minutes: 18, mode: "차량", note: "주차 시간을 포함한 이동 여유" };
  if (situation.transport === "walking") return { minutes: 14, mode: "도보", note: "같은 생활권 안에서 이어지는 동선" };
  return { minutes: 20, mode: "대중교통", note: "환승 1회 이내 후보를 우선 탐색" };
}

function planItem(category: PlanCategory, selected: PlanOption, options: PlanOption[], situation: ParsedSituation, index: number, total: number, dayNumber = 1, offset = CATEGORY_OFFSET[category], explicitTime?: string): PlanItem {
  return {
    ...selected,
    id: `${selected.id}-d${dayNumber}-${index}`,
    category,
    categoryLabel: CATEGORY_LABEL[category],
    icon: category,
    time: explicitTime ?? (category === "lodging" ? situation.checkInTime ?? "15:00" : minutesToTime(situation.startTime, offset)),
    status: "proposed",
    dayNumber,
    alternatives: options.filter((option) => option.id !== selected.id),
    travelFromPrevious: category === "gift" || category === "moment" ? undefined : travelFor(situation, index),
    experience: selected.experience ? { ...selected.experience, journeyRole: journeyRoleFor(category, index, total) } : selected.experience,
  };
}

function buildItems(input: PlanRequest): { items: PlanItem[]; budget: number } {
  const situation = parseSituation(input);
  const spendable = Math.floor(situation.budget * (situation.budgetUsage === "full" ? 1 : 0.9));
  const shares: Record<PlanCategory, number> = {
    activity: 0.30,
    cafe: 0.11,
    meal: 0.45,
    view: 0.12,
    lodging: 0.56,
    cake: 0.11,
    flower: 0.13,
    gift: 0.14,
    moment: 0.03,
  };
  let used = 0;
  const slots = categorySet(situation);
  const totalWeight = slots.reduce((sum, slot) => sum + shares[slot.category], 0) || 1;
  const weightScale = situation.planScope === "trip" ? totalWeight : 1;
  const items = slots.map((slot, index) => {
    const category = slot.category;
    const options = getOptions(category, situation);
    const categoryLimit = Math.max(0, Math.floor(spendable * shares[category] / weightScale));
    const remaining = Math.max(0, spendable - used);
    const selected = selectWithinBudget(options, Math.min(categoryLimit, remaining), situation);
    used += selected.price;
    return planItem(category, selected, options, situation, index, slots.length, slot.dayNumber, slot.offset, slot.time);
  });

  let total = items.reduce((sum, item) => sum + item.price, 0);
  if (total > situation.budget) {
    for (const item of [...items].sort((a, b) => b.price - a.price)) {
      const cheaper = [item, ...item.alternatives].sort((a, b) => a.price - b.price)[0];
      const stable = {
        id: item.id,
        category: item.category,
        categoryLabel: item.categoryLabel,
        icon: item.icon,
        time: item.time,
        status: item.status,
        dayNumber: item.dayNumber,
        alternatives: item.alternatives,
        travelFromPrevious: item.travelFromPrevious,
      };
      Object.assign(item, cheaper, stable);
      total = items.reduce((sum, entry) => sum + entry.price, 0);
      if (total <= spendable) break;
    }
  }
  return { items, budget: situation.budget };
}

function recalculate(plan: DajeongPlan, items: PlanItem[], situation = plan.situation): DajeongPlan {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const ordered: PlanItem[] = [...items]
    .sort((a, b) => (a.dayNumber ?? 1) - (b.dayNumber ?? 1) || a.time.localeCompare(b.time))
    .map((item, index, all): PlanItem => {
      const previous = all[index - 1];
      if (!previous || (previous.dayNumber ?? 1) !== (item.dayNumber ?? 1)) return { ...item, travelFromPrevious: undefined };
      const from = previous.reality?.latitude != null && previous.reality.longitude != null
        ? { latitude: previous.reality.latitude, longitude: previous.reality.longitude }
        : undefined;
      const to = item.reality?.latitude != null && item.reality.longitude != null
        ? { latitude: item.reality.latitude, longitude: item.reality.longitude }
        : undefined;
      const distance = haversineKm(from, to);
      const minutes = travelMinutes(distance, situation.transport);
      if (distance == null || minutes == null) return { ...item, travelFromPrevious: item.travelFromPrevious ?? travelFor(situation, index) };
      return {
        ...item,
        travelFromPrevious: {
          minutes,
          mode: situation.transport === "car" ? "차량" : situation.transport === "walking" ? "도보" : "대중교통",
          note: "직선거리 기반 예상 · 실제 경로는 지도에서 확인",
        },
        reality: item.reality ? {
          ...item.reality,
          distanceFromPreviousKm: distance,
          travelEstimateMinutes: minutes,
          travelEstimateBasis: "straight_line" as const,
        } : item.reality,
      };
    });
  return syncPrepReservations(reconcileReservationOrder(scheduleDajeongPlan({
    ...plan,
    situation,
    items: ordered,
    logistics: buildPlanLogistics(situation),
    subtotal: total,
    total,
    reserve: Math.max(0, plan.budget - total),
    budgetRemaining: plan.budget - total,
    experienceFlow: buildExperienceFlow(ordered),
  })));
}

export function createDajeongPlan(input: PlanRequest): DajeongPlan {
  const situation = parseSituation(input);
  const { items, budget } = buildItems(input);
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const reserve = Math.max(0, budget - subtotal);
  const urgencyText = situation.urgency === "today" ? "오늘" : situation.urgency === "tomorrow" ? "내일" : "다가오는 날";
  const transportText = situation.transport === "car" ? "주차 가능한 동선으로" : situation.transport === "walking" ? "걸어서 이어지도록" : "환승을 줄인 동선으로";
  const id = `dj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const mood = situation.desiredMoods[0] ? MOOD_LABEL[situation.desiredMoods[0]] : "자연스러운";
  const scopeTitle = situation.planScope === "single"
    ? `${situation.recipient}에게 딱 맞는 ${items[0]?.categoryLabel ?? "경험"}`
    : situation.planScope === "trip"
      ? `${situation.recipient}와 기억할 ${situation.tripDays ?? 2}일의 여행`
      : `${situation.recipient}와 보내는 ${situation.occasionLabel}`;
  const createdPlan: DajeongPlan = {
    id,
    createdAt: new Date().toISOString(),
    sourceRequest: input.request.trim(),
    situation,
    title: scopeTitle,
    summary: `${urgencyText} ${situation.region}에서 ${transportText}, ${situation.startTime}${situation.availabilityEndTime ? `~${situation.availabilityEndTime}` : "부터"} 실제로 따라갈 수 있는 ${mood} 흐름으로 짰어.`,
    items,
    subtotal,
    reserve,
    total: subtotal,
    budget,
    budgetRemaining: reserve,
    readiness: Math.min(96, 74 + (situation.urgency === "planned" ? 18 : situation.urgency === "soon" ? 12 : 6)),
    status: "draft",
    notice: "지금 화면의 장소는 조건에 맞는 탐색 방향이야. 가격·영업·좌석은 연결된 서비스에서 마지막에 확인하고, 네 승인 없이는 예약하거나 결제하지 않아.",
    revisions: [],
    logistics: buildPlanLogistics(situation),
    experienceFlow: buildExperienceFlow(items),
  };
  const scheduled = scheduleDajeongPlan(createdPlan);
  const withConversation = appendPlanConversation(scheduled, input.request.trim(), "말한 조건을 기억하고 체류시간·이동·완충시간까지 같이 보면서 계획을 짰어.");
  const askPrep = shouldOfferPrepCheck(situation);
  const withPrepOffer = askPrep ? appendAssistantNote({ ...withConversation, prepAsked: true }, createPrepOfferMessage()) : withConversation;
  return initializePlanVersion(withPrepOffer);
}

export function replacePlanItem(plan: DajeongPlan, category: PlanCategory, optionId: string, itemId?: string): DajeongPlan {
  const current = itemId ? plan.items.find((item) => item.id === itemId) : plan.items.find((item) => item.category === category);
  if (!current) return plan;
  const replacement = [current, ...current.alternatives].find((option) => option.id === optionId);
  if (!replacement) return plan;

  const { category: _category, categoryLabel: _label, icon: _icon, time: _time, status: _status, alternatives: _alternatives, travelFromPrevious: _travel, ...oldOption } = current;
  const nextItems = plan.items.map((item) => item.id === current.id
    ? {
        ...item,
        ...replacement,
        id: itemId ? `${replacement.id}-d${current.dayNumber ?? 1}-${plan.items.indexOf(current)}` : replacement.id,
        alternatives: [oldOption, ...current.alternatives.filter((option) => option.id !== optionId)],
      }
    : item);
  return recalculate(plan, nextItems);
}

export function restoreReferencedCandidate(
  plan: DajeongPlan,
  instruction: string,
): { plan: DajeongPlan; category: PlanCategory; title: string } | null {
  if (!/아까.{0,8}(두\s*번째|2\s*번째).{0,8}(좋|선택|걸로)/.test(instruction)) return null;
  const recentCategory = plan.revisions?.[0]?.changedCategories?.[0];
  if (!recentCategory) return null;
  const dayNumber = /첫\s*날|첫째\s*날|1\s*일차/.test(instruction) ? 1
    : /둘째\s*날|두\s*번째\s*날|2\s*일차/.test(instruction) ? 2
      : /셋째\s*날|세\s*번째\s*날|3\s*일차/.test(instruction) ? 3
        : Number(instruction.match(/(\d{1,2})\s*일차/)?.[1]) || undefined;
  const item = plan.items.find((entry) => entry.category === recentCategory && (!dayNumber || entry.dayNumber === dayNumber));
  const previousSecond = item?.alternatives?.[0];
  if (!item || !previousSecond) return null;
  return {
    plan: replacePlanItem(plan, item.category, previousSecond.id, item.id),
    category: item.category,
    title: previousSecond.title,
  };
}

function targetCategory(instruction: string): PlanCategory | null {
  const focus = instruction.match(/(?:그대로|유지)[^,.!?]*(?:두고|하고)\s*(.+)$/)?.[1] ?? instruction;
  return CATEGORY_TERMS.find(([, pattern]) => pattern.test(focus))?.[0] ?? null;
}

function replaceBy(plan: DajeongPlan, category: PlanCategory, mode: "cheaper" | "premium" | "different" | "indoor"): DajeongPlan {
  const item = plan.items.find((entry) => entry.category === category);
  if (!item || item.placeLocked || item.alternatives.length === 0) return plan;
  let choices = item.alternatives;
  if (mode === "indoor") {
    const indoor = choices.filter((option) => option.venueType === "indoor");
    if (indoor.length) choices = indoor;
  }
  if (mode === "cheaper") choices = choices.filter((option) => option.price < item.price).sort((a, b) => a.price - b.price);
  if (mode === "premium") choices = choices.filter((option) => option.price > item.price).sort((a, b) => b.price - a.price);
  if (mode === "different") choices = [...choices].sort((a, b) => Math.abs(a.price - item.price) - Math.abs(b.price - item.price));
  if (choices.length === 0) return plan;
  const choice = choices.find((option) => plan.total - item.price + option.price <= plan.budget) ?? choices[0];
  return choice ? replacePlanItem(plan, category, choice.id) : plan;
}

function addCategory(plan: DajeongPlan, category: PlanCategory): DajeongPlan {
  if (plan.items.some((item) => item.category === category)) return plan;
  const options = getOptions(category, plan.situation);
  const available = Math.max(0, plan.budget - plan.total);
  const selected = selectWithinBudget(options, available, plan.situation);
  if (!selected || selected.price > available) return plan;
  const item = planItem(category, selected, options, plan.situation, plan.items.length, plan.items.length + 1, plan.items.at(-1)?.dayNumber ?? 1);
  return recalculate(plan, [...plan.items, item]);
}

function changedCategories(before: DajeongPlan, after: DajeongPlan): PlanCategory[] {
  const categories = new Set<PlanCategory>();
  const all = new Set([...before.items.map((item) => item.category), ...after.items.map((item) => item.category)]);
  all.forEach((category) => {
    const previous = before.items.find((item) => item.category === category);
    const next = after.items.find((item) => item.category === category);
    if (!previous || !next || previous.id !== next.id || previous.durationMinutes !== next.durationMinutes) categories.add(category);
  });
  return [...categories];
}

export function reviseDajeongPlan(
  plan: DajeongPlan,
  rawInstruction: string,
  options: { recordConversation?: boolean } = {},
): PlanRevisionResult {
  const instruction = rawInstruction.trim();
  const target = targetCategory(instruction);
  let next = plan;
  let message = "요청을 이해했지만 안전하게 바꿀 수 있는 항목을 찾지 못했어. 식당·카페·야경처럼 바꿀 대상을 함께 말해줘.";

  if (target && /빼|제외|없애|삭제/.test(instruction)) {
    const locked = plan.items.some((item) => item.category === target && item.placeLocked);
    next = locked ? plan : recalculate(plan, plan.items.filter((item) => item.category !== target));
    message = locked ? `${CATEGORY_LABEL[target]}은 사용자가 꼭 유지해 달라고 고정한 일정이야. 먼저 고정을 해제해줘.` : `${CATEGORY_LABEL[target]} 일정을 빼고 남은 동선과 예산을 다시 계산했어.`;
  } else if (target && /넣|추가|더해/.test(instruction) && !plan.items.some((item) => item.category === target)) {
    next = addCategory(plan, target);
    message = next === plan ? `남은 예산 안에서는 ${CATEGORY_LABEL[target]}을 추가하기 어려워. 예산을 늘리거나 다른 항목을 가볍게 해줘.` : `${CATEGORY_LABEL[target]}을 기존 흐름에 자연스럽게 추가했어.`;
  } else if (/실내|비가|비 와|추워|더워/.test(instruction)) {
    let updated = plan;
    plan.items.filter((item) => item.venueType === "outdoor").forEach((item) => { updated = replaceBy(updated, item.category, "indoor"); });
    const constraints = Array.from(new Set([...(updated.situation.constraints ?? []), "실내 위주"]));
    next = recalculate(updated, updated.items, { ...updated.situation, indoorPreference: true, constraints });
    message = "야외 비중을 줄이고 실내에서 이어지는 선택으로 바꿨어.";
  } else if (/싸게|저렴|예산.*줄|비용.*줄/.test(instruction)) {
    const targets = target ? [target] : plan.items.map((item) => item.category);
    targets.forEach((category) => { next = replaceBy(next, category, "cheaper"); });
    message = target ? `${CATEGORY_LABEL[target]}만 더 가벼운 선택으로 바꿨어.` : `분위기를 해치지 않는 선에서 총비용을 ${Math.max(0, plan.total - next.total).toLocaleString("ko-KR")}원 줄였어.`;
  } else if (/특별|고급|기억에 남|프리미엄/.test(instruction)) {
    const targets = target ? [target] : (["activity", "meal", "view"] as PlanCategory[]);
    targets.forEach((category) => { next = replaceBy(next, category, "premium"); });
    message = "남은 예산을 넘지 않으면서 경험의 특별함이 커지는 항목을 우선했어.";
  } else if (target && /바꿔|다른|별로|싫어/.test(instruction)) {
    next = replaceBy(plan, target, "different");
    message = `${CATEGORY_LABEL[target]}만 다른 분위기의 선택으로 바꿨어. 나머지 일정은 그대로야.`;
  } else if (/야경/.test(instruction)) {
    next = addCategory(plan, "view");
    message = next === plan ? "이미 마지막에 야경 일정이 들어가 있어." : "마지막에 야경을 넣고 전체 시간을 다시 정리했어.";
  }

  const timeMatch = instruction.match(/(\d{1,2})(?::(\d{2}))?\s*시/);
  if (target && timeMatch && /시간|시로|시에|늦|일찍/.test(instruction)) {
    let hour = Number(timeMatch[1]);
    if (/오후|저녁/.test(instruction) && hour < 12) hour += 12;
    const time = `${String(Math.min(23, hour)).padStart(2, "0")}:${timeMatch[2] ?? "00"}`;
    next = recalculate(next, next.items.map((item) => item.category === target ? { ...item, time } : item));
    message = `${CATEGORY_LABEL[target]} 시간을 ${time}로 옮기고 시간순으로 다시 정리했어.`;
  }

  const changed = changedCategories(plan, next);
  if (changed.length > 0) {
    const revision = {
      id: `rev_${Date.now().toString(36)}`,
      instruction,
      summary: message,
      createdAt: new Date().toISOString(),
      changedCategories: changed,
    };
    next = { ...next, revisions: [revision, ...(plan.revisions ?? [])].slice(0, 12), status: "draft" };
  }
  if (options.recordConversation !== false) next = appendPlanConversation(next, instruction, message);
  if (changed.length > 0) next = appendPlanVersion(next, instruction, message);
  return { plan: next, message, changedCategories: changed };
}
