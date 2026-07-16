import type { ScheduledBookingRecord } from "../schedule-bookings-db";
import type { TechMember } from "../tech-dispatch/types";
import { getTechDispatchSettings, getTechAssignment } from "../tech-dispatch/store";
import { getShopBookingSettings } from "../shop-settings-db";

export type { LaneBooking } from "./lane-capacity";
export {
  laneBookingsFromRows,
  countLanesInUse,
  lanesAvailableAt,
  pickFreeTechForWindow,
  schedulingLeadMs,
  maxSlotOffersForPriority,
} from "./lane-capacity";

/** Active crew count drives lane capacity; falls back to booking settings. */
export async function resolveSchedulingCapacity(userId: string): Promise<number> {
  const [dispatch, booking] = await Promise.all([
    getTechDispatchSettings(userId),
    getShopBookingSettings(userId),
  ]);
  const activeCrew = dispatch.techs.filter(
    (t) => t.active && t.name.trim().length >= 1,
  ).length;
  if (activeCrew > 0) return activeCrew;
  return Math.max(1, Math.round(booking.maxConcurrentVisits));
}

export async function listActiveCrew(userId: string): Promise<TechMember[]> {
  const settings = await getTechDispatchSettings(userId);
  return settings.techs.filter((t) => t.active && t.name.trim().length >= 1);
}

export async function assignedTechIdForBooking(
  userId: string,
  bookingId: string,
  row?: ScheduledBookingRecord | null,
): Promise<string | null> {
  if (row?.assignedTechId) return row.assignedTechId;
  const assignment = await getTechAssignment(userId, bookingId);
  return assignment?.assignedTechId ?? null;
}
