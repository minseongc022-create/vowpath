import type { GiuBoxStatus, GiuPaymentStatus, GiuReservationStatus } from "./types";

const vnd = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVnd(amount: number): string {
  return vnd.format(amount);
}

export function formatDiscount(original: number, sale: number): string {
  if (original <= 0) return "0%";
  return `-${Math.round((1 - sale / original) * 100)}%`;
}

export function formatPickupWindow(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  };
  const start = new Date(startIso).toLocaleTimeString("ko-KR", opts);
  const end = new Date(endIso).toLocaleTimeString("ko-KR", opts);
  return `${start} – ${end}`;
}

export function formatPickupDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const BOX_STATUS_LABELS: Record<GiuBoxStatus, string> = {
  mo: "판매 중",
  het: "매진",
  huy: "취소됨",
};

const RESERVATION_STATUS_LABELS: Record<GiuReservationStatus, string> = {
  giu_cho: "예약 중",
  da_lay: "픽업 완료",
  het_han: "만료됨",
  huy: "취소됨",
};

const PAYMENT_STATUS_LABELS: Record<GiuPaymentStatus, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  failed: "결제 실패",
  refunded: "환불됨",
};

export function formatBoxStatus(status: GiuBoxStatus): string {
  return BOX_STATUS_LABELS[status] ?? status;
}

export function formatReservationStatus(status: GiuReservationStatus): string {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

export function formatPaymentStatus(status: GiuPaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

/** Next flexible pickup window from now (HCMC) — anytime listing. */
export function defaultPickupWindow(
  durationHours = 2,
): { start: string; end: string; expires: string } {
  const now = new Date();
  const start = new Date(now.getTime() + 15 * 60 * 1000);
  // Round up to next 15 minutes
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  const expires = new Date(end.getTime() + 30 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString(), expires: expires.toISOString() };
}

/** Build ISO from HCMC calendar day + hour (+ optional minute). */
export function hcmLocalToIso(dayOffset: number, hour: number, minute = 0): string {
  const now = new Date();
  const hcm = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  hcm.setDate(hcm.getDate() + dayOffset);
  hcm.setHours(hour, minute, 0, 0);
  return hcm.toISOString();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
