import { filterByDateRange } from "./dashboard-analytics";
import { isAfterHours, type CallRecord } from "./operations-analytics";
import { isOvernight, parseRowsFromStored, type ScheduleRow } from "./schedule-format";
import type { AnswerWindow, ShopState } from "./types";

export type MissedCallsPeriod = "today" | "7d" | "30d" | "all";

const MIN_TRANSCRIPT_CHARS = 8;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveMissedCallsPeriodRange(
  period: MissedCallsPeriod,
  now = new Date(),
): { start: Date; end: Date } | null {
  const end = now;
  switch (period) {
    case "today":
      return { start: startOfDay(end), end };
    case "7d": {
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: startOfDay(start), end };
    }
    case "30d": {
      const start = new Date(end);
      start.setDate(end.getDate() - 29);
      return { start: startOfDay(start), end };
    }
    case "all":
      return null;
  }
}

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Whether local time falls in a configured AI answer window (supports overnight ranges). */
export function isWithinAnyAiSchedule(iso: string, rows: ScheduleRow[]): boolean {
  if (rows.length === 0) return false;
  if (rows.some((row) => row.alwaysOn)) return true;
  const d = new Date(iso);
  return rows.some((row) => isWithinScheduleRow(d, row));
}

function isWithinScheduleRow(d: Date, row: ScheduleRow): boolean {
  const mins = minutesSinceMidnight(d);
  const startMins = row.startHour * 60 + row.startMinute;
  const endMins = row.endHour * 60 + row.endMinute;
  const day = d.getDay();

  if (!isOvernight(row)) {
    if (!row.days.includes(day)) return false;
    return mins >= startMins && mins < endMins;
  }

  if (row.days.includes(day) && mins >= startMins) return true;
  const prevDay = (day + 6) % 7;
  if (row.days.includes(prevDay) && mins < endMins) return true;
  return false;
}

/** Inbound call that reached Vowpath AI intake (not a bare routing ping). */
export function isAiHandledCall(call: CallRecord): boolean {
  const transcript = call.transcript?.trim() ?? "";
  if (transcript.length >= MIN_TRANSCRIPT_CHARS) return true;
  if (call.verificationComplete === true) return true;
  if (call.aiSummary?.trim()) return true;
  const symptom = call.symptom?.trim().toLowerCase();
  if (symptom && symptom !== "unknown") return true;
  return false;
}

/**
 * Calls the shop likely would not have answered without Vowpath:
 * after-hours (evenings/weekends) or inside configured AI schedule windows.
 */
export function isLikelyMissedWithoutAi(
  createdAt: string,
  scheduleRows: ScheduleRow[],
  scheduleActive: boolean,
): boolean {
  if (isAfterHours(createdAt)) return true;
  if (
    scheduleActive &&
    scheduleRows.length > 0 &&
    isWithinAnyAiSchedule(createdAt, scheduleRows)
  ) {
    return true;
  }
  return false;
}

export function parseShopScheduleRows(windows: AnswerWindow[]): ScheduleRow[] {
  return parseRowsFromStored(windows);
}

export function countMissedCallsPrevented(
  calls: CallRecord[],
  period: MissedCallsPeriod,
  shop: Pick<ShopState, "scheduleWindows" | "answerScheduleActive">,
  now = new Date(),
): number {
  const range = resolveMissedCallsPeriodRange(period, now);
  const inRange = range
    ? filterByDateRange(calls, range.start, range.end)
    : calls;

  const scheduleWindows = Array.isArray(shop.scheduleWindows) ? shop.scheduleWindows : [];
  const scheduleRows =
    shop.answerScheduleActive && scheduleWindows.length > 0
      ? parseShopScheduleRows(scheduleWindows)
      : [];

  let count = 0;
  for (const call of inRange) {
    if (!isAiHandledCall(call)) continue;
    if (
      !isLikelyMissedWithoutAi(
        call.createdAt,
        scheduleRows,
        shop.answerScheduleActive,
      )
    ) {
      continue;
    }
    count += 1;
  }
  return count;
}

export function buildMissedCallsPreventedByPeriod(
  calls: CallRecord[],
  shop: Pick<ShopState, "scheduleWindows" | "answerScheduleActive">,
  now = new Date(),
): Record<MissedCallsPeriod, number> {
  return {
    today: countMissedCallsPrevented(calls, "today", shop, now),
    "7d": countMissedCallsPrevented(calls, "7d", shop, now),
    "30d": countMissedCallsPrevented(calls, "30d", shop, now),
    all: countMissedCallsPrevented(calls, "all", shop, now),
  };
}
