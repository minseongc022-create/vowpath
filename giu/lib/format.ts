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

/** Tonight 19:00–21:00 HCMC as ISO strings */
export function defaultPickupWindow(): { start: string; end: string; expires: string } {
  const now = new Date();
  const hcm = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  hcm.setHours(19, 0, 0, 0);
  const start = new Date(hcm);
  if (start.getTime() < now.getTime()) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start);
  end.setHours(21, 0, 0, 0);
  const expires = new Date(end);
  expires.setMinutes(expires.getMinutes() + 30);
  return { start: start.toISOString(), end: end.toISOString(), expires: expires.toISOString() };
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
