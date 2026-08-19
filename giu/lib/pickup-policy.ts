import type { GiuMerchant } from "./types";

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
  /** Full refund if cancelled at least this many minutes before pickupEnd. */
  cancelFreeBeforeMinutes: 60,
  /** In-app “픽업 연장 요청” only until this many minutes before pickupEnd. */
  extensionRequestBeforeMinutes: 10,
  /** Minutes after pickupEnd when same-day QR pickup still works. */
  pickupGraceMinutes: 30,
  /** Fee when cancelling inside the free window (before pickupEnd). */
  lateCancelFeeRate: 0.2,
  /** Fee when refunding after missing pickup (no-show intent). */
  noShowFeeRate: 0.35,
  /** Hours after pickupEnd+grace before merchant can mark unclaimed (silent no-show). */
  merchantNoShowMarkAfterHours: 24,
};

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

export function isPickupQrValid(
  reservation: {
    status: string;
    paymentStatus: string;
    merchantPickupPromiseUntil?: string;
    expiresAt: string;
  },
  boxPickupEndIso: string,
  policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY,
  now = Date.now(),
): boolean {
  if (reservation.paymentStatus !== "paid") return false;
  if (reservation.status === "da_lay" || reservation.status === "huy") return false;
  if (
    reservation.merchantPickupPromiseUntil &&
    new Date(reservation.merchantPickupPromiseUntil).getTime() > now
  ) {
    return true;
  }
  if (reservation.status === "giu_cho") {
    return new Date(reservation.expiresAt).getTime() > now || now <= pickupGraceEndsAt(boxPickupEndIso, policy);
  }
  if (reservation.status === "het_han") {
    return now <= pickupGraceEndsAt(boxPickupEndIso, policy);
  }
  return false;
}
