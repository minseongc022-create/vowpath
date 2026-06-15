import type { JobCard, JobPriority } from "./types";
import { isEmergencyServicePriority } from "./service-priority";
import type { PrioritySource, ServicePriority } from "./service-priority";
import {
  filterByDateRange,
  parseDateInput,
  toDateInputValue,
} from "./dashboard-analytics";
import {
  isCountableJobberBooking,
  priorityFromJobberTitle,
  type JobberBookingRecord,
} from "./jobber-bookings";
import {
  isActiveServiceRequest,
  isApprovedBooking,
  normalizeRequestStatus,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
} from "./booking-policy";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import { generateOperationsInsights } from "./operations-insights";
import type {
  FieldConfidence,
  StoredAddressValidation,
  StoredVerifiedFields,
} from "./call-intake/types";
import { isEnglishUi } from "./locale";

/** Matches StoredCallLog / GET /api/calls */
export type CallRecord = {
  id: string;
  from: string;
  priority?: JobPriority;
  servicePriority?: ServicePriority;
  priorityReasons?: string[];
  prioritySource?: PrioritySource;
  priorityOverriddenAt?: string;
  symptom?: string;
  customerName?: string;
  address?: string;
  serviceLocation?: string;
  issueType?: string;
  transcript?: string;
  arrivalWindow?: string;
  jobberRequestId?: string;
  recordingUrl?: string;
  aiSummary?: string;
  callbackPhone?: string;
  callSid?: string;
  confidence?: FieldConfidence;
  verificationComplete?: boolean;
  addressValidation?: StoredAddressValidation;
  verifiedFields?: StoredVerifiedFields;
  createdAt: string;
};

export type DatePreset = "today" | "7d" | "30d" | "6m" | "1y" | "custom";

export type NamedCount = { label: string; value: number; key?: string };

export type TrendGranularity = "day" | "week" | "month";

export type BookingTrendPoint = {
  date: string;
  periodEnd?: string;
  label: string;
  periodLabel?: string;
  bookings: number;
  calls: number;
  granularity?: TrendGranularity;
};

export type ActivityFeedItem = {
  id: string;
  kind: "call" | "booking" | "emergency";
  title: string;
  detail: string;
  createdAt: string;
};

export type AiInsight = {
  id: string;
  tone: "positive" | "neutral" | "alert";
  title: string;
  body: string;
};

export type OperationsMetrics = {
  kpis: {
    totalBookings: number;
    emergencyCalls: number;
    conversionRate: number;
    afterHoursHandled: number;
    bookingsDelta: number;
    emergencyDelta: number;
    conversionDelta: number;
    afterHoursDelta: number;
  };
  bookingTrend: BookingTrendPoint[];
  hourlyDistribution: NamedCount[];
  dayOfWeek: NamedCount[];
  emergencyBreakdown: NamedCount[];
  zipAnalysis: NamedCount[];
  recentActivity: ActivityFeedItem[];
  insights: AiInsight[];
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Legacy name — true when shop has approved the request. */
export function isConfirmedBooking(job: JobCard): boolean {
  return isApprovedBooking(job.status);
}

export function isCountableRequest(job: JobCard): boolean {
  return isActiveServiceRequest(job.status);
}

export function isEmergencyPriority(p?: JobPriority): boolean {
  return p === "P1";
}

/** US shop hours: Mon–Fri 8am–5pm = business; else after-hours */
export function isAfterHours(iso: string): boolean {
  const d = new Date(iso);
  const day = d.getDay();
  const hour = d.getHours();
  if (day === 0 || day === 6) return true;
  return hour < 8 || hour >= 17;
}

export function extractZipCode(address?: string): string | null {
  if (!address?.trim()) return null;
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? null;
}

export function jobCreatedAt(job: JobCard): string {
  return job.createdAt ?? "";
}

export function resolveMonthToDate(now = new Date()): { start: Date; end: Date } {
  const end = now;
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: startOfDay(start), end };
}

/** Same calendar days in the previous month (fair MTD comparison). */
export function resolvePreviousMonthSamePeriod(now = new Date()): { start: Date; end: Date } {
  const prevMonthIndex = now.getMonth() - 1;
  const year = prevMonthIndex < 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = prevMonthIndex < 0 ? 11 : prevMonthIndex;
  const start = startOfDay(new Date(year, month, 1));
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(now.getDate(), lastDay);
  const end = new Date(
    year,
    month,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
  return { start, end };
}

function dateLocale(): string {
  return isEnglishUi() ? "en-US" : "ko-KR";
}

export function formatMonthLabel(date = new Date()): string {
  return date.toLocaleDateString(dateLocale(), { month: "long", year: "numeric" });
}

export function formatMonthRangeShort(start: Date, end: Date): string {
  const locale = dateLocale();
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    if (isEnglishUi()) {
      const month = start.toLocaleDateString(locale, { month: "short" });
      return `${month} ${start.getDate()} – ${end.getDate()}`;
    }
    return `${start.toLocaleDateString(locale, { month: "short" })} ${start.getDate()}일 – ${end.getDate()}일`;
  }
  return `${start.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric" })}`;
}

export function resolveDateRange(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
): { start: Date; end: Date } | null {
  const end = new Date();

  if (preset === "custom") {
    const startParsed = customStart ? parseDateInput(customStart) : null;
    const endParsed = customEnd ? parseDateInput(customEnd) : null;
    if (!startParsed || !endParsed || startParsed > endParsed) return null;
    return { start: startOfDay(startParsed), end: endOfDay(endParsed) };
  }

  const start = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(end), end };
    case "7d":
      start.setDate(end.getDate() - 6);
      break;
    case "30d":
      start.setDate(end.getDate() - 29);
      break;
    case "6m":
      start.setMonth(end.getMonth() - 6);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      return null;
  }
  return { start: startOfDay(start), end };
}

function previousPeriod(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - ms);
  return { start: prevStart, end: prevEnd };
}

function jobsInRange(jobs: JobCard[], start: Date, end: Date) {
  return filterByDateRange(
    jobs.filter((j) => Boolean(jobCreatedAt(j))),
    start,
    end,
  );
}

function jobberInRange(bookings: JobberBookingRecord[], start: Date, end: Date) {
  return filterByDateRange(
    bookings.filter((b) => isCountableJobberBooking(b.requestStatus)),
    start,
    end,
  );
}

/** Local jobs, call Jobber IDs, and live Jobber requests (deduped by request ID) */
function effectiveJobStatus(
  job: JobCard,
  requestStatuses: Record<string, RequestStatus>,
): string {
  return (
    lookupStoredRequestStatus(job.id, requestStatuses, job.jobberJobId) ??
    normalizeRequestStatus(job.status)
  );
}

function countBookingsInRange(
  calls: CallRecord[],
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  start: Date,
  end: Date,
  requestStatuses: Record<string, RequestStatus> = {},
): number {
  const seen = new Set<string>();
  let count = 0;

  const add = (id: string | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    count += 1;
  };

  for (const booking of jobberInRange(jobberBookings, start, end)) {
    add(booking.requestId);
  }

  for (const job of jobsInRange(jobs, start, end)) {
    if (!isActiveServiceRequest(effectiveJobStatus(job, requestStatuses))) continue;
    add(job.jobberJobId ?? job.id);
  }

  for (const call of filterByDateRange(calls, start, end)) {
    add(call.jobberRequestId);
  }

  return count;
}

function countDaysInclusive(start: Date, end: Date) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}

function formatTrendDayLabel(d: Date) {
  return d.toLocaleDateString(dateLocale(), { month: "numeric", day: "numeric" });
}

function formatTrendWeekLabel(weekStart: Date) {
  return weekStart.toLocaleDateString(dateLocale(), { month: "numeric", day: "numeric" });
}

function formatTrendMonthLabel(d: Date, spanCrossesYear: boolean) {
  if (spanCrossesYear) {
    return d.toLocaleDateString(dateLocale(), { year: "2-digit", month: "short" });
  }
  return d.toLocaleDateString(dateLocale(), { month: "short" });
}

/** Monday-start week (US shop calendar). */
function startOfWeekMonday(d: Date) {
  const x = startOfDay(d);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function formatTrendPeriodRange(start: Date, end: Date, granularity: TrendGranularity): string {
  const locale = dateLocale();
  if (granularity === "month") {
    return start.toLocaleDateString(locale, { year: "numeric", month: "long" });
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const a = start.toLocaleDateString(locale, opts);
  const b = end.toLocaleDateString(locale, opts);
  return a === b ? a : `${a} – ${b}`;
}

function pushTrendPoint(
  points: BookingTrendPoint[],
  rangeStart: Date,
  rangeEndDay: Date,
  granularity: TrendGranularity,
  spanCrossesYear: boolean,
  bookings: number,
  calls: number,
) {
  const bucketStart = startOfDay(rangeStart);
  const bucketEnd = startOfDay(rangeEndDay);
  points.push({
    date: toDateInputValue(bucketStart),
    periodEnd: toDateInputValue(bucketEnd),
    label:
      granularity === "month"
        ? formatTrendMonthLabel(bucketStart, spanCrossesYear)
        : granularity === "week"
          ? formatTrendWeekLabel(bucketStart)
          : formatTrendDayLabel(bucketStart),
    periodLabel: formatTrendPeriodRange(bucketStart, bucketEnd, granularity),
    bookings,
    calls,
    granularity,
  });
}

export function resolveTrendGranularity(start: Date, end: Date): TrendGranularity {
  const days = countDaysInclusive(start, end);
  if (days <= 14) return "day";
  if (days <= 90) return "week";
  return "month";
}

function buildBookingTrend(
  calls: CallRecord[],
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  start: Date,
  end: Date,
  requestStatuses: Record<string, RequestStatus> = {},
): BookingTrendPoint[] {
  const granularity = resolveTrendGranularity(start, end);
  if (granularity === "month") {
    return buildBookingTrendMonthly(
      calls,
      jobs,
      jobberBookings,
      start,
      end,
      requestStatuses,
    );
  }
  if (granularity === "week") {
    return buildBookingTrendWeekly(
      calls,
      jobs,
      jobberBookings,
      start,
      end,
      requestStatuses,
    );
  }

  const points: BookingTrendPoint[] = [];
  for (let cursor = startOfDay(start); cursor <= startOfDay(end); cursor.setDate(cursor.getDate() + 1)) {
    const dayStart = startOfDay(cursor);
    const dayEnd = endOfDay(cursor);
    const dayCalls = filterByDateRange(calls, dayStart, dayEnd);
    const dayBookings = countBookingsInRange(
      calls,
      jobs,
      jobberBookings,
      dayStart,
      dayEnd,
      requestStatuses,
    );
    pushTrendPoint(points, dayStart, dayStart, "day", false, dayBookings, dayCalls.length);
  }
  return points;
}

function buildBookingTrendWeekly(
  calls: CallRecord[],
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  start: Date,
  end: Date,
  requestStatuses: Record<string, RequestStatus> = {},
): BookingTrendPoint[] {
  const points: BookingTrendPoint[] = [];
  const rangeStartBound = startOfDay(start);
  const rangeEnd = startOfDay(end);

  let weekMonday = startOfWeekMonday(rangeStartBound);
  while (weekMonday <= rangeEnd) {
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekSunday.getDate() + 6);
    const bucketStart =
      weekMonday < rangeStartBound ? rangeStartBound : startOfDay(weekMonday);
    const bucketEndDay =
      startOfDay(weekSunday) > rangeEnd ? rangeEnd : startOfDay(weekSunday);
    const rangeStart = bucketStart;
    const rangeFinish = endOfDay(bucketEndDay);

    const weekCalls = filterByDateRange(calls, rangeStart, rangeFinish);
    const weekBookings = countBookingsInRange(
      calls,
      jobs,
      jobberBookings,
      rangeStart,
      rangeFinish,
      requestStatuses,
    );

    pushTrendPoint(points, bucketStart, bucketEndDay, "week", false, weekBookings, weekCalls.length);

    weekMonday.setDate(weekMonday.getDate() + 7);
  }

  return points;
}

function buildBookingTrendMonthly(
  calls: CallRecord[],
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  start: Date,
  end: Date,
  requestStatuses: Record<string, RequestStatus> = {},
): BookingTrendPoint[] {
  const points: BookingTrendPoint[] = [];
  const spanCrossesYear = start.getFullYear() !== end.getFullYear();

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastMonthStart = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= lastMonthStart) {
    const monthStart = startOfDay(cursor);
    const monthEnd = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    const rangeStart = monthStart < startOfDay(start) ? startOfDay(start) : monthStart;
    const rangeFinish = monthEnd > endOfDay(end) ? endOfDay(end) : monthEnd;

    const monthCalls = filterByDateRange(calls, rangeStart, rangeFinish);
    const monthBookings = countBookingsInRange(
      calls,
      jobs,
      jobberBookings,
      rangeStart,
      rangeFinish,
      requestStatuses,
    );

    pushTrendPoint(
      points,
      rangeStart,
      startOfDay(rangeFinish),
      "month",
      spanCrossesYear,
      monthBookings,
      monthCalls.length,
    );

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return points;
}

function buildHourlyDistribution(calls: CallRecord[], start: Date, end: Date): NamedCount[] {
  const counts = Array.from({ length: 24 }, (_, h) => ({ label: formatHour(h), value: 0, key: String(h) }));
  for (const call of filterByDateRange(calls, start, end)) {
    const h = new Date(call.createdAt).getHours();
    counts[h].value += 1;
  }
  return counts;
}

function formatHour(h: number) {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function buildDayOfWeek(calls: CallRecord[], start: Date, end: Date): NamedCount[] {
  const counts = DOW_LABELS.map((label, i) => ({ label, value: 0, key: String(i) }));
  for (const call of filterByDateRange(calls, start, end)) {
    const dow = new Date(call.createdAt).getDay();
    counts[dow].value += 1;
  }
  return counts;
}

function buildEmergencyBreakdown(
  calls: CallRecord[],
  jobs: JobCard[],
  start: Date,
  end: Date,
): NamedCount[] {
  const rangeCalls = filterByDateRange(calls, start, end);
  const rangeJobs = jobsInRange(jobs, start, end);
  const tally = { P1: 0, P2: 0, P3: 0, Unclassified: 0 };

  for (const call of rangeCalls) {
    const p = call.priority;
    if (p === "P1" || p === "P2" || p === "P3") tally[p] += 1;
    else tally.Unclassified += 1;
  }
  for (const job of rangeJobs) {
    if (rangeCalls.some((c) => c.symptom === job.symptom && c.customerName === job.customerName)) {
      continue;
    }
    tally[job.priority] += 1;
  }

  return [
    { label: "P1 Emergency", value: tally.P1, key: "P1" },
    { label: "P2 Same-day", value: tally.P2, key: "P2" },
    { label: "P3 Routine", value: tally.P3, key: "P3" },
    { label: "Unclassified", value: tally.Unclassified, key: "none" },
  ];
}

function buildZipAnalysis(
  calls: CallRecord[],
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  start: Date,
  end: Date,
): NamedCount[] {
  const zipMap = new Map<string, number>();

  const bump = (address?: string) => {
    const zip = extractZipCode(address);
    if (!zip) return;
    zipMap.set(zip, (zipMap.get(zip) ?? 0) + 1);
  };

  for (const call of filterByDateRange(calls, start, end)) {
    bump(call.address);
  }
  for (const job of jobsInRange(jobs, start, end)) {
    bump(job.address);
  }
  for (const booking of jobberInRange(jobberBookings, start, end)) {
    bump(booking.address);
  }

  return [...zipMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value, key: label }));
}

function buildRecentActivity(
  calls: CallRecord[],
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  limit = 8,
): ActivityFeedItem[] {
  const callItems: ActivityFeedItem[] = calls.map((c) => ({
    id: `call-${c.id}`,
    kind: c.jobberRequestId
      ? "booking"
      : isEmergencyPriority(c.priority)
        ? "emergency"
        : "call",
    title: c.customerName || c.from,
    detail: c.jobberRequestId
      ? `${c.symptom ?? "Call"} · Jobber ${c.jobberRequestId}`
      : c.symptom || c.transcript?.slice(0, 80) || "Inbound call",
    createdAt: c.createdAt,
  }));

  const jobItems: ActivityFeedItem[] = jobs
    .filter((j) => Boolean(jobCreatedAt(j)))
    .map((j) => ({
      id: `job-${j.id}`,
      kind: "booking" as const,
      title: j.customerName,
      detail: `${j.symptom} · ${isConfirmedBooking(j) ? REQUEST_STATUS_LABELS.approved : REQUEST_STATUS_LABELS[normalizeRequestStatus(j.status)]}`,
      createdAt: jobCreatedAt(j),
    }));

  const jobberItems: ActivityFeedItem[] = jobberBookings
    .filter((b) => {
      const dupJob = jobs.some((j) => j.jobberJobId === b.requestId);
      const dupCall = calls.some((c) => c.jobberRequestId === b.requestId);
      return !dupJob && !dupCall;
    })
    .map((b) => ({
      id: `jobber-${b.requestId}`,
      kind: "booking" as const,
      title: b.customerName || b.title,
      detail: `${b.title} · Jobber ${b.requestStatus.replace(/_/g, " ")}`,
      createdAt: b.createdAt,
    }));

  return [...callItems, ...jobItems, ...jobberItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

function countPeriodDays(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function countJobberConverted(bookings: JobberBookingRecord[]): number {
  return bookings.filter((b) => {
    const status = b.requestStatus.toLowerCase();
    return status === "converted" || status === "completed";
  }).length;
}

export function buildOperationsMetrics(
  calls: CallRecord[],
  jobs: JobCard[],
  start: Date,
  end: Date,
  jobberBookings: JobberBookingRecord[] = [],
  jobberConnected = false,
  requestStatuses: Record<string, RequestStatus> = {},
): OperationsMetrics {
  const rangeCalls = filterByDateRange(calls, start, end);
  const rangeJobber = jobberInRange(jobberBookings, start, end);
  const totalBookings = countBookingsInRange(
    calls,
    jobs,
    jobberBookings,
    start,
    end,
    requestStatuses,
  );
  const emergencies = rangeCalls.filter((c) => isEmergencyPriority(c.priority));
  const afterHours = rangeCalls.filter((c) => isAfterHours(c.createdAt));

  const prev = previousPeriod(start, end);
  const prevCalls = filterByDateRange(calls, prev.start, prev.end);
  const prevBookings = countBookingsInRange(
    calls,
    jobs,
    jobberBookings,
    prev.start,
    prev.end,
    requestStatuses,
  );
  const prevEmergencies = prevCalls.filter((c) => isEmergencyPriority(c.priority));
  const prevAfterHours = prevCalls.filter((c) => isAfterHours(c.createdAt));

  const conversionRate =
    rangeCalls.length > 0 ? Math.round((totalBookings / rangeCalls.length) * 100) : 0;
  const prevConversion =
    prevCalls.length > 0 ? Math.round((prevBookings / prevCalls.length) * 100) : 0;

  const kpis = {
    totalBookings,
    emergencyCalls: emergencies.length,
    conversionRate,
    afterHoursHandled: afterHours.length,
    bookingsDelta: pctChange(totalBookings, prevBookings),
    emergencyDelta: pctChange(emergencies.length, prevEmergencies.length),
    afterHoursDelta: pctChange(afterHours.length, prevAfterHours.length),
    conversionDelta: conversionRate - prevConversion,
  };

  const hourlyDistribution = buildHourlyDistribution(calls, start, end);
  const zipAnalysis = buildZipAnalysis(calls, jobs, jobberBookings, start, end);
  const dayOfWeek = buildDayOfWeek(calls, start, end);
  const emergencyBreakdown = buildEmergencyBreakdown(calls, jobs, start, end);
  const bookingTrend = buildBookingTrend(
    calls,
    jobs,
    jobberBookings,
    start,
    end,
    requestStatuses,
  );
  const periodDays = countPeriodDays(start, end);

  return {
    kpis,
    bookingTrend,
    hourlyDistribution,
    dayOfWeek,
    emergencyBreakdown,
    zipAnalysis,
    recentActivity: buildRecentActivity(calls, jobs, jobberBookings),
    insights: generateOperationsInsights({
      kpis,
      rangeCalls: rangeCalls.length,
      rangeBookings: totalBookings,
      prevCalls: prevCalls.length,
      prevBookings,
      prevEmergencyCalls: prevEmergencies.length,
      prevAfterHoursCalls: prevAfterHours.length,
      hourly: hourlyDistribution,
      dayOfWeek,
      emergencyBreakdown,
      zipAnalysis,
      bookingTrend,
      jobberConnected,
      jobberBookingsInRange: rangeJobber.length,
      jobberConvertedCount: countJobberConverted(rangeJobber),
      periodDays,
    }),
  };
}

/** Merge Jobber requests with local jobs for the jobs list (Jobber wins on duplicate request ID) */
export function mergeJobsWithJobber(
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
): JobCard[] {
  const seen = new Set<string>();
  const merged: JobCard[] = [];

  for (const booking of [...jobberBookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )) {
    if (seen.has(booking.requestId)) continue;
    seen.add(booking.requestId);
    merged.push({
      id: `jobber-${booking.requestId}`,
      jobberJobId: booking.requestId,
      priority: priorityFromJobberTitle(booking.title),
      symptom: booking.title,
      customerName: booking.customerName,
      address: booking.address,
      arrivalWindow: booking.requestStatus.replace(/_/g, " "),
      status:
        booking.requestStatus === "converted" || booking.requestStatus === "completed"
          ? "scheduled"
          : "pending_review",
      createdAt: booking.createdAt,
    });
  }

  for (const job of jobs) {
    const key = job.jobberJobId ?? job.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(job);
  }

  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type { JobberBookingRecord };

export { toDateInputValue, parseDateInput };
