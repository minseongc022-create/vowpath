import type { ShopBookingSettings, SlotOffer } from "../booking-settings";
import { getVisitWindowsForSlots } from "../visit-windows";
import type { BusyBlock } from "./compute-slots";
import {
  lanesAvailableAt,
  schedulingLeadMs,
  maxSlotOffersForPriority,
  type LaneBooking,
} from "./lane-capacity";
import {
  schedulingGapMs,
  travelReleaseStarts,
  mergeSlotStartTimes,
} from "./scheduling-gap";
import {
  addDaysToDateKey,
  dateKeyInTimezone,
  dayOfWeekInTimezone,
  utcFromShopLocal,
  formatTimeLabelInTimezone,
  weekdayShortInTimezone,
} from "../us-timezone";

export type SlotGridStatus = "available" | "blocked" | "past";

export type SlotGridItem = {
  id: string;
  startAt: string;
  endAt: string;
  label: string;
  status: SlotGridStatus;
  source: "jobber" | "native";
  /** How many crew lanes still open at this time (when capacity > 1). */
  lanesOpen?: number;
};

export type SlotGridDay = {
  date: string;
  weekdayLabel: string;
  monthDayLabel: string;
  slots: SlotGridItem[];
};

export type SlotGridResult = {
  days: SlotGridDay[];
  durationMinutes: number;
  bufferMinutes: number;
  travelMinutes: number;
  maxConcurrentVisits: number;
  timeZone: string;
  jobberScheduleUncertain?: boolean;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthDayLabel(dateKey: string, timeZone: string): string {
  const d = utcFromShopLocal(dateKey, 12, 0, timeZone);
  const month = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(d);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(d);
  return `${month} ${day}`;
}

export function computeSlotGrid(params: {
  settings: ShopBookingSettings;
  laneBookings: LaneBooking[];
  externalBlocks: BusyBlock[];
  priority: "P1" | "P2" | "P3";
  capacity: number;
  timeZone: string;
  now?: Date;
  source: "jobber" | "native";
  horizonDays?: number;
  jobberScheduleUncertain?: boolean;
}): SlotGridResult {
  const {
    settings,
    laneBookings,
    externalBlocks,
    priority,
    capacity,
    timeZone,
    source,
  } = params;
  const now = params.now ?? new Date();
  const horizon = params.horizonDays ?? 14;
  const durationMs = Math.max(15, settings.defaultDurationMinutes) * 60_000;
  const gapMs = schedulingGapMs(settings);
  const stepMs = durationMs + gapMs;
  const startDayOffset = priority === "P1" ? 0 : 1;
  const minLeadMs = schedulingLeadMs(priority);
  const travelStarts = travelReleaseStarts(laneBookings, externalBlocks, gapMs);

  const dayMap = new Map<string, SlotGridDay>();
  let cursorDateKey = dateKeyInTimezone(timeZone, now);

  for (let d = startDayOffset; d < horizon + startDayOffset; d++) {
    const dayKey =
      d === startDayOffset && startDayOffset === 0
        ? cursorDateKey
        : addDaysToDateKey(cursorDateKey, d, timeZone);

    const noon = utcFromShopLocal(dayKey, 12, 0, timeZone);
    if (dayOfWeekInTimezone(timeZone, noon) === 0) continue;

    const windows = getVisitWindowsForSlots(settings);

    for (const tmpl of windows) {
      const windowStart = utcFromShopLocal(dayKey, tmpl.startH, 0, timeZone);
      const windowEnd = utcFromShopLocal(dayKey, tmpl.endH, 0, timeZone);
      const latestStart = windowEnd.getTime() - durationMs;

      const fixedStarts: number[] = [];
      for (let t = windowStart.getTime(); t <= latestStart; t += stepMs) {
        fixedStarts.push(t);
      }
      const dynamicInWindow = travelStarts.filter(
        (t) => t >= windowStart.getTime() && t <= latestStart,
      );
      const slotStarts = mergeSlotStartTimes(
        fixedStarts,
        dynamicInWindow,
        durationMs,
        windowEnd.getTime(),
      );

      for (const t of slotStarts) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t + durationMs);
        const startMs = slotStart.getTime();
        const endMs = slotEnd.getTime();

        const lanesOpen = lanesAvailableAt(
          startMs,
          endMs,
          gapMs,
          capacity,
          laneBookings,
          externalBlocks,
        );

        let status: SlotGridStatus = "available";
        if (startMs < now.getTime() + minLeadMs) {
          status = "past";
        } else if (lanesOpen <= 0) {
          status = "blocked";
        }

        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, {
            date: dayKey,
            weekdayLabel: weekdayShortInTimezone(timeZone, noon),
            monthDayLabel: monthDayLabel(dayKey, timeZone),
            slots: [],
          });
        }

        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone,
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        }).formatToParts(slotStart);
        const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
        const min = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
        const slotId = `${dayKey}-${h}-${min}`;

        const dayEntry = dayMap.get(dayKey)!;
        dayEntry.slots.push({
          id: slotId,
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          label: formatTimeLabelInTimezone(slotStart, slotEnd, timeZone),
          status,
          source,
          lanesOpen: status === "available" ? lanesOpen : 0,
        });
      }
    }
  }

  const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    days,
    durationMinutes: Math.round(durationMs / 60_000),
    bufferMinutes: Math.max(0, settings.slotBufferMinutes),
    travelMinutes: Math.max(0, settings.travelMinutes),
    maxConcurrentVisits: capacity,
    timeZone,
    jobberScheduleUncertain: params.jobberScheduleUncertain,
  };
}

export function availableSlotsFromGrid(
  grid: SlotGridResult,
  maxOffers: number,
  source: "jobber" | "native",
  priority: "P1" | "P2" | "P3" = "P2",
): SlotOffer[] {
  const limit = maxSlotOffersForPriority(priority, maxOffers);
  const offers: SlotOffer[] = [];
  for (const day of grid.days) {
    for (const slot of day.slots) {
      if (slot.status !== "available") continue;
      const lanesNote =
        grid.maxConcurrentVisits > 1 && slot.lanesOpen
          ? ` (${slot.lanesOpen} crew${slot.lanesOpen === 1 ? "" : "s"} free)`
          : "";
      offers.push({
        id: slot.id,
        label: `${day.weekdayLabel} ${slot.label}${lanesNote}`,
        startAt: slot.startAt,
        endAt: slot.endAt,
        source,
      });
      if (offers.length >= limit) return offers;
    }
  }
  return offers;
}
