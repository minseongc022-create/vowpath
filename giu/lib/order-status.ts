import type { GiuOrderStatus, GiuOrderStatusLog, GiuPaymentStatus, GiuReservation, GiuSettlementStatus } from "./types";
import {
  isWithinNotPickedUpGrace,
  type GiuPickupPolicy,
  DEFAULT_PICKUP_POLICY,
} from "./pickup-policy";

/** Internal order status codes (English). UI labels are Korean only. */
export const GIU_ORDER_STATUSES: readonly GiuOrderStatus[] = [
  "payment_completed",
  "merchant_confirmed",
  "pickup_preparing",
  "pickup_waiting",
  "pickup_completed",
  "not_picked_up",
  "pickup_change_requested",
  "pickup_change_completed",
  "cancel_requested",
  "refund_requested",
  "refund_review",
  "refund_processing",
  "refund_completed",
  "dispute_processing",
  "admin_review_required",
  "settlement_pending",
  "settlement_completed",
  "no_show_review",
  "order_cancelled",
] as const satisfies readonly GiuOrderStatus[];

export type GiuOrderActorRole = "customer" | "merchant" | "system" | "admin";

/** @deprecated Use platformSettings.maxPickupChangesPerOrder */
export const MAX_PICKUP_CHANGE_REQUESTS = 1;

export const ORDER_STATUS_LABEL_KO: Record<GiuOrderStatus, string> = {
  payment_completed: "결제 완료",
  merchant_confirmed: "가게 확인",
  pickup_preparing: "픽업 준비 중",
  pickup_waiting: "픽업 대기",
  pickup_completed: "픽업 완료",
  not_picked_up: "미수령",
  pickup_change_requested: "픽업 변경 요청",
  pickup_change_completed: "픽업 변경 완료",
  cancel_requested: "취소 요청",
  refund_requested: "환불 요청",
  refund_review: "환불 검토",
  refund_processing: "환불 처리 중",
  refund_completed: "환불 완료",
  dispute_processing: "분쟁 처리 중",
  admin_review_required: "관리자 확인 필요",
  settlement_pending: "정산 대기",
  settlement_completed: "정산 완료",
  no_show_review: "노쇼 처리 검토",
  order_cancelled: "주문 취소",
};

export const DISPUTE_REASONS_KO = [
  "가게에 연락이 안 돼요",
  "상품이 설명과 달라요",
  "픽업 시간에 가게가 문을 닫았어요",
  "기타 문제",
] as const;

export const MERCHANT_PROBLEM_REASONS_KO = [
  "상품이 없음",
  "다른 상품을 준비함",
  "수량이 부족함",
  "가게가 영업하지 않음",
  "상품을 준비하지 않음",
  "가게 사정으로 픽업 불가",
  "상품 제공을 거부함",
  "기타",
] as const;

export const REFUND_REASONS_KO = [
  "결제 후 취소",
  "픽업할 수 없음",
  "가게 사정",
  "상품 문제",
  "상품 설명과 다름",
  "수량 부족",
  "파손",
  "품질 문제",
  "식품 안전 문제",
  "기타",
] as const;

export const PRODUCT_REPORT_KINDS_KO = [
  "다른 상품",
  "수량 부족",
  "상품 설명과 다름",
  "파손",
  "품질 문제",
  "변질",
  "부패",
  "이물",
  "보관 문제",
  "식품 안전 문제",
  "기타",
] as const;

export type GiuDisputeReason = (typeof DISPUTE_REASONS_KO)[number];

const LEGACY_STATUS_MAP: Record<string, GiuOrderStatus> = {
  giu_cho: "pickup_waiting",
  da_lay: "pickup_completed",
  het_han: "not_picked_up",
  huy: "refund_completed",
};

export function orderStatusLabelKo(status: GiuOrderStatus): string {
  return ORDER_STATUS_LABEL_KO[status] ?? status;
}

export function isGiuOrderStatus(value: string): value is GiuOrderStatus {
  return (GIU_ORDER_STATUSES as readonly string[]).includes(value);
}

export function migrateLegacyOrderStatus(
  status: string,
  paymentStatus: GiuPaymentStatus,
  settlementStatus?: GiuSettlementStatus,
): GiuOrderStatus {
  if (isGiuOrderStatus(status)) {
    if (status === "pickup_completed" && settlementStatus === "released") {
      return "settlement_completed";
    }
    return status;
  }
  const mapped = LEGACY_STATUS_MAP[status];
  if (!mapped) return paymentStatus === "paid" ? "pickup_waiting" : "order_cancelled";
  if (mapped === "pickup_completed" && settlementStatus === "released") {
    return "settlement_completed";
  }
  if (mapped === "refund_completed" && paymentStatus !== "refunded" && paymentStatus !== "paid") {
    return "order_cancelled";
  }
  if (mapped === "pickup_waiting" && paymentStatus === "pending") {
    return "order_cancelled";
  }
  return mapped;
}

/** Active pickup lifecycle — QR/code still valid. */
export function isPickupQrEligibleStatus(status: GiuOrderStatus): boolean {
  return (
    status === "payment_completed" ||
    status === "merchant_confirmed" ||
    status === "pickup_preparing" ||
    status === "pickup_waiting" ||
    status === "not_picked_up" ||
    status === "pickup_change_requested" ||
    status === "pickup_change_completed"
  );
}

export function isTerminalOrderStatus(status: GiuOrderStatus): boolean {
  return (
    status === "pickup_completed" ||
    status === "settlement_completed" ||
    status === "refund_completed" ||
    status === "order_cancelled" ||
    status === "no_show_review"
  );
}

export function isActiveCustomerOrder(res: Pick<GiuReservation, "status" | "paymentStatus">): boolean {
  if (res.paymentStatus !== "paid") return false;
  return !isTerminalOrderStatus(res.status);
}

export function isPastCustomerOrder(res: Pick<GiuReservation, "status" | "paymentStatus">): boolean {
  if (res.paymentStatus === "refunded") return true;
  return (
    res.status === "pickup_completed" ||
    res.status === "settlement_completed" ||
    res.status === "refund_completed" ||
    res.status === "order_cancelled"
  );
}

export function isMerchantOpenOrder(res: Pick<GiuReservation, "status" | "paymentStatus">): boolean {
  if (res.paymentStatus !== "paid") return false;
  return res.status !== "pickup_completed" && res.status !== "settlement_completed";
}

export function isMerchantDeliveredOrder(
  res: Pick<GiuReservation, "status" | "paymentStatus" | "settlementStatus">,
): boolean {
  return (
    res.paymentStatus === "paid" &&
    (res.status === "pickup_completed" || res.status === "settlement_completed") &&
    res.settlementStatus === "released"
  );
}

export function canCustomerRequestPickupChange(res: GiuReservation): boolean {
  if ((res.pickupChangeCount ?? 0) >= MAX_PICKUP_CHANGE_REQUESTS) return false;
  if (res.extensionRequest?.status === "pending") return false;
  if (res.merchantPickupProposal?.status === "pending") return false;
  return res.status === "not_picked_up";
}

export function notPickedUpGraceActionsAvailable(
  res: GiuReservation,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  return isWithinNotPickedUpGrace(res, policy, now);
}

export function chatAllowedForStatus(status: GiuOrderStatus): boolean {
  return (
    status === "pickup_waiting" ||
    status === "not_picked_up" ||
    status === "pickup_change_requested" ||
    status === "pickup_change_completed" ||
    status === "pickup_completed" ||
    status === "settlement_completed" ||
    status === "dispute_processing" ||
    status === "no_show_review" ||
    status === "refund_requested" ||
    status === "refund_review"
  );
}

export function appendOrderStatusLog(
  logs: GiuOrderStatusLog[],
  entry: Omit<GiuOrderStatusLog, "id" | "changedAt"> & { changedAt?: string; id?: string },
): GiuOrderStatusLog {
  const log: GiuOrderStatusLog = {
    id: entry.id ?? `oslog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    changedAt: entry.changedAt ?? new Date().toISOString(),
    reservationId: entry.reservationId,
    orderCode: entry.orderCode,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    changedByRole: entry.changedByRole,
    changedById: entry.changedById,
    reason: entry.reason,
    customerId: entry.customerId,
    merchantId: entry.merchantId,
  };
  logs.push(log);
  return log;
}

export function transitionOrderStatus(
  logs: GiuOrderStatusLog[],
  res: GiuReservation,
  toStatus: GiuOrderStatus,
  actor: { role: GiuOrderActorRole; id: string; reason?: string },
): boolean {
  const from = res.status;
  if (from === toStatus) return false;
  res.status = toStatus;
  if (toStatus === "not_picked_up" && !res.notPickedUpAt) {
    res.notPickedUpAt = new Date().toISOString();
  }
  appendOrderStatusLog(logs, {
    reservationId: res.id,
    orderCode: res.code,
    fromStatus: from,
    toStatus,
    changedByRole: actor.role,
    changedById: actor.id,
    reason: actor.reason,
    customerId: res.customerId,
    merchantId: res.merchantId,
  });
  return true;
}

export function listOrderStatusLogsForReservation(
  logs: GiuOrderStatusLog[],
  reservationId: string,
): GiuOrderStatusLog[] {
  return logs
    .filter((l) => l.reservationId === reservationId)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt));
}
