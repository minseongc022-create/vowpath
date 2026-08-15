import type { GiuLocale } from "./i18n";
import { t } from "./i18n";
import type { GiuBoxStatus, GiuPaymentStatus, GiuReservationStatus } from "./types";

/** Mystery / surprise bag (TGTG-style) — title heuristics + default merchant copy. */
export function isSurpriseTitle(title: string): boolean {
  return /surprise|서프라이즈|bí\s*mật|bất\s*ngờ|mystery|ngẫu\s*nhiên/i.test(title);
}

/** Minutes until pickup window ends; null if already past. */
export function minutesUntilPickupEnd(pickupEndIso: string, now = Date.now()): number | null {
  const end = new Date(pickupEndIso).getTime();
  if (!Number.isFinite(end) || end <= now) return null;
  return Math.round((end - now) / 60_000);
}

export function isClosingSoon(pickupEndIso: string, withinMinutes = 120): boolean {
  const m = minutesUntilPickupEnd(pickupEndIso);
  return m != null && m <= withinMinutes;
}

/** Rough food-waste CO₂ avoided per rescued box (kg). */
export const CO2_KG_PER_BOX = 1.2;

export function formatBoxStatusLocale(status: GiuBoxStatus, locale: GiuLocale): string {
  if (status === "mo") return t(locale, "statusMo");
  if (status === "het") return t(locale, "statusHet");
  return t(locale, "statusHuy");
}

export function formatReservationStatusLocale(
  status: GiuReservationStatus,
  locale: GiuLocale,
): string {
  if (status === "giu_cho") return t(locale, "statusGiuCho");
  if (status === "da_lay") return t(locale, "statusDaLay");
  if (status === "het_han") return t(locale, "statusHetHan");
  return t(locale, "statusResHuy");
}

export function formatPaymentStatusLocale(status: GiuPaymentStatus, locale: GiuLocale): string {
  if (status === "pending") return t(locale, "payPendingShort");
  if (status === "paid") return t(locale, "payPaid");
  if (status === "failed") return t(locale, "payFailedShort");
  return t(locale, "payRefunded");
}

export function formatRatingLine(
  rating: number,
  reviewCount: number,
  locale: GiuLocale,
): string | null {
  if (!rating || reviewCount <= 0) return null;
  return `★ ${rating.toFixed(1)} · ${reviewCount} ${t(locale, "reviews")}`;
}
