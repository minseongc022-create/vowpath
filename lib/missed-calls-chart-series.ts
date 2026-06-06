import type { MissedCallsDailyPoint } from "./missed-calls-analytics";

/** Line chart for ranges up to this many calendar days; bar chart above. */
export const MISSED_CALLS_LINE_MAX_DAYS = 30;

export type MissedCallsChartMode = "line" | "bar";

export function missedCallsChartMode(dayCount: number): MissedCallsChartMode {
  return dayCount > MISSED_CALLS_LINE_MAX_DAYS ? "bar" : "line";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function formatWeekLabel(d: Date): string {
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function formatMonthLabel(d: Date, includeYear: boolean): string {
  return d.toLocaleDateString("ko-KR", {
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {}),
  });
}

function formatPeriodRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const a = start.toLocaleDateString("ko-KR", opts);
  const b = end.toLocaleDateString("ko-KR", opts);
  return a === b ? a : `${a} – ${b}`;
}

function aggregateBuckets(
  daily: MissedCallsDailyPoint[],
  bucketKey: (d: Date) => string,
  bucketStart: (d: Date) => Date,
  labelFor: (start: Date, end: Date, includeYear: boolean) => string,
): MissedCallsDailyPoint[] {
  if (daily.length === 0) return [];
  const first = new Date(`${daily[0].date}T12:00:00`);
  const last = new Date(`${daily[daily.length - 1].date}T12:00:00`);
  const includeYear = first.getFullYear() !== last.getFullYear();

  type BucketTotals = {
    start: Date;
    end: Date;
    callsSaved: number;
    waitingCustomers: number;
    emergency: number;
    bookedJobs: number;
    inboundCalls: number;
  };

  const map = new Map<string, BucketTotals>();

  for (const point of daily) {
    const day = new Date(`${point.date}T12:00:00`);
    const key = bucketKey(day);
    const start = bucketStart(day);
    const existing = map.get(key);
    if (existing) {
      existing.callsSaved += point.callsSaved;
      existing.waitingCustomers += point.waitingCustomers;
      existing.emergency += point.emergency;
      existing.bookedJobs += point.bookedJobs;
      existing.inboundCalls += point.inboundCalls;
      if (day > existing.end) existing.end = startOfDay(day);
      if (day < existing.start) existing.start = startOfDay(day);
    } else {
      map.set(key, {
        start,
        end: startOfDay(day),
        callsSaved: point.callsSaved,
        waitingCustomers: point.waitingCustomers,
        emergency: point.emergency,
        bookedJobs: point.bookedJobs,
        inboundCalls: point.inboundCalls,
      });
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, bucket]) => ({
      date: bucket.start.toISOString().slice(0, 10),
      label: labelFor(bucket.start, bucket.end, includeYear),
      periodLabel: formatPeriodRange(bucket.start, bucket.end),
      callsSaved: bucket.callsSaved,
      waitingCustomers: bucket.waitingCustomers,
      emergency: bucket.emergency,
      bookedJobs: bucket.bookedJobs,
      inboundCalls: bucket.inboundCalls,
    }));
}

function aggregateWeekly(daily: MissedCallsDailyPoint[]): MissedCallsDailyPoint[] {
  return aggregateBuckets(
    daily,
    (d) => startOfWeekMonday(d).toISOString().slice(0, 10),
    startOfWeekMonday,
    (start, _end, _includeYear) => formatWeekLabel(start),
  );
}

function aggregateMonthly(daily: MissedCallsDailyPoint[]): MissedCallsDailyPoint[] {
  return aggregateBuckets(
    daily,
    (d) => {
      const m = startOfMonth(d);
      return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    },
    startOfMonth,
    (start, _end, includeYear) => formatMonthLabel(start, includeYear),
  );
}

export type PreparedMissedCallsChart = {
  data: MissedCallsDailyPoint[];
  mode: MissedCallsChartMode;
  /** Shown above chart when buckets are weekly/monthly. */
  granularityHint: string | null;
};

export function prepareMissedCallsChartData(
  daily: MissedCallsDailyPoint[],
): PreparedMissedCallsChart {
  const dayCount = daily.length;
  const mode = missedCallsChartMode(dayCount);

  if (mode === "line") {
    return { data: daily, mode, granularityHint: null };
  }

  if (dayCount <= 45) {
    return { data: daily, mode, granularityHint: null };
  }
  if (dayCount <= 120) {
    return {
      data: aggregateWeekly(daily),
      mode,
      granularityHint: "월요일 기준 · 주간 합계 (막대)",
    };
  }
  return {
    data: aggregateMonthly(daily),
    mode,
    granularityHint: "월별 합계 (막대)",
  };
}

export function missedCallsTrendSubtitle(dayCount: number, mode: MissedCallsChartMode): string {
  if (mode === "line") return `${dayCount}일 · 일별 · 선 그래프`;
  if (dayCount <= 45) return `${dayCount}일 · 일별 · 막대 그래프`;
  if (dayCount <= 120) return `${dayCount}일 · 주간 · 막대 그래프`;
  return `${dayCount}일 · 월별 · 막대 그래프`;
}
