import type { GiuMerchant, GiuReservation } from "./types";
import { getGiuPublicOrigin } from "./giu-host";

export type GiuPickupPolicy = {
  cancelFreeBeforeMinutes: number;
  extensionRequestBeforeMinutes: number;
  pickupGraceMinutes: number;
  lateCancelFeeRate: number;
  noShowFeeRate: number;
  merchantNoShowMarkAfterHours: number;
};

/** Platform defaults — merchants can override in settings. */
export const DEFAULT_PICKUP_POLICY: GiuPickupPolicy = {
  cancelFreeBeforeMinutes: 60,
  extensionRequestBeforeMinutes: 10,
  pickupGraceMinutes: 30,
  lateCancelFeeRate: 0.2,
  noShowFeeRate: 0.35,
  merchantNoShowMarkAfterHours: 24,
};

/** Customer reminder: 1h 10m before pickup end. */
export const PICKUP_REMINDER_70_MIN = 70;
/** Customer reminder: 30m before pickup end (extension nudge). */
export const PICKUP_REMINDER_30_MIN = 30;
/** Merchant ping interval while extension pending. */
export const EXTENSION_MERCHANT_PING_MIN = 5;

export function resolvePickupPolicy(merchant?: Pick<GiuMerchant, "pickupPolicy"> | null): GiuPickupPolicy {
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
    pickupGraceMinutes: clampInt(p.pickupGraceMinutes, 10, 120, DEFAULT_PICKUP_POLICY.pickupGraceMinutes),
    lateCancelFeeRate: clampRate(p.lateCancelFeeRate, DEFAULT_PICKUP_POLICY.lateCancelFeeRate),
    noShowFeeRate: clampRate(p.noShowFeeRate, DEFAULT_PICKUP_POLICY.noShowFeeRate),
    merchantNoShowMarkAfterHours: clampInt(
      p.merchantNoShowMarkAfterHours,
      6,
      72,
      DEFAULT_PICKUP_POLICY.merchantNoShowMarkAfterHours,
    ),
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

export function pickupGraceEndsAt(
  pickupEndIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
): number {
  return new Date(pickupEndIso).getTime() + policy.pickupGraceMinutes * 60_000;
}

export function merchantCanMarkNoShow(
  pickupEndIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  const afterGrace = pickupGraceEndsAt(pickupEndIso, policy);
  return now >= afterGrace + policy.merchantNoShowMarkAfterHours * 3_600_000;
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
  if (reservation.status === "da_lay" || reservation.status === "huy") return false;
  return true;
}

export function shouldMarkReservationExpired(
  reservation: Pick<
    GiuReservation,
    "status" | "paymentStatus" | "merchantPickupPromiseUntil" | "extensionRequest"
  >,
  boxPickupEndIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  if (reservation.paymentStatus !== "paid" || reservation.status !== "giu_cho") return false;
  if (
    reservation.merchantPickupPromiseUntil &&
    new Date(reservation.merchantPickupPromiseUntil).getTime() > now
  ) {
    return false;
  }
  if (reservation.extensionRequest?.status === "approved") return false;
  return now > pickupGraceEndsAt(boxPickupEndIso, policy);
}

export function reservationDeepLink(reservationId: string, from?: string): string {
  const base = `${getGiuPublicOrigin()}/dat/${reservationId}`;
  return from ? `${base}?from=${from}` : base;
}

export function merchantOrderDeepLink(reservationId: string): string {
  return `${getGiuPublicOrigin()}/cua-hang/panel?tab=orders&order=${reservationId}`;
}
