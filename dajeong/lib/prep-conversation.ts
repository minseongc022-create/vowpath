import { appendPlanConversation } from "./plan-engine";
import { checkPrepFeasibility, createPrepItem, shiftDate, suggestPrepCategories } from "./prep-engine";
import type { DajeongPlan, PrepCategory, PrepItem } from "./types";

export type PrepResult = { handled: boolean; plan: DajeongPlan; message: string; prepItemIds: string[] };

const CATEGORY_TERMS: Array<[PrepCategory, RegExp]> = [
  ["flower", /꽃(?:다발)?/],
  ["cake", /케이크/],
  ["gift", /선물/],
  ["event_booking", /이벤트\s*(?:공간|장소|대관)|프라이빗\s*룸|서프라이즈\s*공간/],
];

function categoriesInText(text: string): PrepCategory[] {
  return CATEGORY_TERMS.filter(([, pattern]) => pattern.test(text)).map(([category]) => category);
}

export function labelFor(category: PrepCategory): string {
  return { flower: "꽃", cake: "케이크", gift: "선물", event_booking: "이벤트 공간", custom: "준비물" }[category];
}

function findPrepItems(plan: DajeongPlan, text: string, requestedPrepId?: string): PrepItem[] {
  const prep = plan.prep ?? [];
  if (requestedPrepId) return prep.filter((item) => item.id === requestedPrepId);
  const categories = categoriesInText(text);
  if (categories.length) return prep.filter((item) => categories.includes(item.category) && item.status !== "cancelled");
  const compact = text.replace(/\s+/g, "");
  const named = prep.find((item) => compact.includes(item.title.replace(/\s+/g, "")));
  return named ? [named] : [];
}

function upsertPrep(plan: DajeongPlan, next: PrepItem[]): DajeongPlan {
  return { ...plan, prep: next };
}

function replacePrepItem(plan: DajeongPlan, id: string, updater: (item: PrepItem) => PrepItem): DajeongPlan {
  return upsertPrep(plan, (plan.prep ?? []).map((item) => item.id === id ? { ...updater(item), updatedAt: new Date().toISOString() } : item));
}

function relatedMealItem(plan: DajeongPlan) {
  return plan.items.find((item) => item.category === "meal");
}

export function applyPrepInstruction(plan: DajeongPlan, instructionRaw: string, requestedPrepId?: string): PrepResult {
  const instruction = instructionRaw.trim();

  // 완전 거절 — 계속 권하지 않기 위한 플래그
  if (/^(아무것도\s*안\s*할래|필요\s*없어|괜찮아|안\s*할게|그냥\s*밥만|생략할래)[.!~\s]*$/.test(instruction) && !categoriesInText(instruction).length) {
    const next = { ...plan, prepDeclined: true };
    const message = "알겠어요, 따로 준비할 건 없는 걸로 할게요. 나중에 마음이 바뀌면 언제든 말해 주세요.";
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [] };
  }

  // 이미 준비함 — 다시 권하지 않고, 있으면 완료 처리
  if (/이미\s*(샀|준비|예약|주문)|필요\s*없|다\s*했어/.test(instruction)) {
    const targets = findPrepItems(plan, instruction, requestedPrepId);
    if (targets.length) {
      let next = plan;
      targets.forEach((item) => { next = replacePrepItem(next, item.id, (entry) => ({ ...entry, status: "confirmed" })); });
      const titles = targets.map((item) => item.title).join(", ");
      const message = `${titles}은 이미 준비했다고 기록했어요. 다시 추천하지 않을게요.`;
      return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: targets.map((item) => item.id) };
    }
    const categories = categoriesInText(instruction);
    if (categories.length || /선물|꽃|케이크/.test(instruction)) {
      const next = { ...plan, prepDeclined: plan.prep?.length ? plan.prepDeclined : true };
      const message = "알겠어요, 그 부분은 이미 준비됐다고 기억할게요.";
      return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [] };
    }
  }

  // 뭘 준비해야 할지 모르겠어 — 소수만 제안
  if (/뭘\s*준비|모르겠|추천해\s*줘|뭐가\s*좋을까/.test(instruction) && /준비|선물|서프라이즈|이벤트/.test(instruction)) {
    const suggestions = suggestPrepCategories(plan.situation);
    if (!suggestions.length) {
      const message = "지금 상황에서는 꼭 챙길 준비물이 필요해 보이진 않아요. 생각나는 게 있으면 편하게 말해 주세요.";
      return { handled: true, plan: appendPlanConversation(plan, instruction, message), message, prepItemIds: [] };
    }
    const created = suggestions.map((suggestion) => createPrepItem(plan, { category: suggestion.category, title: labelFor(suggestion.category) }));
    const next = upsertPrep(plan, [...(plan.prep ?? []), ...created]);
    const message = `${suggestions.map((s) => `${labelFor(s.category)}(${s.reason})`).join(", ")} 정도를 준비해보면 어떨까요? 마음에 안 들면 바로 빼도 돼요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: created.map((item) => item.id) };
  }

  // 준비 추가 — "꽃이랑 케이크 하고 싶어", "선물도 준비해줘"
  const wantsPrep = /하고\s*싶어|준비해\s*줘|준비하자|준비할래|사고\s*싶어|주문해\s*줘|예약해\s*줘/.test(instruction);
  const mentionedCategories = categoriesInText(instruction);
  if (wantsPrep && mentionedCategories.length) {
    const existingCategories = new Set((plan.prep ?? []).filter((item) => item.status !== "cancelled").map((item) => item.category));
    const toCreate = mentionedCategories.filter((category) => !existingCategories.has(category));
    if (!toCreate.length) {
      const message = "이미 준비 목록에 있어요. 시간이나 방식을 바꾸고 싶으면 말해 주세요.";
      return { handled: true, plan: appendPlanConversation(plan, instruction, message), message, prepItemIds: [] };
    }
    const created = toCreate.map((category) => createPrepItem(plan, {
      category,
      title: labelFor(category),
      relatedMainItemId: category === "flower" || category === "cake" ? relatedMealItem(plan)?.id : undefined,
    }));
    const next = upsertPrep({ ...plan, prepDeclined: false }, [...(plan.prep ?? []), ...created]);
    const notes = created.map((item) => `${item.title}: ${item.handlingReason || "당일 동선에 맞춰 픽업 방식을 추천했어요."}`).join(" ");
    const message = `${created.map((item) => item.title).join(", ")}을 준비 목록에 넣었어요. ${notes}`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: created.map((item) => item.id) };
  }

  const targets = findPrepItems(plan, instruction, requestedPrepId);
  if (!targets.length) return { handled: false, plan, message: "", prepItemIds: [] };
  const target = targets[0];

  // 취소
  if (/취소하자|취소해|빼자|그냥\s*빼/.test(instruction)) {
    const next = replacePrepItem(plan, target.id, (item) => ({ ...item, status: "cancelled" }));
    const message = `${target.title} 준비는 취소했어요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }

  // 완료 처리
  if (/준비\s*완료|다\s*됐어|끝냈어|픽업했어|받았어/.test(instruction)) {
    const status = /픽업했어|받았어/.test(instruction) ? "picked_up" : "ready";
    const next = replacePrepItem(plan, target.id, (item) => ({ ...item, status }));
    const message = `${target.title} 준비를 완료로 표시했어요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }

  // 타이밍 — 전날 / 당일 픽업
  if (/전날|하루\s*전/.test(instruction)) {
    const newDate = shiftDate(plan.situation.targetDate, -1);
    const next = replacePrepItem(plan, target.id, (item) => ({ ...item, date: newDate, handling: "pickup" }));
    const message = `${target.title}은 ${newDate}(하루 전)에 준비하는 걸로 옮겼어요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }
  if (/당일\s*(픽업|찾아갈래|살래)/.test(instruction)) {
    const next = replacePrepItem(plan, target.id, (item) => ({ ...item, date: plan.situation.targetDate, handling: "pickup" }));
    const message = `${target.title}은 당일 픽업으로 맞췄어요. 동선에 맞는 시간으로 잡을게요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }

  // 보관/유출 우려 — "들고 다니면 들키잖아"
  if (/들키|눈치채|들고.{0,10}다니기.{0,4}싫|하루\s*종일.{0,10}(들고|가지고)/.test(instruction)) {
    const mealItem = relatedMealItem(plan);
    const next = replacePrepItem(plan, target.id, (item) => ({
      ...item,
      handling: "delivery",
      deliverToItemId: mealItem?.id ?? item.deliverToItemId,
      storageNote: "장시간 소지 대신 배송·사전 전달 방식으로 바꿨어요.",
    }));
    const message = mealItem
      ? `${target.title}은 들고 다니지 않도록 ${mealItem.title}(으)로 바로 전달되게 바꿨어요.`
      : `${target.title}은 들고 다니지 않도록 배송이나 보관 방식을 찾아볼게요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }

  // 배송/전달 대상 지정 — "케이크는 식당으로 보내"
  if (/식당으로\s*보내|장소로\s*보내|전달해\s*줘|배송해\s*줘/.test(instruction)) {
    const mealItem = relatedMealItem(plan);
    const deliverTarget = mealItem ?? plan.items.find((item) => item.category === "activity");
    const next = replacePrepItem(plan, target.id, (item) => ({ ...item, handling: "delivery", deliverToItemId: deliverTarget?.id }));
    const message = deliverTarget
      ? `${target.title}은 ${deliverTarget.title} 시간에 맞춰 전달되도록 준비할게요.`
      : `${target.title}을 배송으로 바꿨어요. 다만 전달할 장소를 아직 못 정했어요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }

  // 보관 위치 — "차에 두자"
  if (/차에\s*두자|차\s*안에\s*두자|숙소에\s*두자|보관함/.test(instruction)) {
    const storageNote = /차/.test(instruction) ? "차량에 보관" : /숙소/.test(instruction) ? "숙소에 보관" : "보관함 이용";
    const next = replacePrepItem(plan, target.id, (item) => ({ ...item, handling: "self_prepared", storageNote }));
    const message = `${target.title}은 ${storageNote}하는 걸로 기록했어요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }

  // 시간 이동 — "픽업 시간 한 시간 늦춰"
  const minutesMatch = instruction.match(/(\d{1,3})\s*분/);
  const hoursMatch = instruction.match(/한\s*시간|1\s*시간/);
  if ((minutesMatch || hoursMatch) && /늦춰|미뤄|당겨/.test(instruction) && target.time) {
    const delta = (minutesMatch ? Number(minutesMatch[1]) : 60) * (/당겨/.test(instruction) ? -1 : 1);
    const [hour, minute] = target.time.split(":").map(Number);
    const totalMinutes = Math.max(0, Math.min(23 * 60 + 59, hour * 60 + minute + delta));
    const nextTime = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
    const next = replacePrepItem(plan, target.id, (item) => ({ ...item, time: nextTime }));
    const message = `${target.title} 시간을 ${nextTime}로 옮겼어요.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, prepItemIds: [target.id] };
  }

  return { handled: false, plan, message: "", prepItemIds: [] };
}

export { checkPrepFeasibility };
