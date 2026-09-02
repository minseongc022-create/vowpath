import { appendPlanConversation } from "./plan-engine";
import { clockToMinutes } from "./schedule-engine";
import type { DajeongPlan, PlanCategory, PlanItem } from "./types";

export type SecrecyResult = { handled: boolean; plan: DajeongPlan; message: string; changedItemIds: string[] };

const CATEGORY_PATTERN: Array<[PlanCategory, RegExp]> = [
  ["meal", /식당|식사|저녁|밥/],
  ["activity", /전시|공연|체험|이벤트|서프라이즈|프로포즈/],
  ["lodging", /숙소|호텔|펜션/],
  ["flower", /꽃|꽃다발|플라워/],
  ["cake", /케이크/],
  ["gift", /선물/],
  ["cafe", /카페/],
  ["view", /야경|전망|루프탑/],
  ["moment", /편지|카드/],
];

function findByName(plan: DajeongPlan, instruction: string): PlanItem | undefined {
  const compact = instruction.replace(/\s+/g, "");
  return plan.items.find((item) => compact.includes(item.title.replace(/\s+/g, "")));
}

function findByCategory(plan: DajeongPlan, instruction: string): PlanItem | undefined {
  const category = CATEGORY_PATTERN.find(([, pattern]) => pattern.test(instruction))?.[0];
  return category ? plan.items.find((item) => item.category === category) : undefined;
}

function findLast(plan: DajeongPlan, dayNumber?: number): PlanItem | undefined {
  const scoped = dayNumber ? plan.items.filter((item) => (item.dayNumber ?? 1) === dayNumber) : plan.items;
  return [...scoped].sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time)).at(-1);
}

function resolveTargetItem(plan: DajeongPlan, instruction: string, requestedItemId?: string): PlanItem | undefined {
  if (requestedItemId) return plan.items.find((item) => item.id === requestedItemId);
  if (/마지막|맨\s*끝/.test(instruction)) return findLast(plan);
  return findByName(plan, instruction) ?? findByCategory(plan, instruction);
}

/** Sets one item's visibility. The same function backs both the UI toggle and natural-language commands, so they can never drift into different states. */
export function setItemVisibility(plan: DajeongPlan, itemId: string, visibility: "shared" | "secret", secretLabel?: string): DajeongPlan {
  return {
    ...plan,
    items: plan.items.map((item) => item.id === itemId
      ? { ...item, visibility, secretLabel: visibility === "secret" ? secretLabel ?? item.secretLabel : undefined }
      : item),
  };
}

/** Hides (or reveals) every item at/after a given clock time on a day — "저녁까지만 보여줘" style range cuts. */
export function setVisibilityFrom(plan: DajeongPlan, dayNumber: number, fromTime: string, visibility: "shared" | "secret"): { plan: DajeongPlan; changedItemIds: string[] } {
  const cutoff = clockToMinutes(fromTime);
  const changed: string[] = [];
  const items = plan.items.map((item) => {
    if ((item.dayNumber ?? 1) !== dayNumber || clockToMinutes(item.time) < cutoff) return item;
    changed.push(item.id);
    return { ...item, visibility, secretLabel: visibility === "secret" ? item.secretLabel : undefined };
  });
  return { plan: { ...plan, items }, changedItemIds: changed };
}

export function revealAllItems(plan: DajeongPlan): { plan: DajeongPlan; changedItemIds: string[] } {
  const changed = plan.items.filter((item) => item.visibility === "secret").map((item) => item.id);
  return {
    plan: { ...plan, items: plan.items.map((item) => item.visibility === "secret" ? { ...item, visibility: "shared" as const, secretLabel: undefined } : item) },
    changedItemIds: changed,
  };
}

function record(plan: DajeongPlan, instruction: string, message: string, itemIds: string[], secret: boolean): DajeongPlan {
  const withMessage = appendPlanConversation(plan, instruction, message);
  if (!secret) return withMessage;
  return {
    ...withMessage,
    conversation: (withMessage.conversation ?? []).map((entry, index, all) =>
      index >= all.length - 2 ? { ...entry, visibility: "secret" as const, relatedItemId: itemIds[0] } : entry),
  };
}

export function applySecrecyInstruction(plan: DajeongPlan, instructionRaw: string, requestedItemId?: string): SecrecyResult {
  const instruction = instructionRaw.trim();

  if (/이제\s*(공개|보여|알려)|공개해도|이제\s*.{0,10}(볼\s*수\s*있|보여줘)/.test(instruction) && !/비밀|숨겨/.test(instruction)) {
    const target = resolveTargetItem(plan, instruction, requestedItemId);
    if (target && target.visibility === "secret" && !/전부|다|모두|전체/.test(instruction)) {
      const next = setItemVisibility(plan, target.id, "shared");
      const message = `${target.title} 일정을 이제 공유 화면에도 보이게 했어요.`;
      return { handled: true, plan: record(next, instruction, message, [target.id], false), message, changedItemIds: [target.id] };
    }
    const { plan: revealed, changedItemIds } = revealAllItems(plan);
    if (!changedItemIds.length) return { handled: false, plan, message: "", changedItemIds: [] };
    const message = "비공개로 뒀던 일정을 모두 공유 화면에 보이게 바꿨어요.";
    return { handled: true, plan: record(revealed, instruction, message, changedItemIds, false), message, changedItemIds };
  }

  const untilMatch = instruction.match(/(\d{1,2})(?::(\d{2}))?\s*시\s*까지만\s*(?:보여|공개)|([가-힣]+)\s*까지만\s*보여/);
  if (untilMatch && /비밀|숨|비공개/.test(instruction) === false && /까지만/.test(instruction)) {
    let cutoffItem: PlanItem | undefined;
    if (untilMatch[3]) cutoffItem = findByName(plan, untilMatch[3]) ?? findByCategory(plan, untilMatch[3]);
    const cutoffTime = untilMatch[1]
      ? `${String(Number(untilMatch[1]) + (/오후|저녁|밤/.test(instruction) && Number(untilMatch[1]) < 12 ? 12 : 0)).padStart(2, "0")}:${untilMatch[2] ?? "00"}`
      : cutoffItem?.endTime ?? cutoffItem?.time;
    if (cutoffTime) {
      const dayNumber = cutoffItem?.dayNumber ?? 1;
      const { plan: next, changedItemIds } = setVisibilityFrom(plan, dayNumber, cutoffTime, "secret");
      const message = changedItemIds.length
        ? `${cutoffTime} 이후 일정은 동반자 화면에서 비공개로 바꿨어요. 하루온은 계속 전체 일정을 기억하고 동선을 맞춰요.`
        : "그 시간 이후 일정이 없어서 바꿀 내용이 없어요.";
      return { handled: true, plan: record(next, instruction, message, changedItemIds, true), message, changedItemIds };
    }
  }

  const wantsSecret = /비밀로\s*해|숨겨\s*줘|숨겨줘|비공개로\s*(해|바꿔)|안\s*보이게|모르게\s*해/.test(instruction);
  if (wantsSecret) {
    const target = resolveTargetItem(plan, instruction, requestedItemId);
    if (!target) {
      const message = "어떤 일정을 비공개로 할지 정확히 짚지 못했어요. 장소 이름이나 ‘마지막 일정’처럼 말해 주세요.";
      return { handled: true, plan: appendPlanConversation(plan, instruction, message), message, changedItemIds: [] };
    }
    const next = setItemVisibility(plan, target.id, "secret", instruction.slice(0, 120));
    const message = `${target.title} 일정은 이제 동반자 화면에는 보이지 않아요. 하루온은 계속 이 일정까지 포함해서 동선과 시간을 맞출게요.`;
    return { handled: true, plan: record(next, instruction, message, [target.id], true), message, changedItemIds: [target.id] };
  }

  return { handled: false, plan, message: "", changedItemIds: [] };
}
