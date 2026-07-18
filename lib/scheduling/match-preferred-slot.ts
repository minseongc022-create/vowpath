import type { SlotOffer } from "../booking-settings";
import { utcFromShopLocal } from "../us-timezone";
import type { SlotGridItem, SlotGridResult } from "./slot-grid";

export type PreferredSlotMatch =
  | { status: "available"; slot: SlotOffer }
  | { status: "blocked"; nextAvailable: SlotOffer | null; message: string }
  | { status: "outside_hours"; nextAvailable: SlotOffer | null; message: string }
  | { status: "not_found"; nextAvailable: SlotOffer | null; message: string };

const MATCH_TOLERANCE_MS = 30 * 60_000;

function slotOfferFromGridItem(
  grid: SlotGridResult,
  dayLabel: string,
  slot: SlotGridItem,
  source: "jobber" | "native",
): SlotOffer {
  const lanesNote =
    grid.maxConcurrentVisits > 1 && slot.lanesOpen
      ? ` (${slot.lanesOpen} crew${slot.lanesOpen === 1 ? "" : "s"} free)`
      : "";
  return {
    id: slot.id,
    label: `${dayLabel} ${slot.label}${lanesNote}`,
    startAt: slot.startAt,
    endAt: slot.endAt,
    source,
  };
}

function firstAvailableOffer(
  grid: SlotGridResult,
  source: "jobber" | "native",
  afterMs?: number,
): SlotOffer | null {
  for (const day of grid.days) {
    for (const slot of day.slots) {
      if (slot.status !== "available") continue;
      const startMs = new Date(slot.startAt).getTime();
      if (afterMs != null && startMs < afterMs) continue;
      return slotOfferFromGridItem(grid, day.weekdayLabel, slot, source);
    }
  }
  return null;
}

function parsePreferredLocalMs(
  preferredDate: string,
  preferredTime: string,
  timeZone: string,
): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(preferredDate.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(preferredTime.trim());
  if (!dateMatch || !timeMatch) return null;

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const dt = utcFromShopLocal(preferredDate.trim(), hour, minute, timeZone);
  return dt.getTime();
}

export function matchPreferredVisitSlot(params: {
  grid: SlotGridResult;
  source: "jobber" | "native";
  preferredDate?: string;
  preferredTime?: string;
}): PreferredSlotMatch | null {
  const { grid, source, preferredDate, preferredTime } = params;
  if (!preferredDate?.trim() || !preferredTime?.trim()) return null;

  const preferredMs = parsePreferredLocalMs(preferredDate, preferredTime, grid.timeZone);
  if (preferredMs == null) return null;

  let closestBlocked: { slot: SlotGridItem; dayLabel: string; delta: number } | null = null;
  let closestAny: { slot: SlotGridItem; dayLabel: string; delta: number } | null = null;

  for (const day of grid.days) {
    for (const slot of day.slots) {
      const startMs = new Date(slot.startAt).getTime();
      const delta = Math.abs(startMs - preferredMs);
      if (!closestAny || delta < closestAny.delta) {
        closestAny = { slot, dayLabel: day.weekdayLabel, delta };
      }
      if (slot.status === "blocked" && delta <= MATCH_TOLERANCE_MS) {
        if (!closestBlocked || delta < closestBlocked.delta) {
          closestBlocked = { slot, dayLabel: day.weekdayLabel, delta };
        }
      }
      if (slot.status === "available" && delta <= MATCH_TOLERANCE_MS) {
        return {
          status: "available",
          slot: slotOfferFromGridItem(grid, day.weekdayLabel, slot, source),
        };
      }
    }
  }

  if (closestBlocked) {
    const nextAfterRequested = firstAvailableOffer(grid, source, preferredMs);
    return {
      status: "blocked",
      nextAvailable: nextAfterRequested,
      message:
        "That time is within business hours but all crews are booked then. Offer the next earliest available window.",
    };
  }

  if (closestAny && closestAny.delta > MATCH_TOLERANCE_MS) {
    const inPast = new Date(closestAny.slot.startAt).getTime() < Date.now();
    const nextEarliest = firstAvailableOffer(grid, source);
    return {
      status: inPast ? "not_found" : "outside_hours",
      nextAvailable: nextEarliest,
      message: inPast
        ? "That time has already passed or is too soon. Offer the next earliest available window within business hours."
        : "That time is outside configured visit hours. Only offer slots returned by get_open_slots — never invent times.",
    };
  }

  return {
    status: "not_found",
    nextAvailable: firstAvailableOffer(grid, source),
    message: "Could not match that time. Offer the next earliest available window from the list.",
  };
}
