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
import {
  laneBookingsFromRows,
  resolveSchedulingCapacity,
  type LaneBooking,
} from "./tech-lanes";
import { getShopProfile } from "../shop-profile-db";
import { resolveShopTimezone } from "../shop-timezone";

export type SchedulingLoadContext = {
  laneBookings: LaneBooking[];
  externalBlocks: BusyBlock[];
  capacity: number;
  timeZone: string;
  now: Date;
  jobberScheduleUncertain: boolean;
};

function dedupeBusyBlocks(blocks: BusyBlock[]): BusyBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const out: BusyBlock[] = [];
  const TOLERANCE_MS = 5 * 60_000;

  for (const block of sorted) {
    const start = new Date(block.startAt).getTime();
    const end = new Date(block.endAt).getTime();
    const duplicate = out.some((existing) => {
      const es = new Date(existing.startAt).getTime();
      const ee = new Date(existing.endAt).getTime();
      const startsClose = Math.abs(es - start) < TOLERANCE_MS;
      const endsClose = Math.abs(ee - end) < TOLERANCE_MS;
      const overlaps =
        start < ee + TOLERANCE_MS && es < end + TOLERANCE_MS;
      return (startsClose && endsClose) || overlaps;
    });
    if (!duplicate) out.push({ startAt: block.startAt, endAt: block.endAt });
  }
  return out;
}

/** Native bookings already in laneBookings — Jobber-only blocks are external. */
function externalBlocksFromJobber(
  jobberBlocks: BusyBlock[],
  laneBookings: LaneBooking[],
): BusyBlock[] {
  const TOLERANCE_MS = 5 * 60_000;
  return jobberBlocks.filter((jb) => {
    const js = new Date(jb.startAt).getTime();
    const je = new Date(jb.endAt).getTime();
    return !laneBookings.some((lb) => {
      const ls = new Date(lb.startAt).getTime();
      const le = new Date(lb.endAt).getTime();
      return Math.abs(ls - js) < TOLERANCE_MS && Math.abs(le - je) < TOLERANCE_MS;
    });
  });
}

export async function loadSchedulingContext(
  userId: string,
  source: "jobber" | "native",
  excludeBookingId?: string,
): Promise<SchedulingLoadContext> {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  const [statuses, profile, capacity] = await Promise.all([
    getRequestStatuses(userId),
    getShopProfile(userId),
    resolveSchedulingCapacity(userId),
  ]);
  const timeZone = resolveShopTimezone(profile);

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

  const laneBookings = laneBookingsFromRows(rows);
  let externalBlocks: BusyBlock[] = [];
  let jobberScheduleUncertain = false;

  if (source === "jobber") {
    try {
      const jobberBusy = await fetchJobberBusyBlocks(userId, now, to);
      externalBlocks = externalBlocksFromJobber(jobberBusy, laneBookings);
    } catch {
      jobberScheduleUncertain = true;
      externalBlocks = [];
    }
  }

  return {
    laneBookings,
    externalBlocks: dedupeBusyBlocks(externalBlocks),
    capacity,
    timeZone,
    now,
    jobberScheduleUncertain,
  };
}

function buildGrid(
  userId: string,
  priority: JobPriority,
  ctx: SchedulingLoadContext,
  settings: Awaited<ReturnType<typeof getShopBookingSettings>>,
  source: "jobber" | "native",
): SlotGridResult {
  return computeSlotGrid({
    settings,
    laneBookings: ctx.laneBookings,
    externalBlocks: ctx.externalBlocks,
    priority,
    capacity: ctx.capacity,
    timeZone: ctx.timeZone,
    now: ctx.now,
    source,
    jobberScheduleUncertain: ctx.jobberScheduleUncertain,
  });
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

  const ctx = await loadSchedulingContext(params.userId, source, params.excludeBookingId);
  return buildGrid(params.userId, params.priority, ctx, settings, source);
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

  const ctx = await loadSchedulingContext(params.userId, source, params.excludeBookingId);

  return computeAvailableSlots({
    settings,
    laneBookings: ctx.laneBookings,
    externalBlocks: ctx.externalBlocks,
    capacity: ctx.capacity,
    timeZone: ctx.timeZone,
    priority: params.priority,
    now: ctx.now,
    source,
    jobberScheduleUncertain: ctx.jobberScheduleUncertain,
  });
}
