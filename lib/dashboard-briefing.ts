import {
  isApprovedBooking,
  isPendingShopReview,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import type { JobberBookingRecord } from "./jobber-bookings";
import type { CallRecord } from "./operations-analytics";
import {
  buildAllRecentBookings,
  type RecentBooking,
} from "./recent-bookings";
import type { JobCard } from "./types";
import { isUrgentBooking, isUrgentCall } from "./urgent-requests";

export type BriefingMetric = {
  label: string;
  value: string;
  hint?: string;
};

export type DailyBriefing = {
  titleDate: string;
  summary: string[];
  metrics: BriefingMetric[];
  urgentBookings: RecentBooking[];
  pendingBookings: RecentBooking[];
};

export type BriefingInput = {
  calls: CallRecord[];
  jobs: JobCard[];
  jobberBookings: JobberBookingRecord[];
  requestStatuses: Record<string, RequestStatus>;
  now?: Date;
  /** Which day KPI cards reflect. Dashboard uses today; morning SMS uses yesterday. */
  metricsFocus?: "today" | "yesterday";
};

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isWithin(dateIso: string, start: Date, end: Date): boolean {
  const t = new Date(dateIso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function yesterdayRange(now: Date) {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return { start: startOfLocalDay(y), end: endOfLocalDay(y) };
}

function todayRange(now: Date) {
  return { start: startOfLocalDay(now), end: endOfLocalDay(now) };
}

function formatHourRange(hour: number | null): string {
  if (hour === null) return "No data";
  const start = new Date();
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1);
  const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function mostCommonService(bookings: RecentBooking[]): string {
  const counts = new Map<string, number>();
  for (const booking of bookings) {
    const label = booking.issueType?.trim();
    if (!label || label === "—") continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? "No data";
}

function peakCallHour(calls: CallRecord[]): number | null {
  if (calls.length === 0) return null;
  const counts = new Map<number, number>();
  for (const call of calls) {
    const hour = new Date(call.createdAt).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function isAfterHours(call: CallRecord): boolean {
  const d = new Date(call.createdAt);
  const hour = d.getHours();
  const day = d.getDay();
  return day === 0 || day === 6 || hour < 8 || hour >= 17;
}

function statusFor(booking: RecentBooking, statuses: Record<string, RequestStatus>): RequestStatus {
  return normalizeRequestStatus(statuses[booking.id] ?? booking.status);
}

export function buildDailyBriefing(input: BriefingInput): DailyBriefing {
  const now = input.now ?? new Date();
  const metricsFocus = input.metricsFocus ?? "today";
  const today = todayRange(now);
  const yesterday = yesterdayRange(now);
  const bookings = buildAllRecentBookings(
    input.jobs,
    input.jobberBookings,
    input.calls,
    input.requestStatuses,
  );

  const metricsRange = metricsFocus === "yesterday" ? yesterday : today;
  const dayLabel = metricsFocus === "yesterday" ? "Yesterday's" : "Today's";

  const todayCalls = input.calls.filter((call) => isWithin(call.createdAt, today.start, today.end));
  const todayBookings = bookings.filter((booking) =>
    isWithin(booking.createdAt, today.start, today.end),
  );
  const yesterdayCalls = input.calls.filter((call) =>
    isWithin(call.createdAt, yesterday.start, yesterday.end),
  );
  const yesterdayBookings = bookings.filter((booking) =>
    isWithin(booking.createdAt, yesterday.start, yesterday.end),
  );

  const metricsCalls = input.calls.filter((call) =>
    isWithin(call.createdAt, metricsRange.start, metricsRange.end),
  );
  const metricsBookings = bookings.filter((booking) =>
    isWithin(booking.createdAt, metricsRange.start, metricsRange.end),
  );

  const pendingBookings = bookings.filter((booking) =>
    isPendingShopReview(statusFor(booking, input.requestStatuses)),
  );
  const approvedBookings = metricsBookings.filter((booking) =>
    isApprovedBooking(statusFor(booking, input.requestStatuses)),
  );
  const declinedBookings = metricsBookings.filter(
    (booking) => statusFor(booking, input.requestStatuses) === "rejected",
  );
  const urgentBookings = bookings.filter(isUrgentBooking);
  const afterHoursCalls = metricsCalls.filter(isAfterHours);
  const urgentInMetrics = [
    ...metricsBookings.filter(isUrgentBooking),
    ...metricsCalls.filter(isUrgentCall).map((call) => ({
      id: `call-${call.id}`,
      customerName: call.customerName || call.from || "Unknown customer",
      issueType: call.issueType || call.symptom || "Urgent request",
      cityState: "—",
      priority: "P1" as const,
      servicePriority: "emergency" as const,
      priorityReasons: call.priorityReasons ?? [],
      priorityBadge: "Emergency" as const,
      createdAt: call.createdAt,
      address: call.address ?? "—",
      status: "pending_review",
      arrivalWindow: call.arrivalWindow,
      source: "call" as const,
    })),
  ];

  const yMostCommon = mostCommonService(yesterdayBookings);
  const yPeak = formatHourRange(peakCallHour(yesterdayCalls));

  return {
    titleDate: now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }),
    summary: [
      `Yesterday you received ${yesterdayCalls.length} calls.`,
      `${yesterdayBookings.length} booking requests were submitted.`,
      yMostCommon === "No data"
        ? "The most common issue is not available yet."
        : `The most common issue was ${yMostCommon}.`,
      yPeak === "No data"
        ? "Your busiest time is not available yet."
        : `Your busiest time was between ${yPeak}.`,
    ],
    metrics: [
      { label: `${dayLabel} Calls`, value: String(metricsCalls.length) },
      { label: "Pending Requests", value: String(pendingBookings.length) },
      { label: "Approved Requests", value: String(approvedBookings.length) },
      { label: "Declined Requests", value: String(declinedBookings.length) },
      { label: "Most Requested Service", value: mostCommonService(metricsBookings) },
      { label: "Peak Call Time", value: formatHourRange(peakCallHour(metricsCalls)) },
      { label: "After Hours Calls", value: String(afterHoursCalls.length) },
      { label: "Urgent Requests", value: String(urgentInMetrics.length) },
    ],
    urgentBookings: urgentBookings.slice(0, 8),
    pendingBookings: pendingBookings.slice(0, 8),
  };
}
