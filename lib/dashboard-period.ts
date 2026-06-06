import type { DashboardDateRange } from "@/components/dashboard/DashboardDateRangePicker";
import { toDateInputValue } from "./dashboard-analytics";
import {
  resolveMissedCallsAnalyticsRange,
  type MissedCallsAnalyticsPreset,
} from "./missed-calls-analytics";

export function analyticsPresetToDateRange(
  preset: MissedCallsAnalyticsPreset,
): DashboardDateRange {
  const { start, end } = resolveMissedCallsAnalyticsRange(preset);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

export function formatDashboardPeriodLabel(start: string, end: string): string {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  const a = s.toLocaleDateString(
    "ko-KR",
    s.getFullYear() !== e.getFullYear() ? yearOpts : opts,
  );
  const b = e.toLocaleDateString("ko-KR", yearOpts);
  return a === b ? a : `${a} – ${b}`;
}

export function matchAnalyticsPreset(
  range: DashboardDateRange,
): MissedCallsAnalyticsPreset | null {
  const presets: MissedCallsAnalyticsPreset[] = [
    "today",
    "7d",
    "30d",
    "6m",
    "1y",
  ];
  for (const id of presets) {
    const p = analyticsPresetToDateRange(id);
    if (p.start === range.start && p.end === range.end) return id;
  }
  return null;
}
