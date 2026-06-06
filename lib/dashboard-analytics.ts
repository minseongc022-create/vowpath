import { isApprovedBooking } from "./booking-policy";
import type { JobCard } from "./types";

export const EST_REVENUE_PER_BOOKING = 385;

export type DailyMetric = {
  date: string;
  label: string;
  calls: number;
  bookings: number;
};

export type ActivityItem = {
  id: string;
  type: "call" | "booking";
  title: string;
  subtitle: string;
  createdAt: string;
};

export type AnalyticsSummary = {
  totalCalls: number;
  totalBookings: number;
  estimatedRevenue: number;
  responseRate: number;
  callsDelta: number;
  bookingsDelta: number;
};

type Timestamped = { createdAt: string };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function filterByDateRange<T extends Timestamped>(
  items: T[],
  start: Date,
  end: Date,
): T[] {
  const from = startOfDay(start).getTime();
  const to = endOfDay(end).getTime();
  return items.filter((item) => {
    const t = new Date(item.createdAt).getTime();
    return t >= from && t <= to;
  });
}

export function buildDailySeries(
  calls: Timestamped[],
  jobs: JobCard[],
  start: Date,
  end: Date,
): DailyMetric[] {
  const from = startOfDay(start);
  const to = startOfDay(end);
  const series: DailyMetric[] = [];

  for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const dayStart = startOfDay(cursor);
    const dayEnd = endOfDay(cursor);
    const dayCalls = filterByDateRange(calls, dayStart, dayEnd).length;
    const dayBookings = filterByDateRange(jobs, dayStart, dayEnd).filter(
      (j) => isApprovedBooking(j.status),
    ).length;

    series.push({
      date: toDateInputValue(dayStart),
      label: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calls: dayCalls,
      bookings: dayBookings,
    });
  }

  return series;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function summarizeAnalytics(
  calls: Timestamped[],
  jobs: JobCard[],
  start: Date,
  end: Date,
): AnalyticsSummary {
  const rangeCalls = filterByDateRange(calls, start, end);
  const rangeBookings = filterByDateRange(jobs, start, end).filter(
    (j) => isApprovedBooking(j.status),
  );

  const rangeMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - rangeMs);

  const prevCalls = filterByDateRange(calls, prevStart, prevEnd);
  const prevBookings = filterByDateRange(jobs, prevStart, prevEnd).filter(
    (j) => isApprovedBooking(j.status),
  );

  const totalCalls = rangeCalls.length;
  const totalBookings = rangeBookings.length;

  return {
    totalCalls,
    totalBookings,
    estimatedRevenue: totalBookings * EST_REVENUE_PER_BOOKING,
    responseRate: totalCalls > 0 ? Math.round((totalBookings / totalCalls) * 100) : 0,
    callsDelta: pctChange(totalCalls, prevCalls.length),
    bookingsDelta: pctChange(totalBookings, prevBookings.length),
  };
}

export function buildRecentActivity(
  calls: { id: string; createdAt: string; customerName?: string; from: string; symptom?: string }[],
  jobs: JobCard[],
  limit = 6,
): ActivityItem[] {
  const callItems: ActivityItem[] = calls.map((c) => ({
    id: `call-${c.id}`,
    type: "call",
    title: c.customerName || c.from,
    subtitle: c.symptom || "Inbound call received",
    createdAt: c.createdAt,
  }));

  const jobItems: ActivityItem[] = jobs.map((j) => ({
    id: `job-${j.id}`,
    type: "booking",
    title: j.customerName,
    subtitle: `${j.symptom} · ${j.status}`,
    createdAt: j.createdAt ?? new Date().toISOString(),
  }));

  return [...callItems, ...jobItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function defaultRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start, end };
}

export function monthToDateRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { start, end };
}
