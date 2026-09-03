import {
  approvePayment,
  isExplicitPaymentApproval,
  prepareReservationOrder,
  requestPaymentReview,
} from "./reservation-engine";
import type { DajeongPlan, PlanCategory, PlanItem } from "./types";

export type ExecutionConversationResult = {
  handled: boolean;
  plan: DajeongPlan;
  message: string;
  targetItemIds: string[];
};

const CATEGORY_PATTERN: Array<[PlanCategory, RegExp]> = [
  ["meal", /식당|식사|저녁|밥/],
  ["activity", /전시|공연|체험|티켓|예매/],
  ["lodging", /숙소|호텔|펜션/],
  ["flower", /꽃|꽃다발/],
  ["cake", /케이크/],
  ["gift", /선물|상품/],
  ["cafe", /카페/],
  ["view", /야경|전망/],
  ["moment", /편지|카드/],
];

function targetItems(plan: DajeongPlan, instruction: string, requestedItemId?: string): PlanItem[] {
  if (requestedItemId) {
    const selected = plan.items.find((item) => item.id === requestedItemId);
    return selected ? [selected] : [];
  }
  const compact = instruction.replace(/\s+/g, "");
  const named = plan.items.find((item) => compact.includes(item.title.replace(/\s+/g, "")));
  if (named) return [named];
  const category = CATEGORY_PATTERN.find(([, pattern]) => pattern.test(instruction))?.[0];
  if (category) {
    const sameCategory = plan.items.filter((item) => item.category === category);
    if (/첫\s*날|첫째\s*날|1\s*일차/.test(instruction)) return sameCategory.filter((item) => (item.dayNumber ?? 1) === 1).slice(0, 1);
    if (/둘째\s*날|2\s*일차/.test(instruction)) return sameCategory.filter((item) => item.dayNumber === 2).slice(0, 1);
    return sameCategory.length === 1 ? sameCategory : sameCategory.slice(0, 1);
  }
  if (plan.situation.planScope === "single" && plan.items.length === 1) return [plan.items[0]];
  const recentCategory = plan.revisions?.[0]?.changedCategories?.[0];
  if (/이거|그거|여기|거기|이곳|그곳|방금|아까/.test(instruction) && recentCategory) {
    const recent = plan.items.find((item) => item.category === recentCategory);
    if (recent) return [recent];
  }
  const reservable = plan.items.filter((item) => item.reservationRequired);
  return reservable.length === 1 ? reservable : [];
}

function reservationMessage(plan: DajeongPlan): string {
  const order = plan.execution;
  const task = order?.tasks.find((entry) => order.requestedItemIds.includes(entry.itemId));
  if (!task) return "어떤 항목을 예약할지 정확히 가리켜 주세요. 장소 이름이나 ‘첫날 저녁’처럼 말해도 돼요.";
  if (task.bookingMethod === "phone_only") {
    const number = task.phoneNumber ? ` 확인된 번호는 ${task.phoneNumber}예요.` : " 확인된 전화번호는 아직 없어요.";
    return `${task.title}은 전화 예약이 필요해요. 아직 예약된 상태는 아니에요.${number} 실행 화면에 바로 읽을 수 있는 문의 문구를 준비했어요.`;
  }
  if (["external_online", "external_platform"].includes(task.bookingMethod)) {
    return `${task.title}의 ${task.providerLabel} 경로를 연결했어요. 외부 화면에서 실제 가능 여부와 최종 금액을 확인해야 하며, 링크를 여는 것만으로 예약 완료 처리하지 않아요.`;
  }
  if (task.bookingMethod === "haruon_direct") {
    return `${task.title}은 연결된 제공자에 실제 가능 여부와 가격을 확인하는 단계예요. 결과가 오면 정확한 금액을 보여드리고 다시 승인받을게요.`;
  }
  return `${task.title}의 공식 예약 방식이나 실시간 가능 여부를 아직 확인하지 못했어요. 검색 화면을 예약 완료로 가장하지 않고, 확인 가능한 경로가 생길 때까지 ‘추가 정보 필요’로 둘게요.`;
}

export function handleExecutionInstruction(plan: DajeongPlan, instruction: string, requestedItemId?: string): ExecutionConversationResult {
  const text = instruction.trim();
  const current = plan.execution;
  if (current && isExplicitPaymentApproval(text, current)) {
    const execution = approvePayment(current, text);
    return { handled: true, plan: { ...plan, execution }, message: execution.message, targetItemIds: execution.requestedItemIds };
  }

  const ambiguousPositive = /^(좋네|좋다|괜찮네|괜찮다|마음에\s*드네|이걸로\s*하자|진행해\s*줘)[.!~\s]*$/.test(text);
  if (current?.approval && ["requested", "reapproval_required"].includes(current.approval.state) && ambiguousPositive) {
    return {
      handled: true,
      plan,
      message: `좋다는 뜻은 이해했지만 결제 승인으로 받지는 않았어요. ${current.approval.amount.toLocaleString("ko-KR")}원을 어떤 항목에 결제하는지 확인한 뒤 금액을 포함해 명시적으로 승인해 주세요.`,
      targetItemIds: current.requestedItemIds,
    };
  }

  const asksPayment = /(?:이걸로|이거|그거)?.{0,5}(?:결제|구매).{0,5}(?:해|하자|진행)|(?:결제|구매)할게/.test(text);
  if (asksPayment) {
    const targets = targetItems(plan, text, requestedItemId);
    const baseOrder = current ?? prepareReservationOrder(plan, {
      targetItemIds: targets.map((item) => item.id),
      includeTravel: false,
    });
    const execution = requestPaymentReview(baseOrder);
    return { handled: true, plan: { ...plan, execution }, message: execution.message, targetItemIds: execution.requestedItemIds };
  }

  const asksExecution = /예약\s*(?:해|해줘|하고\s*싶|잡아|진행)|예매\s*(?:해|해줘|하자)|주문\s*(?:해|해줘|하자)/.test(text);
  if (!asksExecution) return { handled: false, plan, message: "", targetItemIds: [] };

  const targets = targetItems(plan, text, requestedItemId);
  if (!targets.length) {
    return {
      handled: true,
      plan,
      message: "어떤 항목을 예약할지 정확히 가리켜 주세요. 장소 이름이나 ‘첫날 저녁’, ‘두 번째 전시’처럼 편하게 말하면 돼요.",
      targetItemIds: [],
    };
  }
  const execution = prepareReservationOrder(plan, {
    previous: current,
    targetItemIds: targets.map((item) => item.id),
    includeTravel: false,
  });
  const next = { ...plan, execution };
  return { handled: true, plan: next, message: reservationMessage(next), targetItemIds: execution.requestedItemIds };
}
