import type { JobPriority } from "../types";
import { getShopBookingSettings } from "../shop-settings-db";
import { listScheduledBookings } from "../schedule-bookings-db";
import { getJobberTokens } from "../jobber-tokens";
import type { SlotOffer } from "../booking-settings";
import { computeAvailableSlots } from "./compute-slots";
import { fetchJobberBusyBlocks } from "./jobber-schedule-api";

export async function offerVisitSlotsForTenant(params: {
  userId: string;
  priority: JobPriority;
}): Promise<SlotOffer[]> {
  const settings = await getShopBookingSettings(params.userId);
  if (!settings.schedulingEnabled) return [];

  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  const hasJobber = Boolean(await getJobberTokens(params.userId));
  const source: "jobber" | "native" =
    hasJobber && settings.jobberSchedulingEnabled ? "jobber" : "native";

  let busy = (await listScheduledBookings(params.userId, now, to)).map((r) => ({
    startAt: r.scheduledStartAt,
    endAt: r.scheduledEndAt,
  }));

  if (source === "jobber") {
    try {
      const jobberBusy = await fetchJobberBusyBlocks(params.userId, now, to);
      busy = [...busy, ...jobberBusy];
    } catch {
      /* fallback */
    }
  }

  return computeAvailableSlots({
    settings,
    busyBlocks: busy,
    priority: params.priority,
    now,
    source,
  });
}
