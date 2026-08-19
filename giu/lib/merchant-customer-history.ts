import type { GiuBox, GiuReservation } from "./types";

export type MerchantCustomerSummary = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  orderCount: number;
  completedCount: number;
  refundedCount: number;
  totalSpentVnd: number;
  lastOrderAt: string;
  hasPendingExtension: boolean;
};

export type CustomerTimelineKind =
  | "order"
  | "paid"
  | "extension_request"
  | "extension_approved"
  | "extension_rejected"
  | "pickup_done"
  | "refund"
  | "no_show"
  | "expired"
  | "cancelled";

export type CustomerTimelineEvent = {
  id: string;
  at: string;
  kind: CustomerTimelineKind;
  reservationId: string;
  productTitle?: string;
  detail?: string;
  amountVnd?: number;
};

export function listMerchantCustomers(
  reservations: GiuReservation[],
  merchantId: string,
): MerchantCustomerSummary[] {
  const map = new Map<string, MerchantCustomerSummary>();

  for (const r of reservations.filter((x) => x.merchantId === merchantId)) {
    const existing = map.get(r.customerId);
    const base: MerchantCustomerSummary = existing ?? {
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      orderCount: 0,
      completedCount: 0,
      refundedCount: 0,
      totalSpentVnd: 0,
      lastOrderAt: r.createdAt,
      hasPendingExtension: false,
    };

    base.orderCount += 1;
    if (r.status === "da_lay" && r.paymentStatus === "paid") {
      base.completedCount += 1;
      base.totalSpentVnd += r.totalVnd;
    }
    if (r.paymentStatus === "refunded" || r.refundedAt) base.refundedCount += 1;
    if (r.extensionRequest?.status === "pending") base.hasPendingExtension = true;
    if (r.createdAt > base.lastOrderAt) {
      base.lastOrderAt = r.createdAt;
      base.customerName = r.customerName;
      base.customerPhone = r.customerPhone;
    }

    map.set(r.customerId, base);
  }

  return [...map.values()].sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
}

export function getCustomerReservations(
  reservations: GiuReservation[],
  merchantId: string,
  customerId: string,
): GiuReservation[] {
  return reservations
    .filter((r) => r.merchantId === merchantId && r.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildReservationTimelineEvents(
  reservation: GiuReservation,
  box?: GiuBox,
): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];
  const productTitle = box?.title;

  events.push({
    id: `${reservation.id}-order`,
    at: reservation.createdAt,
    kind: "order",
    reservationId: reservation.id,
    productTitle,
    detail: `${reservation.quantity}개 · ₩${reservation.totalVnd.toLocaleString("ko-KR")}`,
  });

  if (reservation.paidAt) {
    events.push({
      id: `${reservation.id}-paid`,
      at: reservation.paidAt,
      kind: "paid",
      reservationId: reservation.id,
      productTitle,
    });
  }

  const ext = reservation.extensionRequest;
  if (ext?.requestedAt) {
    events.push({
      id: `${reservation.id}-ext-req`,
      at: ext.requestedAt,
      kind: "extension_request",
      reservationId: reservation.id,
      productTitle,
      detail: `${ext.reason} · ${formatWhen(ext.plannedPickupAt)}`,
    });
  }
  if (ext?.status === "approved" && ext.reviewedAt) {
    events.push({
      id: `${reservation.id}-ext-ok`,
      at: ext.reviewedAt,
      kind: "extension_approved",
      reservationId: reservation.id,
      productTitle,
      detail: formatWhen(ext.plannedPickupAt),
    });
  }
  if (ext?.status === "rejected" && ext.reviewedAt) {
    events.push({
      id: `${reservation.id}-ext-no`,
      at: ext.reviewedAt,
      kind: "extension_rejected",
      reservationId: reservation.id,
      productTitle,
      detail: ext.merchantNote,
    });
  }

  if (reservation.status === "da_lay" && reservation.settledAt) {
    events.push({
      id: `${reservation.id}-pickup`,
      at: reservation.settledAt,
      kind: "pickup_done",
      reservationId: reservation.id,
      productTitle,
    });
  }

  if (reservation.refundedAt) {
    events.push({
      id: `${reservation.id}-refund`,
      at: reservation.refundedAt,
      kind: "refund",
      reservationId: reservation.id,
      productTitle,
      detail:
        reservation.refundType === "partial"
          ? `부분 환불 · ₩${(reservation.refundAmountVnd ?? 0).toLocaleString("ko-KR")}`
          : `전액 환불 · ₩${(reservation.refundAmountVnd ?? reservation.totalVnd).toLocaleString("ko-KR")}`,
      amountVnd: reservation.refundAmountVnd ?? reservation.totalVnd,
    });
  } else if (reservation.paymentStatus === "refunded") {
    events.push({
      id: `${reservation.id}-refund`,
      at: reservation.refundedAt ?? reservation.createdAt,
      kind: "refund",
      reservationId: reservation.id,
      productTitle,
    });
  }

  if (reservation.merchantNoShowMarkedAt) {
    events.push({
      id: `${reservation.id}-noshow`,
      at: reservation.merchantNoShowMarkedAt,
      kind: "no_show",
      reservationId: reservation.id,
      productTitle,
    });
  }

  if (reservation.status === "het_han") {
    events.push({
      id: `${reservation.id}-expired`,
      at: reservation.expiresAt,
      kind: "expired",
      reservationId: reservation.id,
      productTitle,
    });
  }

  if (reservation.status === "huy" && reservation.paymentStatus !== "refunded") {
    events.push({
      id: `${reservation.id}-cancel`,
      at: reservation.refundedAt ?? reservation.createdAt,
      kind: "cancelled",
      reservationId: reservation.id,
      productTitle,
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export function buildCustomerTimeline(
  reservations: GiuReservation[],
  boxMap: Map<string, GiuBox>,
): CustomerTimelineEvent[] {
  const all: CustomerTimelineEvent[] = [];
  for (const r of reservations) {
    all.push(...buildReservationTimelineEvents(r, boxMap.get(r.boxId)));
  }
  return all.sort((a, b) => b.at.localeCompare(a.at));
}
