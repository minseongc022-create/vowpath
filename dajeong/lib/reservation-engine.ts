import type {
  BookingMethod,
  DajeongPlan,
  ExecutionApproval,
  ExecutionTaskKind,
  PlanItem,
  PrepItem,
  ReservationOrder,
  ReservationTask,
  ReservationTaskStatus,
} from "./types";

type PrepareOptions = {
  previous?: ReservationOrder;
  targetItemIds?: string[];
  includeTravel?: boolean;
};

export type ProviderQuote = {
  available: boolean;
  confirmedTotalAmount: number;
  prepayAmount: number;
  onsiteAmount: number;
  quoteId: string;
  checkedAt: string;
  proposedAlternative?: {
    time?: string;
    title?: string;
    amount?: number;
    additionalCost?: number;
    cancellationTerms?: string;
    reason: string;
  };
};

export type ProviderExecutionResult =
  | { ok: true; confirmationId: string; confirmedAt: string; details?: string }
  | { ok: false; reason: string; alternativeRequired?: boolean };

export type ExecutionProviderAdapter = {
  id: string;
  method: "haruon_direct" | "phone_only";
  check(task: ReservationTask): Promise<ProviderQuote>;
  execute(input: { task: ReservationTask; approval: ExecutionApproval; approvedPersonalFields: ReservationTask["privacy"]["approvedFields"] }): Promise<ProviderExecutionResult>;
};

const PLATFORM_PATTERN = /booking\.naver|catchtable|tablecheck|booking\.com|yanolja|yeogi|interpark|ticketlink|kakao/i;
const SEARCH_PATTERN = /search\.(naver|daum)|google\.com\/search/i;

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function subtractMinutes(value: string, minutes: number): string {
  const [hour, minute] = value.split(":").map(Number);
  const total = Math.max(0, hour * 60 + minute - minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function methodLabel(method: BookingMethod): string {
  return {
    haruon_direct: "하루위드 직접 실행",
    external_online: "업체 공식 온라인 예약",
    external_platform: "외부 예약 플랫폼",
    phone_only: "전화 예약",
    walk_in: "현장 방문",
    no_reservation: "예약 불필요",
    unsupported: "현재 미지원",
  }[method];
}

export function bookingMethodForItem(item: PlanItem): BookingMethod {
  if (!item.reservationRequired) return item.reality?.reservationState === "walk_in" ? "walk_in" : "no_reservation";
  if (item.reality?.bookingMethod) return item.reality.bookingMethod;
  if (item.reality?.reservationState === "supported" && item.reality.bookingProviderId) return "haruon_direct";
  const reservationUrl = item.reality?.reservationUrl;
  if (reservationUrl) return PLATFORM_PATTERN.test(reservationUrl) ? "external_platform" : "external_online";
  const website = item.reality?.websiteUrl;
  if (website) return PLATFORM_PATTERN.test(website) ? "external_platform" : "external_online";
  if (PLATFORM_PATTERN.test(item.href) && !SEARCH_PATTERN.test(item.href)) return "external_platform";
  return "unsupported";
}

function taskKind(item: PlanItem): ExecutionTaskKind {
  if (item.category === "activity") return "ticket";
  if (["flower", "cake", "gift"].includes(item.category)) return "purchase";
  if (item.category === "lodging") return "lodging";
  return "reservation";
}

function fingerprint(item: PlanItem, method: BookingMethod): string {
  return [item.id, item.title, item.time, item.dayNumber ?? 1, item.price, method, item.reality?.placeId ?? ""].join("|");
}

function initialStatus(method: BookingMethod): ReservationTaskStatus {
  if (method === "haruon_direct") return "checking";
  if (method === "phone_only") return "phone_required";
  if (method === "external_online" || method === "external_platform") return "user_action";
  if (method === "walk_in" || method === "no_reservation") return "not_started";
  return "unsupported";
}

function explanation(method: BookingMethod): string {
  return {
    haruon_direct: "연결된 제공자에서 실제 가능 여부와 정확한 금액을 받은 뒤 승인 단계로 넘어가요.",
    external_online: "업체 공식 페이지에서 가능 여부와 최종 금액을 직접 확인해야 해요. 페이지를 여는 것만으로 예약되지는 않아요.",
    external_platform: "외부 예약 플랫폼에서 가능 여부와 최종 금액을 확인해야 해요. 하루위드에는 아직 완료 결과가 자동으로 돌아오지 않아요.",
    phone_only: "전화로 가능 여부를 확인해야 해요. 현재 하루위드는 직접 통화하지 않으므로 통화 문구를 준비해 드려요.",
    walk_in: "별도 예약 없이 방문하는 방식이에요. 방문 직전 영업 상태와 대기를 다시 확인하세요.",
    no_reservation: "예약이 필요 없는 일정이에요. 방문 시간의 운영 여부만 확인하면 돼요.",
    unsupported: "예약 방식이나 공식 실행 경로를 아직 확인하지 못했어요. 검색 링크를 열었다고 완료로 처리하지 않아요.",
  }[method];
}

function phoneScript(plan: DajeongPlan, item: PlanItem): string {
  const day = item.dayNumber && plan.situation.planScope === "trip" ? `${item.dayNumber}일차 ` : "";
  const product = item.category === "flower" ? "꽃다발 픽업" : item.category === "cake" ? "케이크 픽업" : "예약";
  return `안녕하세요. ${plan.situation.targetDate} ${day}${item.time}쯤 ${plan.situation.partySize}명 ${product}이 가능한지 문의드립니다. 가능하다면 정확한 가격, 취소 조건과 준비할 정보를 알려주세요.`;
}

function itemTask(plan: DajeongPlan, item: PlanItem, previous?: ReservationTask): ReservationTask {
  const method = bookingMethodForItem(item);
  const itemFingerprint = fingerprint(item, method);
  if (previous?.itemFingerprint === itemFingerprint) return previous;
  const confidence = item.reality?.priceConfidence === "provider" ? "range" as const : "estimate" as const;
  return {
    id: `execute_${plan.id}_${item.id}`,
    itemId: item.id,
    title: item.title,
    time: item.time,
    dayNumber: item.dayNumber,
    kind: taskKind(item),
    bookingMethod: method,
    capability: method === "haruon_direct" ? "automatic" : "assisted",
    status: initialStatus(method),
    providerLabel: method === "haruon_direct" ? "연결된 실행 파트너" : methodLabel(method),
    bookingUrl: item.reality?.reservationUrl || item.reality?.websiteUrl || item.reality?.detailsUrl || item.href,
    explanation: explanation(method),
    availability: method === "haruon_direct" ? "checking" : "unknown",
    price: {
      currency: "KRW",
      estimatedAmount: item.price,
      onsiteAmount: item.price,
      confidence,
    },
    privacy: {
      requiredFields: item.reservationRequired ? ["name", "phone"] : [],
      approvedFields: [],
      purpose: `${item.title} 예약·주문에 필요한 최소 정보 전달`,
    },
    phoneNumber: item.reality?.phoneNumber,
    phoneHours: item.reality?.phoneHours,
    phoneScript: method === "phone_only" ? phoneScript(plan, item) : undefined,
    itemFingerprint,
  };
}

function bookingMethodForPrep(item: PrepItem): BookingMethod {
  if (item.handling === "self_prepared" || item.status === "cancelled") return "no_reservation";
  const reservationUrl = item.reality?.reservationUrl;
  if (reservationUrl) return PLATFORM_PATTERN.test(reservationUrl) ? "external_platform" : "external_online";
  const website = item.reality?.websiteUrl;
  if (website) return PLATFORM_PATTERN.test(website) ? "external_platform" : "external_online";
  if (item.reality?.phoneNumber) return "phone_only";
  return "unsupported";
}

function prepFingerprint(item: PrepItem, method: BookingMethod): string {
  return [item.id, item.title, item.date, item.time ?? "", item.price ?? 0, method, item.reality?.placeId ?? ""].join("|");
}

function prepPhoneScript(item: PrepItem): string {
  const when = item.time ? `${item.date} ${item.time}쯤` : `${item.date}쯤`;
  return `안녕하세요. ${when} ${item.title} 준비(주문/예약)가 가능한지 문의드립니다. 가능하다면 정확한 가격, 픽업·배송 조건과 준비할 정보를 알려주세요.`;
}

function prepTask(plan: DajeongPlan, item: PrepItem, previous?: ReservationTask): ReservationTask {
  const method = bookingMethodForPrep(item);
  const itemFingerprint = prepFingerprint(item, method);
  if (previous?.itemFingerprint === itemFingerprint) return previous;
  const confidence = item.priceConfidence === "provider_quote" ? "range" as const : "estimate" as const;
  return {
    id: `execute_${plan.id}_prep_${item.id}`,
    itemId: item.id,
    title: item.title,
    time: item.time ?? "미정",
    kind: "purchase",
    bookingMethod: method,
    capability: "assisted",
    status: initialStatus(method),
    providerLabel: methodLabel(method),
    bookingUrl: item.reality?.reservationUrl || item.reality?.websiteUrl || item.reality?.detailsUrl || "",
    explanation: explanation(method),
    availability: item.reality ? "unknown" : "unknown",
    price: { currency: "KRW", estimatedAmount: item.price ?? 0, onsiteAmount: item.price ?? 0, confidence },
    privacy: {
      requiredFields: method === "no_reservation" ? [] : ["name", "phone"],
      approvedFields: [],
      purpose: `${item.title} 준비(주문·예약)에 필요한 최소 정보 전달`,
    },
    phoneNumber: item.reality?.phoneNumber,
    phoneHours: item.reality?.phoneHours,
    phoneScript: method === "phone_only" ? prepPhoneScript(item) : undefined,
    itemFingerprint,
  };
}

/**
 * Ensures the execution order reflects the plan's current prep items (flower/cake/gift/venue),
 * without disturbing whatever scope the main-item order already has. Additive-only: when there
 * are no active prep items and no existing order, this is a no-op, so it never changes behavior
 * for plans that don't use prep at all.
 */
export function syncPrepReservations(plan: DajeongPlan): DajeongPlan {
  const activePrep = (plan.prep ?? []).filter((item) => item.status !== "cancelled" && item.handling !== "self_prepared");
  const previous = plan.execution;
  if (!previous) {
    if (!activePrep.length) return plan;
    return { ...plan, execution: prepareReservationOrder(plan, { targetItemIds: activePrep.map((item) => item.id), includeTravel: false }) };
  }
  const scope = previous.requestedScope;
  const targetItemIds = scope === "selection"
    ? [...new Set([...previous.requestedItemIds, ...activePrep.map((item) => item.id)])]
    : undefined;
  return {
    ...plan,
    execution: prepareReservationOrder(plan, { previous, targetItemIds, includeTravel: scope === "whole_plan" }),
  };
}

function logisticsTask(plan: DajeongPlan, kind: "arrival" | "rental_pickup" | "checkout" | "luggage" | "rental_return" | "departure", values: { time: string; dayNumber: number; title: string; explanation: string; dependsOn?: string[] }): ReservationTask {
  const taskId = `travel_${plan.id}_${kind}`;
  const reservable = ["arrival", "rental_pickup", "rental_return", "departure"].includes(kind);
  return {
    id: taskId,
    itemId: taskId,
    title: values.title,
    time: values.time,
    dayNumber: values.dayNumber,
    kind: kind.includes("rental") ? "rental_car" : reservable ? "transport" : "logistics",
    bookingMethod: reservable ? "unsupported" : "no_reservation",
    capability: "assisted",
    status: reservable ? "needs_information" : "not_started",
    providerLabel: reservable ? "실제 교통·렌터카 후보 필요" : "일정 물류",
    bookingUrl: "",
    explanation: values.explanation,
    availability: "unknown",
    price: { currency: "KRW", estimatedAmount: 0, confidence: "estimate" },
    privacy: { requiredFields: [], approvedFields: [], purpose: "여행 일정 연결" },
    dependsOnTaskIds: values.dependsOn,
    itemFingerprint: [kind, values.time, values.dayNumber, plan.situation.transport, plan.situation.region].join("|"),
  };
}

function travelTasks(plan: DajeongPlan, previous?: ReservationOrder): ReservationTask[] {
  if (plan.situation.planScope !== "trip") return [];
  const previousById = new Map(previous?.tasks.map((task) => [task.id, task]) ?? []);
  const lastDay = plan.situation.tripDays ?? 1;
  const arrival = plan.situation.arrivalTime ?? "도착 시간 미정";
  const departure = plan.situation.returnDepartureTime ?? "출발 시간 미정";
  const results: ReservationTask[] = [];
  const add = (task: ReservationTask) => {
    const old = previousById.get(task.id);
    results.push(old?.itemFingerprint === task.itemFingerprint ? old : task);
  };
  add(logisticsTask(plan, "arrival", {
    time: plan.situation.arrivalTime ?? "00:00",
    dayNumber: 1,
    title: `${plan.situation.region} 도착편 확인`,
    explanation: `${arrival} 도착을 일정 기준으로 사용 중이에요. 실제 항공·교통편의 예매와 지연 정보는 아직 연결되지 않았어요.`,
  }));
  let pickupId: string | undefined;
  if (plan.situation.transport === "car") {
    const pickup = logisticsTask(plan, "rental_pickup", {
      time: plan.situation.arrivalTime ?? "00:00",
      dayNumber: 1,
      title: "렌터카 수령 조건 확인",
      explanation: "도착 뒤 60분을 수하물 수령·셔틀·계약·차량 인수에 확보했어요. 실제 업체와 가격은 아직 선택되지 않았어요.",
      dependsOn: [`travel_${plan.id}_arrival`],
    });
    pickupId = pickup.id;
    add(pickup);
  }
  for (const item of plan.logistics ?? []) {
    if (!["checkout", "luggage"].includes(item.kind)) continue;
    add(logisticsTask(plan, item.kind as "checkout" | "luggage", {
      time: item.time,
      dayNumber: item.dayNumber,
      title: item.title,
      explanation: item.note,
    }));
  }
  if (plan.situation.transport === "car") {
    add(logisticsTask(plan, "rental_return", {
      time: plan.situation.returnDepartureTime ? subtractMinutes(plan.situation.returnDepartureTime, 120) : "00:00",
      dayNumber: lastDay,
      title: "렌터카 반납",
      explanation: `${departure} 출발을 기준으로 주유·반납·셔틀·공항 수속 시간을 역산했어요. 실제 업체 반납 조건은 아직 확인 전이에요.`,
      dependsOn: pickupId ? [pickupId] : undefined,
    }));
  }
  add(logisticsTask(plan, "departure", {
    time: plan.situation.returnDepartureTime ?? "00:00",
    dayNumber: lastDay,
    title: "귀가편 출발 확인",
    explanation: `${departure} 출발을 일정 마감 기준으로 사용 중이에요. 실제 표·좌석·터미널은 아직 확인되지 않았어요.`,
    dependsOn: plan.situation.transport === "car" ? [`travel_${plan.id}_rental_return`] : undefined,
  }));
  return results;
}

function orderStatus(tasks: ReservationTask[], approval?: ExecutionApproval): ReservationOrder["status"] {
  if (!tasks.length) return "completed";
  const successes = tasks.filter((task) => ["completed", "booked", "purchased"].includes(task.status)).length;
  const failures = tasks.filter((task) => ["failed", "alternative_required"].includes(task.status)).length;
  if (successes && failures) return "partially_completed";
  if (failures === tasks.length) return "failed";
  if (tasks.some((task) => task.status === "alternative_required")) return "alternative_required";
  if (tasks.every((task) => ["completed", "booked", "purchased", "not_started"].includes(task.status))) return successes ? "completed" : "not_started";
  if (tasks.some((task) => task.status === "executing")) return "executing";
  if (approval?.state === "requested" || approval?.state === "reapproval_required") return "needs_approval";
  if (tasks.some((task) => task.status === "needs_information")) return "needs_information";
  if (tasks.some((task) => task.status === "checking")) return "checking";
  if (tasks.some((task) => ["user_action", "phone_required", "unsupported"].includes(task.status))) return "partially_manual";
  return "ready";
}

function totals(plan: DajeongPlan, tasks: ReservationTask[]) {
  const payableNow = tasks.reduce((sum, task) => sum + (task.price.prepayAmount ?? 0), 0);
  const confirmedOnsite = tasks.reduce((sum, task) => sum + (task.price.onsiteAmount ?? 0), 0);
  const selectedItemIds = new Set(tasks.map((task) => task.itemId));
  const selectedItems = plan.items.filter((item) => selectedItemIds.has(item.id));
  const selectedPrep = (plan.prep ?? []).filter((item) => selectedItemIds.has(item.id));
  const selectedEstimate = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const prepEstimate = selectedPrep.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const estimatedTotal = (selectedItems.length === plan.items.length ? plan.total : selectedEstimate) + prepEstimate;
  return {
    payableNow,
    estimatedTotal,
    prepEstimate,
    onsiteEstimated: confirmedOnsite || Math.max(0, estimatedTotal - payableNow),
    unconfirmedPriceTaskIds: tasks.filter((task) => ["reservation", "ticket", "purchase", "lodging", "rental_car", "transport"].includes(task.kind) && task.price.confidence !== "provider_quote").map((task) => task.id),
  };
}

function messageFor(tasks: ReservationTask[]): string {
  if (!tasks.length) return "실행할 예약·구매 항목은 없어요. 방문 시간의 운영 여부만 다시 확인하면 돼요.";
  const phone = tasks.filter((task) => task.bookingMethod === "phone_only").length;
  const external = tasks.filter((task) => ["external_online", "external_platform"].includes(task.bookingMethod)).length;
  const unsupported = tasks.filter((task) => task.bookingMethod === "unsupported").length;
  return `실행 항목 ${tasks.length}개를 같은 계획에 연결했어요.${external ? ` 외부 확인 ${external}개` : ""}${phone ? `, 직접 전화 필요 ${phone}개` : ""}${unsupported ? `, 연동 전 ${unsupported}개` : ""}. 실제 확인 전에는 예약·결제 완료로 표시하지 않아요.`;
}

export function prepareReservationOrder(plan: DajeongPlan, options: PrepareOptions = {}): ReservationOrder {
  const requested = new Set(options.targetItemIds ?? []);
  const selectedItems = plan.items.filter((item) => item.reservationRequired && (!requested.size || requested.has(item.id)));
  const selectedPrep = (plan.prep ?? []).filter((item) => item.status !== "cancelled" && item.handling !== "self_prepared" && (!requested.size || requested.has(item.id)));
  const previousByItem = new Map(options.previous?.tasks.map((task) => [task.itemId, task]) ?? []);
  const tasks = [
    ...selectedItems.map((item) => itemTask(plan, item, previousByItem.get(item.id))),
    ...selectedPrep.map((item) => prepTask(plan, item, previousByItem.get(item.id))),
  ];
  if ((options.includeTravel ?? !requested.size) && plan.situation.planScope === "trip") tasks.push(...travelTasks(plan, options.previous));
  const scopedCosts = totals(plan, tasks);
  const costs = requested.size ? scopedCosts : {
    ...scopedCosts,
    estimatedTotal: plan.total + scopedCosts.prepEstimate,
    onsiteEstimated: Math.max(0, plan.total + scopedCosts.prepEstimate - scopedCosts.payableNow),
  };
  const approval = options.previous?.approval && options.previous.approval.taskIds.every((taskId) => tasks.some((task) => task.id === taskId))
    ? options.previous.approval
    : undefined;
  const now = new Date().toISOString();
  return {
    id: options.previous?.id ?? id("order"),
    planId: plan.id,
    createdAt: options.previous?.createdAt ?? now,
    updatedAt: now,
    status: orderStatus(tasks, approval),
    tasks,
    depositTotal: costs.payableNow,
    estimatedTotal: costs.estimatedTotal,
    payableNow: costs.payableNow,
    onsiteEstimated: costs.onsiteEstimated,
    unconfirmedPriceTaskIds: costs.unconfirmedPriceTaskIds,
    requestedItemIds: [...selectedItems.map((item) => item.id), ...selectedPrep.map((item) => item.id)],
    requestedScope: requested.size ? "selection" : "whole_plan",
    approval,
    message: messageFor(tasks),
  };
}

export function reconcileReservationOrder(plan: DajeongPlan): DajeongPlan {
  if (!plan.execution) return plan;
  const targetItemIds = plan.execution.requestedScope === "selection" ? plan.execution.requestedItemIds : undefined;
  return {
    ...plan,
    execution: prepareReservationOrder(plan, {
      previous: plan.execution,
      targetItemIds,
      includeTravel: plan.execution.requestedScope === "whole_plan",
    }),
  };
}

function termsFingerprint(tasks: ReservationTask[], amount: number): string {
  return [...tasks].sort((a, b) => a.id.localeCompare(b.id)).map((task) => `${task.id}:${task.price.quoteId ?? "none"}:${task.price.prepayAmount ?? 0}`).join("|") + `|${amount}`;
}

export function requestPaymentReview(order: ReservationOrder): ReservationOrder {
  const payable = order.tasks.filter((task) => task.availability === "available" && (task.price.prepayAmount ?? 0) > 0 && task.price.confidence === "provider_quote");
  const amount = payable.reduce((sum, task) => sum + (task.price.prepayAmount ?? 0), 0);
  const now = new Date().toISOString();
  if (!payable.length) {
    return {
      ...order,
      updatedAt: now,
      status: "needs_information",
      message: "결제할 항목의 정확한 가격이나 실시간 가능 여부가 아직 확인되지 않았어요. 금액을 추측해 승인받거나 결제하지 않을게요.",
    };
  }
  const approval: ExecutionApproval = {
    id: id("approval"),
    state: "requested",
    taskIds: payable.map((task) => task.id),
    amount,
    currency: "KRW",
    requestedAt: now,
    termsFingerprint: termsFingerprint(payable, amount),
  };
  const tasks = order.tasks.map((task) => approval.taskIds.includes(task.id) ? { ...task, status: "needs_approval" as const } : task);
  return {
    ...order,
    updatedAt: now,
    status: "needs_approval",
    tasks,
    approval,
    message: `${payable.map((task) => task.title).join(", ")} 사전결제 ${amount.toLocaleString("ko-KR")}원을 확인했어요. 항목과 금액을 보고 명시적으로 승인해야 다음 단계로 넘어갑니다.${order.unconfirmedPriceTaskIds.length ? ` 나머지 ${order.unconfirmedPriceTaskIds.length}개는 가격 확인 전이라 이번 승인에서 제외했어요.` : ""}`,
  };
}

function normalizedDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function isExplicitPaymentApproval(text: string, order: ReservationOrder): boolean {
  const approval = order.approval;
  if (!approval || !["requested", "reapproval_required"].includes(approval.state) || approval.amount <= 0) return false;
  if (!/(결제|예약금|구매).{0,12}(동의|승인|진행)|(?:동의|승인).{0,12}(결제|예약금|구매)/.test(text)) return false;
  const amount = normalizedDigits(String(approval.amount));
  const mentioned = normalizedDigits(text);
  if (!mentioned.includes(amount)) return false;
  return approval.taskIds.some((taskId) => {
    const task = order.tasks.find((entry) => entry.id === taskId);
    return task ? text.includes(task.title) || approval.taskIds.length === 1 : false;
  });
}

export function approvePayment(order: ReservationOrder, approvalText: string): ReservationOrder {
  if (!isExplicitPaymentApproval(approvalText, order) || !order.approval) return order;
  const now = new Date().toISOString();
  const tasks = order.tasks.map((task) => order.approval?.taskIds.includes(task.id)
    ? {
        ...task,
        status: task.bookingMethod === "haruon_direct"
          ? task.privacy.requiredFields.every((field) => task.privacy.approvedFields.includes(field)) ? "ready" as const : "needs_information" as const
          : "user_action" as const,
      }
    : task);
  const approval = { ...order.approval, state: "granted" as const, approvedAt: now, approvalText };
  return {
    ...order,
    updatedAt: now,
    status: orderStatus(tasks, approval),
    tasks,
    approval,
    message: "정확한 항목과 금액에 대한 승인을 기록했어요. 연결된 제공자가 없는 항목은 자동 결제하지 않고 공식 화면에서 사용자가 완료해야 해요.",
  };
}

export function approvePrivacyDisclosure(order: ReservationOrder, taskId: string, fields: Array<"name" | "phone" | "email">): ReservationOrder {
  const now = new Date().toISOString();
  const tasks = order.tasks.map((task) => {
    if (task.id !== taskId) return task;
    const approvedFields = task.privacy.requiredFields.filter((field) => fields.includes(field));
    return {
      ...task,
      privacy: { ...task.privacy, approvedFields, disclosureApprovedAt: approvedFields.length ? now : undefined },
      status: task.status === "needs_information" && task.privacy.requiredFields.every((field) => approvedFields.includes(field)) ? "ready" as const : task.status,
    };
  });
  return { ...order, tasks, updatedAt: now, status: orderStatus(tasks, order.approval) };
}

export function applyProviderQuote(order: ReservationOrder, taskId: string, quote: ProviderQuote): ReservationOrder {
  const previousTask = order.tasks.find((task) => task.id === taskId);
  if (!previousTask) return order;
  const changedAmount = previousTask.price.confidence === "provider_quote"
    && (previousTask.price.prepayAmount !== quote.prepayAmount || previousTask.price.confirmedTotalAmount !== quote.confirmedTotalAmount);
  const tasks = order.tasks.map((task) => task.id === taskId ? {
    ...task,
    availability: quote.available ? "available" as const : "unavailable" as const,
    status: quote.available ? "needs_approval" as const : "alternative_required" as const,
    price: {
      currency: "KRW" as const,
      estimatedAmount: task.price.estimatedAmount,
      confirmedTotalAmount: quote.confirmedTotalAmount,
      prepayAmount: quote.prepayAmount,
      onsiteAmount: quote.onsiteAmount,
      confidence: "provider_quote" as const,
      quoteId: quote.quoteId,
      checkedAt: quote.checkedAt,
    },
    depositAmount: quote.prepayAmount,
    proposedChange: quote.proposedAlternative ? { ...quote.proposedAlternative, requiresApproval: true as const } : undefined,
    failureReason: quote.available ? undefined : "현재 요청 조건으로 이용할 수 없음",
  } : task);
  const payableNow = tasks.reduce((sum, task) => sum + (task.price.prepayAmount ?? 0), 0);
  const onsiteEstimated = tasks.reduce((sum, task) => sum + (task.price.onsiteAmount ?? 0), 0);
  const unconfirmedPriceTaskIds = order.unconfirmedPriceTaskIds.filter((idValue) => idValue !== taskId);
  const now = new Date().toISOString();
  const approval = changedAmount && order.approval
    ? { ...order.approval, state: "reapproval_required" as const, amount: payableNow, requestedAt: now, approvedAt: undefined, approvalText: undefined, termsFingerprint: termsFingerprint(tasks.filter((task) => (task.price.prepayAmount ?? 0) > 0), payableNow) }
    : order.approval;
  return {
    ...order,
    updatedAt: now,
    tasks,
    depositTotal: payableNow,
    payableNow,
    onsiteEstimated,
    unconfirmedPriceTaskIds,
    approval,
    status: orderStatus(tasks, approval),
    message: changedAmount ? "확인된 가격이 바뀌어 이전 승인을 무효화했어요. 새 금액을 보고 다시 승인해야 합니다." : quote.available ? "실제 제공자 견적을 받았어요. 결제 전 항목과 금액 승인이 필요합니다." : "요청한 조건으로 이용할 수 없어 이 항목만 대안을 골라야 해요.",
  };
}

export function recordProviderExecutionResult(order: ReservationOrder, taskId: string, result: ProviderExecutionResult): ReservationOrder {
  const task = order.tasks.find((entry) => entry.id === taskId);
  if (!task) return order;
  if (result.ok && task.bookingMethod === "haruon_direct" && (order.approval?.state !== "granted" || !order.approval.taskIds.includes(taskId))) return order;
  if (result.ok && !result.confirmationId.trim()) return order;
  const tasks = order.tasks.map((entry) => entry.id !== taskId ? entry : result.ok ? {
    ...entry,
    status: entry.kind === "logistics" ? "completed" as const : entry.kind === "purchase" || entry.kind === "ticket" ? "purchased" as const : "booked" as const,
    confirmation: { source: "provider" as const, confirmationId: result.confirmationId, confirmedAt: result.confirmedAt, details: result.details },
    failureReason: undefined,
  } : {
    ...entry,
    status: result.alternativeRequired ? "alternative_required" as const : "failed" as const,
    failureReason: result.reason,
  });
  const now = new Date().toISOString();
  return {
    ...order,
    updatedAt: now,
    tasks,
    status: orderStatus(tasks, order.approval),
    message: result.ok ? `${task.title} 실행 성공을 확인번호와 함께 기록했어요.` : `${task.title}만 실패했어요. 성공한 다른 항목은 그대로 두고 이 항목의 대안을 선택해야 해요.`,
  };
}

export function recordUserCompleted(order: ReservationOrder, taskId: string, confirmationText: string): ReservationOrder {
  const task = order.tasks.find((entry) => entry.id === taskId);
  if (!task || !confirmationText.trim()) return order;
  const now = new Date().toISOString();
  const tasks = order.tasks.map((entry) => entry.id === taskId ? {
    ...entry,
    status: entry.kind === "logistics" ? "completed" as const : entry.kind === "purchase" || entry.kind === "ticket" ? "purchased" as const : "booked" as const,
    confirmation: { source: "user_report" as const, confirmationId: `user_${now}`, confirmedAt: now, details: confirmationText },
  } : entry);
  return { ...order, updatedAt: now, tasks, status: orderStatus(tasks, order.approval), message: `${task.title}은 사용자가 외부에서 완료했다고 확인한 상태로 기록했어요.` };
}
