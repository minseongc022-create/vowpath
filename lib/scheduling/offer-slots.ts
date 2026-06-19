import type { JobPriority } from "../types";
import { getShopBookingSettings } from "../shop-settings-db";
import { listScheduledBookings } from "../schedule-bookings-db";
import { getJobberTokens } from "../jobber-tokens";
import type { SlotOffer } from "../booking-settings";
import { computeAvailableSlots, computeSlotGrid, type SlotGridResult } from "./compute-slots";
import { fetchJobberBusyBlocks } from "./jobber-schedule-api";

async function loadBusyBlocks(userId: string, source: "jobber" | "native") {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  let busy = (await listScheduledBookings(userId, now, to)).map((r) => ({
    startAt: r.scheduledStartAt,
    endAt: r.scheduledEndAt,
  }));

  if (source === "jobber") {
    try {
      const jobberBusy = await fetchJobberBusyBlocks(userId, now, to);
      busy = [...busy, ...jobberBusy];
    } catch {
      /* fallback */
    }
  }

  return { busy, now };
}

export async function offerSlotGridForTenant(params: {
  userId: string;
  priority: JobPriority;
}): Promise<SlotGridResult | null> {
  const settings = await getShopBookingSettings(params.userId);
  if (!settings.schedulingEnabled) return null;

  const hasJobber = Boolean(await getJobberTokens(params.userId));
  const source: "jobber" | "native" =
    hasJobber && settings.jobberSchedulingEnabled ? "jobber" : "native";

  const { busy, now } = await loadBusyBlocks(params.userId, source);

  return computeSlotGrid({
    settings,
    busyBlocks: busy,
    priority: params.priority,
    now,
    source,
  });
}

export async function offerVisitSlotsForTenant(params: {
  userId: string;
  priority: JobPriority;
}): Promise<SlotOffer[]> {
  const settings = await getShopBookingSettings(params.userId);
  if (!settings.schedulingEnabled) return [];

  const hasJobber = Boolean(await getJobberTokens(params.userId));
  const source: "jobber" | "native" =
    hasJobber && settings.jobberSchedulingEnabled ? "jobber" : "native";

  const { busy, now } = await loadBusyBlocks(params.userId, source);

  return computeAvailableSlots({
    settings,
    busyBlocks: busy,
    priority: params.priority,
    now,
    source,
  });
}
