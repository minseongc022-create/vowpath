import type { ShopBookingSettings, SlotOffer } from "../booking-settings";
import type { BusyBlock } from "./compute-slots";

export type SlotGridStatus = "available" | "blocked" | "past";

export type SlotGridItem = {
  id: string;
  startAt: string;
  endAt: string;
  label: string;
  status: SlotGridStatus;
  source: "jobber" | "native";
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
  maxConcurrentVisits: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function formatTimeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => {
    const h = d.getHours();
    const ap = h >= 12 ? "pm" : "am";
    const hs = h % 12 || 12;
    const m = d.getMinutes();
    return m === 0 ? `${hs}${ap}` : `${hs}:${String(m).padStart(2, "0")}${ap}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Each busy block reserves [start, end + gap]. The next visit may start exactly at end + gap. */
function countBlockingOverlaps(
  startMs: number,
  endMs: number,
  bufferMs: number,
  busyBlocks: BusyBlock[],
): number {
  return busyBlocks.filter((b) => {
    const bStart = new Date(b.startAt).getTime();
    const reservedEnd = new Date(b.endAt).getTime() + bufferMs;
    return overlaps(startMs, endMs, bStart, reservedEnd);
  }).length;
}

/** Step size for calendar grid (30-minute ticks within business windows). */
const GRID_STEP_MINUTES = 30;

export function computeSlotGrid(params: {
  settings: ShopBookingSettings;
  busyBlocks: BusyBlock[];
  priority: "P1" | "P2" | "P3";
  now?: Date;
  source: "jobber" | "native";
  horizonDays?: number;
}): SlotGridResult {
  const { settings, busyBlocks, priority, source } = params;
  const now = params.now ?? new Date();
  const horizon = params.horizonDays ?? 14;
  const durationMs = settings.defaultDurationMinutes * 60_000;
  const bufferMs = settings.slotBufferMinutes * 60_000;
  const capacity = Math.max(1, Math.round(settings.maxConcurrentVisits));
  const stepMs = GRID_STEP_MINUTES * 60_000;
  const startDayOffset = priority === "P1" ? 0 : 1;
  const minLeadMs = 60 * 60_000;

  const dayMap = new Map<string, SlotGridDay>();

  for (let d = startDayOffset; d < horizon + startDayOffset; d++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + d);
    if (day.getDay() === 0) continue;

    const windows = [
      { startH: settings.amWindowStart, endH: settings.amWindowEnd },
      { startH: settings.pmWindowStart, endH: settings.pmWindowEnd },
    ];

    for (const tmpl of windows) {
      const windowStart = new Date(day);
      windowStart.setHours(tmpl.startH, 0, 0, 0);
      const windowEnd = new Date(day);
      windowEnd.setHours(tmpl.endH, 0, 0, 0);
      const latestStart = windowEnd.getTime() - durationMs;

      for (let t = windowStart.getTime(); t <= latestStart; t += stepMs) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t + durationMs);
        const startMs = slotStart.getTime();
        const endMs = slotEnd.getTime();

        let status: SlotGridStatus = "available";
        if (startMs < now.getTime() + minLeadMs) {
          status = "past";
        } else if (countBlockingOverlaps(startMs, endMs, bufferMs, busyBlocks) >= capacity) {
          status = "blocked";
        }

        const key = dateKey(day);
        if (!dayMap.has(key)) {
          dayMap.set(key, {
            date: key,
            weekdayLabel: DAY_NAMES[day.getDay()],
            monthDayLabel: `${MONTH_NAMES[day.getMonth()]} ${day.getDate()}`,
            slots: [],
          });
        }

        const dayEntry = dayMap.get(key)!;
        const slotId = `${key}-${slotStart.getHours()}-${slotStart.getMinutes()}`;
        dayEntry.slots.push({
          id: slotId,
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          label: formatTimeLabel(slotStart, slotEnd),
          status,
          source,
        });
      }
    }
  }

  const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    days,
    durationMinutes: settings.defaultDurationMinutes,
    bufferMinutes: settings.slotBufferMinutes,
    maxConcurrentVisits: capacity,
  };
}

export function availableSlotsFromGrid(
  grid: SlotGridResult,
  maxOffers: number,
  source: "jobber" | "native",
): SlotOffer[] {
  const offers: SlotOffer[] = [];
  for (const day of grid.days) {
    for (const slot of day.slots) {
      if (slot.status !== "available") continue;
      offers.push({
        id: slot.id,
        label: `${day.weekdayLabel} ${slot.label}`,
        startAt: slot.startAt,
        endAt: slot.endAt,
        source,
      });
      if (offers.length >= maxOffers) return offers;
    }
  }
  return offers;
}
