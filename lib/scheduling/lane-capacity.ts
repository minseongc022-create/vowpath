import type { JobPriority } from "../types";
import type { ScheduledBookingRecord } from "../schedule-bookings-db";
import type { TechMember } from "../tech-dispatch/types";
import type { BusyBlock } from "./compute-slots";

export type LaneBooking = {
  bookingId: string;
  startAt: string;
  endAt: string;
  assignedTechId: string | null;
};

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function laneBookingsFromRows(
  rows: ScheduledBookingRecord[],
): LaneBooking[] {
  return rows.map((r) => ({
    bookingId: r.bookingId,
    startAt: r.scheduledStartAt,
    endAt: r.scheduledEndAt,
    assignedTechId: r.assignedTechId ?? null,
  }));
}

/**
 * How many crew lanes are in use during [start, end + buffer).
 * Assigned jobs block only that tech; unassigned + external (Jobber) consume pool lanes.
 */
export function countLanesInUse(
  startMs: number,
  endMs: number,
  bufferMs: number,
  laneBookings: LaneBooking[],
  externalBlocks: BusyBlock[],
): number {
  const busyTechIds = new Set<string>();
  let poolHold = 0;

  for (const b of laneBookings) {
    const bStart = new Date(b.startAt).getTime();
    const reservedEnd = new Date(b.endAt).getTime() + bufferMs;
    if (!overlaps(startMs, endMs, bStart, reservedEnd)) continue;
    if (b.assignedTechId) {
      busyTechIds.add(b.assignedTechId);
    } else {
      poolHold += 1;
    }
  }

  let external = 0;
  for (const block of externalBlocks) {
    const bStart = new Date(block.startAt).getTime();
    const reservedEnd = new Date(block.endAt).getTime() + bufferMs;
    if (overlaps(startMs, endMs, bStart, reservedEnd)) {
      external += 1;
    }
  }

  return busyTechIds.size + poolHold + external;
}

export function lanesAvailableAt(
  startMs: number,
  endMs: number,
  bufferMs: number,
  capacity: number,
  laneBookings: LaneBooking[],
  externalBlocks: BusyBlock[],
): number {
  const used = countLanesInUse(startMs, endMs, bufferMs, laneBookings, externalBlocks);
  return Math.max(0, capacity - used);
}

/** Pick the least-loaded free tech for this window (on-call order handled by caller). */
export function pickFreeTechForWindow(params: {
  techs: TechMember[];
  startMs: number;
  endMs: number;
  bufferMs: number;
  laneBookings: LaneBooking[];
  preferredTechId?: string | null;
}): TechMember | null {
  const { techs, startMs, endMs, bufferMs, laneBookings, preferredTechId } = params;
  if (!techs.length) return null;

  const isFree = (techId: string) => {
    for (const b of laneBookings) {
      if (b.assignedTechId !== techId) continue;
      const bStart = new Date(b.startAt).getTime();
      const reservedEnd = new Date(b.endAt).getTime() + bufferMs;
      if (overlaps(startMs, endMs, bStart, reservedEnd)) return false;
    }
    return true;
  };

  if (preferredTechId) {
    const preferred = techs.find((t) => t.id === preferredTechId);
    if (preferred && isFree(preferred.id)) return preferred;
  }

  const scored = techs
    .filter((t) => isFree(t.id))
    .map((t) => {
      const load = laneBookings.filter((b) => b.assignedTechId === t.id).length;
      return { tech: t, load };
    })
    .sort((a, b) => a.load - b.load);

  return scored[0]?.tech ?? null;
}

/** P1 emergencies: shorter lead time and more slot offers. */
export function schedulingLeadMs(priority: JobPriority): number {
  if (priority === "P1") return 20 * 60_000;
  return 60 * 60_000;
}

export function maxSlotOffersForPriority(
  priority: JobPriority,
  configuredMax: number,
): number {
  const base = Math.min(5, Math.max(1, configuredMax));
  return priority === "P1" ? Math.min(5, base + 2) : base;
}
