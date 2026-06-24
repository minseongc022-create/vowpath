/** Client-safe calendar types and helpers (no Node/fs imports). */

import {
  normalizeJobPriority,
  priorityDisplayLabel,
  type PriorityDisplayLabel,
} from "./priority-display";
import type { JobPriority } from "./types";
import { isEnglishUi } from "./locale";

export type CalendarEventSource = "vowroad" | "jobber";

export type CalendarEvent = {
  id: string;
  source: CalendarEventSource;
  bookingId?: string;
  startAt: string;
  endAt: string;
  timeLabel: string;
  title: string;
  customerName: string;
  phone?: string;
  address?: string;
  issue: string;
  priority?: JobPriority;
  arrivalWindow?: string;
};

/** Compact priority badge for calendar day chips. */
export function calendarPriorityMeta(priority?: JobPriority | string | null): {
  code: JobPriority;
  label: PriorityDisplayLabel;
  chipClass: string;
} {
  const code = normalizeJobPriority(priority);
  const label = priorityDisplayLabel(code);
  const chipClass =
    code === "P1"
      ? "bg-rose-500/35 text-rose-50 ring-1 ring-rose-400/40"
      : code === "P3"
        ? "bg-white/10 text-slate-300 ring-1 ring-white/15"
        : "bg-violet-500/30 text-violet-50 ring-1 ring-violet-400/30";
  return { code, label, chipClass };
}

export function formatEventTime(startAt: string, endAt: string): string {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const locale = isEnglishUi() ? "en-US" : "ko-KR";
  const fmt = (d: Date) =>
    d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  return events.filter((ev) => {
    const start = new Date(ev.startAt);
    return start.getFullYear() === y && start.getMonth() === m && start.getDate() === d;
  });
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Sunday-start month grid cells (includes leading/trailing days). */
export function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const cells: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthTitle(month: Date): string {
  const locale = isEnglishUi() ? "en-US" : "ko-KR";
  return month.toLocaleDateString(locale, { year: "numeric", month: "long" });
}
