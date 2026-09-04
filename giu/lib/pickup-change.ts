import { resolvePlatformSettings, type GiuPlatformSettings } from "./platform-settings";
import type { GiuBox, GiuReservation } from "./types";
import { effectivePickupEndIso } from "./pickup-policy";

export type GiuPickupChangeRecord = {
  id: string;
  reservationId: string;
  fromPickupEnd: string;
  toPickupEnd: string;
  requestedByRole: "customer" | "merchant";
  requestedById: string;
  approvedByRole?: "customer" | "merchant";
  approvedById?: string;
  reason: string;
  requestedAt: string;
  reviewedAt?: string;
  status: "pending" | "approved" | "rejected";
  merchantStorageConfirmed?: boolean;
};

export function maxPickupChangesPerOrder(platform?: Partial<GiuPlatformSettings> | null): number {
  return resolvePlatformSettings(platform).maxPickupChangesPerOrder;
}

export function maxPickupChangeHours(platform?: Partial<GiuPlatformSettings> | null): number {
  return resolvePlatformSettings(platform).maxPickupChangeHours;
}

/** Validate new pickup end is within max hours from original box pickup end. */
export function isPickupChangeWithinLimit(
  originalBoxPickupEndIso: string,
  newPickupEndIso: string,
  platform?: Partial<GiuPlatformSettings> | null,
): boolean {
  const maxMs = maxPickupChangeHours(platform) * 3_600_000;
  const original = new Date(originalBoxPickupEndIso).getTime();
  const planned = new Date(newPickupEndIso).getTime();
  if (!Number.isFinite(original) || !Number.isFinite(planned)) return false;
  return planned > original && planned - original <= maxMs;
}

export function isPickupChangeAllowedForBox(box: Pick<GiuBox, "pickupChangeAllowed">): boolean {
  return box.pickupChangeAllowed !== false;
}

export function canRequestPickupChange(
  res: GiuReservation,
  box: Pick<GiuBox, "pickupChangeAllowed">,
  platform?: Partial<GiuPlatformSettings> | null,
): boolean {
  if (!isPickupChangeAllowedForBox(box)) return false;
  const max = maxPickupChangesPerOrder(platform);
  if ((res.pickupChangeCount ?? 0) >= max) return false;
  if (res.extensionRequest?.status === "pending") return false;
  if (res.merchantPickupProposal?.status === "pending") return false;
  return res.status === "not_picked_up" || res.status === "pickup_waiting";
}

export function originalPickupEndForOrder(
  res: Pick<GiuReservation, "originalPickupEnd" | "extensionRequest" | "merchantPickupPromiseUntil">,
  boxPickupEndIso: string,
): string {
  return res.originalPickupEnd ?? boxPickupEndIso;
}

export function formatPickupChangeWindowKo(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  const from = start.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
  const to = end.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} ${from} ~ ${to}`;
}
