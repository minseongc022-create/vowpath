import { getOptions } from "./catalog";
import { buildExperienceFlow, journeyRoleFor, MOOD_LABEL } from "./experience";
import { parseSituation } from "./situation";
import type { ConciergeMessage, DajeongPlan, ParsedSituation, PlanCategory, PlanItem, PlanOption, PlanRequest, PlanRevisionResult } from "./types";

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

function minutesToTime(start: string, minutes: number): string {
  const [hour, minute] = start.split(":").map(Number);
  const total = Math.max(0, hour * 60 + minute + minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
      return (experience?.specialnessScore ?? 50) * 0.42
        + (experience?.qualityScore ?? 60) * 0.25
        + (experience?.rarityScore ?? 45) * 0.2
        + moodFit * 8
        + (option.price <= remaining ? 7 : -20);
    };
    return score(b) - score(a);
  });
  return ranked[0] ?? [...candidates].sort((a, b) => a.price - b.price)[0];
}

type PlanSlot = { category: PlanCategory; dayNumber: number; offset: number };

function categorySet(situation: ParsedSituation): PlanSlot[] {
  if (situation.planScope === "single" && situation.singleCategory) {
    return [{ category: situation.singleCategory, dayNumber: 1, offset: 0 }];
  }
  if (situation.planScope === "trip") {
    const days = Math.max(1, Math.min(7, situation.tripDays ?? 2));
    const slots: PlanSlot[] = [];
    for (let day = 1; day <= days; day += 1) {
      const isLast = day === days;
      slots.push({ category: "activity", dayNumber: day, offset: day === 1 ? 0 : 60 });
      slots.push({ category: "cafe", dayNumber: day, offset: day === 1 ? 120 : 220 });
      if (day <= (situation.tripNights ?? 0)) slots.push({ category: "lodging", dayNumber: day, offset: 240 });
      slots.push({ category: "meal", dayNumber: day, offset: day === 1 ? 420 : 390 });
      if (!isLast) slots.push({ category: "view", dayNumber: day, offset: 540 });
    }
    return slots;
  }
  const categories: PlanCategory[] = ["activity"];
  if (situation.budget >= 100_000) categories.push("cafe");
  if (situation.occasion === "birthday" && situation.budget >= 240_000) categories.push("gift");
  if (["anniversary", "proposal"].includes(situation.occasion) && situation.budget >= 220_000) categories.push("flower");
  if (situation.occasion === "birthday" && situation.budget >= 140_000) categories.push("cake");
  categories.push("meal");
  if (situation.occasion === "thanks") categories.push("moment");
  else categories.push("view");
  return categories.map((category) => ({ category, dayNumber: 1, offset: CATEGORY_OFFSET[category] }));
}

function travelFor(situation: ParsedSituation, index: number): PlanItem["travelFromPrevious"] {
  if (index === 0) return undefined;
  if (situation.transport === "car") return { minutes: 18, mode: "차량", note: "주차 시간을 포함한 이동 여유" };
  if (situation.transport === "walking") return { minutes: 14, mode: "도보", note: "같은 생활권 안에서 이어지는 동선" };
  return { minutes: 20, mode: "대중교통", note: "환승 1회 이내 후보를 우선 탐색" };
}

function planItem(category: PlanCategory, selected: PlanOption, options: PlanOption[], situation: ParsedSituation, index: number, total: number, dayNumber = 1, offset = CATEGORY_OFFSET[category]): PlanItem {
  return {
    ...selected,
    id: `${selected.id}-d${dayNumber}-${index}`,
    category,
    categoryLabel: CATEGORY_LABEL[category],
    icon: category,
    time: category === "lodging" ? situation.checkInTime ?? "15:00" : minutesToTime(situation.startTime, offset),
    status: "proposed",
    dayNumber,
    alternatives: options.filter((option) => option.id !== selected.id),
    travelFromPrevious: category === "gift" || category === "moment" ? undefined : travelFor(situation, index),
    experience: selected.experience ? { ...selected.experience, journeyRole: journeyRoleFor(category, index, total) } : selected.experience,
  };
}

function buildItems(input: PlanRequest): { items: PlanItem[]; budget: number } {
  const situation = parseSituation(input);
  const spendable = Math.floor(situation.budget * 0.9);
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
    return planItem(category, selected, options, situation, index, slots.length, slot.dayNumber, slot.offset);
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
  const ordered = [...items].sort((a, b) => (a.dayNumber ?? 1) - (b.dayNumber ?? 1) || a.time.localeCompare(b.time));
  return {
    ...plan,
    situation,
    items: ordered,
    subtotal: total,
    total,
    reserve: Math.max(0, plan.budget - total),
    budgetRemaining: plan.budget - total,
    experienceFlow: buildExperienceFlow(ordered),
  };
}

export function createDajeongPlan(input: PlanRequest): DajeongPlan {
  const situation = parseSituation(input);
  const { items, budget } = buildItems(input);
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const reserve = Math.max(0, budget - subtotal);
  const urgencyText = situation.urgency === "today" ? "오늘" : situation.urgency === "tomorrow" ? "내일" : "다가오는 날";
  const transportText = situation.transport === "car" ? "주차 가능한 동선으로" : situation.transport === "walking" ? "걸어서 이어지도록" : "환승을 줄인 동선으로";
  const id = `dj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const mood = situation.desiredMoods[0] ? MOOD_LABEL[situation.desiredMoods[0]] : "특별한";
  const scopeTitle = situation.planScope === "single"
    ? `${situation.recipient}에게 딱 맞는 ${items[0]?.categoryLabel ?? "경험"}`
    : situation.planScope === "trip"
      ? `${situation.recipient}와 기억할 ${situation.tripDays ?? 2}일의 여행`
      : `${situation.recipient}와 오래 기억할 ${situation.occasionLabel}`;
  const createdPlan: DajeongPlan = {
    id,
    createdAt: new Date().toISOString(),
    sourceRequest: input.request.trim(),
    situation,
    title: scopeTitle,
    summary: `${urgencyText} ${situation.region}에서 ${transportText}, ${mood} 장면이 하나는 또렷하게 남도록 구성했어요.`,
    items,
    subtotal,
    reserve,
    total: subtotal,
    budget,
    budgetRemaining: reserve,
    readiness: Math.min(96, 74 + (situation.urgency === "planned" ? 18 : situation.urgency === "soon" ? 12 : 6)),
    status: "draft",
    notice: "현재 화면의 장소는 조건에 맞는 탐색 방향입니다. 가격·영업·좌석은 연결된 서비스에서 최종 확인되며, 하루온은 사용자 승인 없이 예약하거나 결제하지 않습니다.",
    revisions: [],
    experienceFlow: buildExperienceFlow(items),
  };
  return appendPlanConversation(createdPlan, input.request.trim(), "말씀하신 조건을 기억하고 실제 장소와 이동 흐름을 함께 살펴 계획을 준비했어요.");
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

function targetCategory(instruction: string): PlanCategory | null {
  const focus = instruction.match(/(?:그대로|유지)[^,.!?]*(?:두고|하고)\s*(.+)$/)?.[1] ?? instruction;
  return CATEGORY_TERMS.find(([, pattern]) => pattern.test(focus))?.[0] ?? null;
}

function replaceBy(plan: DajeongPlan, category: PlanCategory, mode: "cheaper" | "premium" | "different" | "indoor"): DajeongPlan {
  const item = plan.items.find((entry) => entry.category === category);
  if (!item || item.alternatives.length === 0) return plan;
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
    if (!previous || !next || previous.id !== next.id || previous.time !== next.time) categories.add(category);
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
  let message = "요청을 이해했지만 안전하게 바꿀 수 있는 항목을 찾지 못했어요. 식당·카페·야경처럼 바꿀 대상을 함께 말해 주세요.";

  if (target && /빼|제외|없애|삭제/.test(instruction)) {
    next = recalculate(plan, plan.items.filter((item) => item.category !== target));
    message = `${CATEGORY_LABEL[target]} 일정을 빼고 남은 동선과 예산을 다시 계산했어요.`;
  } else if (target && /넣|추가|더해/.test(instruction) && !plan.items.some((item) => item.category === target)) {
    next = addCategory(plan, target);
    message = next === plan ? `남은 예산 안에서는 ${CATEGORY_LABEL[target]}을 추가하기 어려워요. 예산을 늘리거나 다른 항목을 가볍게 해주세요.` : `${CATEGORY_LABEL[target]}을 기존 흐름에 자연스럽게 추가했어요.`;
  } else if (/실내|비가|비 와|추워|더워/.test(instruction)) {
    let updated = plan;
    plan.items.filter((item) => item.venueType === "outdoor").forEach((item) => { updated = replaceBy(updated, item.category, "indoor"); });
    const constraints = Array.from(new Set([...(updated.situation.constraints ?? []), "실내 위주"]));
    next = recalculate(updated, updated.items, { ...updated.situation, indoorPreference: true, constraints });
    message = "야외 비중을 줄이고 실내에서 이어지는 선택으로 바꿨어요.";
  } else if (/싸게|저렴|예산.*줄|비용.*줄/.test(instruction)) {
    const targets = target ? [target] : plan.items.map((item) => item.category);
    targets.forEach((category) => { next = replaceBy(next, category, "cheaper"); });
    message = target ? `${CATEGORY_LABEL[target]}만 더 가벼운 선택으로 바꿨어요.` : `분위기를 해치지 않는 선에서 총비용을 ${Math.max(0, plan.total - next.total).toLocaleString("ko-KR")}원 줄였어요.`;
  } else if (/특별|고급|기억에 남|프리미엄/.test(instruction)) {
    const targets = target ? [target] : (["activity", "meal", "view"] as PlanCategory[]);
    targets.forEach((category) => { next = replaceBy(next, category, "premium"); });
    message = "남은 예산을 넘지 않으면서 경험의 특별함이 커지는 항목을 우선했어요.";
  } else if (target && /바꿔|다른|별로|싫어/.test(instruction)) {
    next = replaceBy(plan, target, "different");
    message = `${CATEGORY_LABEL[target]}만 다른 분위기의 선택으로 바꿨어요. 나머지 일정은 그대로예요.`;
  } else if (/야경/.test(instruction)) {
    next = addCategory(plan, "view");
    message = next === plan ? "이미 마지막에 야경 일정이 들어가 있어요." : "마지막에 야경을 넣고 전체 시간을 다시 정리했어요.";
  }

  const timeMatch = instruction.match(/(\d{1,2})(?::(\d{2}))?\s*시/);
  if (target && timeMatch && /시간|시로|시에|늦|일찍/.test(instruction)) {
    let hour = Number(timeMatch[1]);
    if (/오후|저녁/.test(instruction) && hour < 12) hour += 12;
    const time = `${String(Math.min(23, hour)).padStart(2, "0")}:${timeMatch[2] ?? "00"}`;
    next = recalculate(next, next.items.map((item) => item.category === target ? { ...item, time } : item));
    message = `${CATEGORY_LABEL[target]} 시간을 ${time}로 옮기고 시간순으로 다시 정리했어요.`;
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
  return { plan: next, message, changedCategories: changed };
}
