import type { GiuMerchant, GiuOrderStatus, GiuReservation } from "./types";
import { getGiuPublicOrigin } from "./giu-host";
import { isPickupQrEligibleStatus } from "./order-status";
import { DEFAULT_PLATFORM_SETTINGS, resolvePlatformSettings, type GiuPlatformSettings } from "./platform-settings";

export type GiuPickupPolicy = {
  cancelFreeBeforeMinutes: number;
  extensionRequestBeforeMinutes: number;
  /** 미수령 유예시간 (분) — 픽업 종료 후 미수령 상태에서 제공. */
  pickupGraceMinutes: number;
  lateCancelFeeRate: number;
  noShowFeeRate: number;
};

/** Platform defaults — merchants can override grace in settings. */
export const DEFAULT_PICKUP_POLICY: GiuPickupPolicy = {
  cancelFreeBeforeMinutes: 60,
  extensionRequestBeforeMinutes: 10,
  pickupGraceMinutes: DEFAULT_PLATFORM_SETTINGS.notPickedUpGraceMinutes,
  lateCancelFeeRate: 0.2,
  noShowFeeRate: 0.35,
};

/** Customer reminder: 1h 10m before pickup end. */
export const PICKUP_REMINDER_70_MIN = 70;
/** Customer reminder: 30m before pickup end (extension nudge). */
export const PICKUP_REMINDER_30_MIN = 30;
/** Merchant ping interval while extension pending. */
export const EXTENSION_MERCHANT_PING_MIN = 5;

const PICKUP_WAITING_STATUSES: GiuOrderStatus[] = [
  "payment_completed",
  "merchant_confirmed",
  "pickup_preparing",
  "pickup_waiting",
  "pickup_change_completed",
];

export function resolvePickupPolicy(
  merchant?: Pick<GiuMerchant, "pickupPolicy"> | null,
  platform?: Partial<GiuPlatformSettings> | null,
): GiuPickupPolicy {
  const plat = resolvePlatformSettings(platform);
  const p = merchant?.pickupPolicy ?? {};
  return {
    cancelFreeBeforeMinutes: clampInt(
      p.cancelFreeBeforeMinutes,
      15,
      240,
      DEFAULT_PICKUP_POLICY.cancelFreeBeforeMinutes,
    ),
    extensionRequestBeforeMinutes: clampInt(
      p.extensionRequestBeforeMinutes,
      5,
      120,
      DEFAULT_PICKUP_POLICY.extensionRequestBeforeMinutes,
    ),
    pickupGraceMinutes: clampInt(
      p.pickupGraceMinutes,
      30,
      480,
      plat.notPickedUpGraceMinutes,
    ),
    lateCancelFeeRate: clampRate(p.lateCancelFeeRate, DEFAULT_PICKUP_POLICY.lateCancelFeeRate),
    noShowFeeRate: clampRate(p.noShowFeeRate, DEFAULT_PICKUP_POLICY.noShowFeeRate),
  };
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampRate(value: number | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(0.5, Math.max(0.05, value));
}

export function minutesUntilPickupEnd(pickupEndIso: string, now = Date.now()): number {
  return (new Date(pickupEndIso).getTime() - now) / 60_000;
}

/** Pickup window end timestamp (no grace). Honors extension / promise. */
export function effectivePickupEndMs(
  reservation: Pick<GiuReservation, "merchantPickupPromiseUntil" | "extensionRequest">,
  boxPickupEndIso: string,
): number {
  return new Date(effectivePickupEndIso(reservation, boxPickupEndIso)).getTime();
}

export function pickupWindowEnded(
  reservation: Pick<
    GiuReservation,
    "status" | "paymentStatus" | "merchantPickupPromiseUntil" | "extensionRequest"
  >,
  boxPickupEndIso: string,
  now = Date.now(),
): boolean {
  if (reservation.paymentStatus !== "paid") return false;
  if (reservation.extensionRequest?.status === "pending") return false;
  const promisedUntil = reservation.merchantPickupPromiseUntil;
  if (promisedUntil && new Date(promisedUntil).getTime() > now) return false;
  return now > effectivePickupEndMs(reservation, boxPickupEndIso);
}

/** 미수령 유예 종료 시각 (notPickedUpAt + grace). */
export function notPickedUpGraceEndsAtMs(
  notPickedUpAtIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
): number {
  return new Date(notPickedUpAtIso).getTime() + policy.pickupGraceMinutes * 60_000;
}

export function isWithinNotPickedUpGrace(
  reservation: Pick<GiuReservation, "status" | "notPickedUpAt" | "paymentStatus">,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  if (reservation.status !== "not_picked_up" || reservation.paymentStatus !== "paid") return false;
  if (!reservation.notPickedUpAt) return true;
  return now < notPickedUpGraceEndsAtMs(reservation.notPickedUpAt, policy);
}

export function computePickupExpiresAt(
  boxPickupEndIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): string {
  const graceEnd = new Date(boxPickupEndIso).getTime() + policy.pickupGraceMinutes * 60_000;
  const minHold = now + 15 * 60_000;
  return new Date(Math.max(graceEnd, minHold)).toISOString();
}

export function canRequestExtensionInApp(
  pickupEndIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  return minutesUntilPickupEnd(pickupEndIso, now) > policy.extensionRequestBeforeMinutes;
}

/** @deprecated Use notPickedUpGraceEndsAtMs */
export function pickupGraceEndsAt(
  pickupEndIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
): number {
  return new Date(pickupEndIso).getTime() + policy.pickupGraceMinutes * 60_000;
}

/**
 * 노쇼 처리 검토 전환 조건 (모두 충족):
 * 1. 픽업시간 종료 + 인증 없음 → 미수령
 * 2. 픽업일 변경 완료로 새 픽업 대기 중이 아님
 * 3. 유예시간 종료
 * 4. 공식 변경 합의(약속/대기 중 요청) 없음
 */
export function noShowReviewEligible(
  reservation: Pick<
    GiuReservation,
    | "status"
    | "paymentStatus"
    | "notPickedUpAt"
    | "extensionRequest"
    | "merchantPickupPromiseUntil"
    | "refundedAt"
  >,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  if (reservation.paymentStatus !== "paid") return false;
  if (reservation.status !== "not_picked_up") return false;
  if (reservation.refundedAt) return false;
  if (reservation.extensionRequest?.status === "pending") return false;
  if (reservation.extensionRequest?.status === "approved") return false;
  if (
    reservation.merchantPickupPromiseUntil &&
    new Date(reservation.merchantPickupPromiseUntil).getTime() > now
  ) {
    return false;
  }
  if (!reservation.notPickedUpAt) return false;
  return now >= notPickedUpGraceEndsAtMs(reservation.notPickedUpAt, policy);
}

export function defaultPromiseUntil(pickupEndIso: string, now = Date.now()): string {
  const end = new Date(pickupEndIso);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(end.getHours(), end.getMinutes(), 0, 0);
  if (tomorrow.getTime() <= now) {
    tomorrow.setTime(now + 24 * 3_600_000);
  }
  return tomorrow.toISOString();
}

/** QR/code visible until pickup done or refund — not blocked by pickup window alone. */
export function isPickupQrValid(
  reservation: Pick<GiuReservation, "status" | "paymentStatus">,
): boolean {
  if (reservation.paymentStatus !== "paid") return false;
  return isPickupQrEligibleStatus(reservation.status);
}

/** Pickup window ended without auth → persist 미수령. */
export function shouldMarkNotPickedUp(
  reservation: Pick<
    GiuReservation,
    "status" | "paymentStatus" | "merchantPickupPromiseUntil" | "extensionRequest"
  >,
  boxPickupEndIso: string,
  _policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  if (reservation.paymentStatus !== "paid") return false;
  if (!PICKUP_WAITING_STATUSES.includes(reservation.status)) return false;
  return pickupWindowEnded(reservation, boxPickupEndIso, now);
}

/** @deprecated Use shouldMarkNotPickedUp */
export const shouldMarkReservationExpired = shouldMarkNotPickedUp;

/** Pickup deadline for expiry/display — honors approved extension times. */
export function effectivePickupEndIso(
  reservation: Pick<GiuReservation, "merchantPickupPromiseUntil" | "extensionRequest">,
  boxPickupEndIso: string,
): string {
  if (reservation.merchantPickupPromiseUntil) {
    return reservation.merchantPickupPromiseUntil;
  }
  if (reservation.extensionRequest?.status === "approved") {
    return reservation.extensionRequest.plannedPickupAt;
  }
  return boxPickupEndIso;
}

/** UI: show 미수령 when window ended or already persisted. */
export function resolveDisplayOrderStatus(
  reservation: Pick<
    GiuReservation,
    "status" | "paymentStatus" | "notPickedUpAt" | "merchantPickupPromiseUntil" | "extensionRequest"
  >,
  boxPickupEndIso: string | undefined,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): GiuOrderStatus {
  if (reservation.status === "not_picked_up") return "not_picked_up";
  if (!boxPickupEndIso) return reservation.status;
  if (PICKUP_WAITING_STATUSES.includes(reservation.status)) {
    if (pickupWindowEnded(reservation, boxPickupEndIso, now)) {
      return "not_picked_up";
    }
  }
  return reservation.status;
}

/** @deprecated */
export const resolveDisplayReservationStatus = resolveDisplayOrderStatus;

/** @deprecated Removed auto-refund — kept as no-op guard for imports. */
export function autoNoShowRefundEligible(): boolean {
  return false;
}

export function reservationDeepLink(reservationId: string, from?: string): string {
  const base = `${getGiuPublicOrigin()}/dat/${reservationId}`;
  return from ? `${base}?from=${from}` : base;
}

export function merchantOrderDeepLink(reservationId: string): string {
  return `${getGiuPublicOrigin()}/cua-hang/panel?tab=orders&order=${reservationId}`;
}
