import type { DajeongPlan, ParsedSituation, PrepCategory, PrepHandling, PrepItem } from "./types";

const CUSTOM_LEAD_TIME: Partial<Record<PrepCategory, { pattern: RegExp; days: number }>> = {
  cake: { pattern: /주문제작|커스텀|맞춤|레터링|포토\s*케이크|캐릭터/, days: 2 },
  gift: { pattern: /각인|제작|맞춤|주문제작|커스텀/, days: 3 },
  event_booking: { pattern: /대관|프라이빗|단독|룸\s*예약/, days: 3 },
};

const DEFAULT_LEAD_TIME: Record<PrepCategory, number> = {
  flower: 0,
  cake: 0,
  gift: 0,
  event_booking: 1,
  custom: 0,
};

export function resolveLeadTimeDays(category: PrepCategory, title: string, notes = ""): number {
  const rule = CUSTOM_LEAD_TIME[category];
  const text = `${title} ${notes}`;
  if (rule && rule.pattern.test(text)) return rule.days;
  return DEFAULT_LEAD_TIME[category];
}

export function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Whether it's worth asking about surprises/flowers/gifts at all. Every plain "밥 먹고 카페"
 * request would get annoying fast, so this only fires when the occasion itself makes prep
 * likely (birthday, anniversary milestones, proposal) — not on every single date.
 */
export function shouldOfferPrepCheck(situation: ParsedSituation): boolean {
  // "special" is situation.ts's catch-all default for anything that didn't match a known
  // occasion keyword — the least reliable signal, not a reason to ask on its own.
  if (["birthday", "anniversary", "proposal"].includes(situation.occasion)) return true;
  if (/프로포즈|서프라이즈|백일|100일|200일|300일|주년|기념일/.test(situation.occasionLabel)) return true;
  if (situation.preferences.some((value) => /서프라이즈|이벤트|깜짝/.test(value))) return true;
  return false;
}

export function createPrepOfferMessage(): string {
  return "혹시 이번에 서프라이즈나 선물 같은 것도 준비할 생각 있어? 있으면 꽃이나 케이크, 선물처럼 미리 사거나 예약해야 하는 것도 같이 준비해줄 수 있어.";
}

const TIMING_ADVICE: Record<PrepCategory, { handling: PrepHandling; note: string }> = {
  flower: { handling: "pickup", note: "꽃은 오래 들고 다니면 시들거나 눌릴 수 있어요. 사용 직전에 픽업하거나, 식당처럼 쓸 장소로 바로 배송·사전 전달하는 방법을 더 권해요." },
  cake: { handling: "pickup", note: "케이크는 냉장이 필요해서 하루 종일 들고 다니긴 어려워요. 사용 시점에 가깝게 픽업하거나 매장에 배송을 맡기는 걸 권해요." },
  gift: { handling: "self_prepared", note: "부피가 있는 선물이면 하루 전에 미리 준비해두면 당일 동선이 훨씬 편해요." },
  event_booking: { handling: "unknown", note: "장소·업체 예약은 실제 가능 여부를 먼저 확인해야 확정으로 표시할 수 있어요." },
  custom: { handling: "unknown", note: "" },
};

export function recommendHandling(category: PrepCategory): { handling: PrepHandling; note: string } {
  return TIMING_ADVICE[category];
}

export function suggestPrepCategories(situation: ParsedSituation): Array<{ category: PrepCategory; reason: string }> {
  const suggestions: Array<{ category: PrepCategory; reason: string }> = [];
  if (situation.occasion === "proposal") {
    suggestions.push({ category: "flower", reason: "프로포즈 장면에 자주 곁들여요" });
    suggestions.push({ category: "gift", reason: "반지·편지처럼 특별한 준비가 필요할 수 있어요" });
    return suggestions;
  }
  if (situation.occasion === "birthday" || /주년|기념일|100일|200일|300일/.test(situation.occasionLabel)) {
    suggestions.push({ category: "flower", reason: "축하하는 날에 잘 어울려요" });
    suggestions.push({ category: "cake", reason: "함께 축하할 케이크로 자연스러워요" });
    return suggestions;
  }
  if (situation.occasion === "anniversary" || situation.occasion === "special") {
    suggestions.push({ category: "flower", reason: "특별한 날의 분위기를 더해줘요" });
  }
  return suggestions.slice(0, 2);
}

export function createPrepItem(
  plan: DajeongPlan,
  input: { category: PrepCategory; title: string; date?: string; time?: string; handling?: PrepHandling; notes?: string; relatedMainItemId?: string; deliverToItemId?: string },
): PrepItem {
  const date = input.date ?? plan.situation.targetDate;
  const leadTimeDays = resolveLeadTimeDays(input.category, input.title, input.notes);
  const advice = recommendHandling(input.category);
  const now = new Date().toISOString();
  return {
    id: `prep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    planId: plan.id,
    category: input.category,
    title: input.title,
    notes: input.notes ?? "",
    relatedMainItemId: input.relatedMainItemId,
    deliverToItemId: input.deliverToItemId,
    date,
    time: input.time,
    leadTimeDays,
    orderDeadline: leadTimeDays > 0 ? shiftDate(date, -leadTimeDays) : undefined,
    handling: input.handling ?? advice.handling,
    handlingReason: advice.note,
    status: "suggested",
    priceConfidence: "unknown",
    visibility: "shared",
    createdAt: now,
    updatedAt: now,
  };
}

/** True when there simply isn't enough runway left before the main date to place this order. */
export function isLeadTimeFeasible(item: PrepItem, reference: string = todayKey()): boolean {
  if (!item.orderDeadline) return true;
  return reference <= item.orderDeadline;
}

export function checkPrepFeasibility(plan: DajeongPlan): string[] {
  const warnings: string[] = [];
  const today = todayKey();
  for (const item of plan.prep ?? []) {
    if (item.status === "cancelled") continue;
    if (!isLeadTimeFeasible(item, today)) {
      warnings.push(`${item.title}은 보통 ${item.leadTimeDays}일 전에는 주문해야 해서 지금 시점엔 어려울 수 있어요. 당일 픽업 가능한 대안으로 다시 찾아볼게요.`);
    }
    if (item.date === plan.situation.targetDate && item.time) {
      const related = item.relatedMainItemId ? plan.items.find((entry) => entry.id === item.relatedMainItemId) : undefined;
      if (related && item.time > related.time) {
        warnings.push(`${item.title} 준비 시간이 ${related.title} 이후로 잡혀 있어요. 순서를 다시 확인해 주세요.`);
      }
      const deliverTarget = item.deliverToItemId ? plan.items.find((entry) => entry.id === item.deliverToItemId) : undefined;
      if (deliverTarget && item.time > deliverTarget.time) {
        warnings.push(`${item.title}을 ${deliverTarget.title} 전에 전달하기엔 시간이 빠듯해요.`);
      }
    }
  }
  return warnings;
}
