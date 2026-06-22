import type { JobPriority } from "../types";
import { normalizeRequestStatus } from "../booking-policy";
import { getShopBookingSettings } from "../shop-settings-db";
import { listScheduledBookings } from "../schedule-bookings-db";
import { getJobberTokens } from "../jobber-tokens";
import { getRequestStatuses } from "../requests-db";
import { lookupStoredRequestStatus } from "../request-status-resolve";
import type { SlotOffer } from "../booking-settings";
import type { BusyBlock } from "./compute-slots";
import { computeAvailableSlots, computeSlotGrid, type SlotGridResult } from "./compute-slots";
import { fetchJobberBusyBlocks } from "./jobber-schedule-api";

function dedupeBusyBlocks(blocks: BusyBlock[]): BusyBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const out: BusyBlock[] = [];
  for (const block of sorted) {
    const start = new Date(block.startAt).getTime();
    const end = new Date(block.endAt).getTime();
    const duplicate = out.some((existing) => {
      const es = new Date(existing.startAt).getTime();
      const ee = new Date(existing.endAt).getTime();
      return Math.abs(es - start) < 60_000 && Math.abs(ee - end) < 60_000;
    });
    if (!duplicate) out.push({ startAt: block.startAt, endAt: block.endAt });
  }
  return out;
}

async function loadBusyBlocks(
  userId: string,
  source: "jobber" | "native",
  excludeBookingId?: string,
) {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  const statuses = await getRequestStatuses(userId);
  let rows = await listScheduledBookings(userId, now, to);
  if (excludeBookingId) {
    rows = rows.filter((r) => r.bookingId !== excludeBookingId);
  }
  rows = rows.filter((r) => {
    const status = normalizeRequestStatus(
      lookupStoredRequestStatus(r.bookingId, statuses, undefined) ?? "pending_review",
    );
    return status !== "rejected" && status !== "completed";
  });

  let busy = rows.map((r) => ({
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

  return { busy: dedupeBusyBlocks(busy), now };
}

export async function offerSlotGridForTenant(params: {
  userId: string;
  priority: JobPriority;
  excludeBookingId?: string;
}): Promise<SlotGridResult | null> {
  const settings = await getShopBookingSettings(params.userId);
  if (!settings.schedulingEnabled) return null;

  const hasJobber = Boolean(await getJobberTokens(params.userId));
  const source: "jobber" | "native" =
    hasJobber && settings.jobberSchedulingEnabled ? "jobber" : "native";

  const { busy, now } = await loadBusyBlocks(
    params.userId,
    source,
    params.excludeBookingId,
  );

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
  excludeBookingId?: string;
}): Promise<SlotOffer[]> {
  const settings = await getShopBookingSettings(params.userId);
  if (!settings.schedulingEnabled) return [];

  const hasJobber = Boolean(await getJobberTokens(params.userId));
  const source: "jobber" | "native" =
    hasJobber && settings.jobberSchedulingEnabled ? "jobber" : "native";

  const { busy, now } = await loadBusyBlocks(
    params.userId,
    source,
    params.excludeBookingId,
  );

  return computeAvailableSlots({
    settings,
    busyBlocks: busy,
    priority: params.priority,
    now,
    source,
  });
}
