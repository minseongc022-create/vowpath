"use client";

import { useMemo } from "react";
import type { JobCard } from "@/lib/types";
import { dashboardUi } from "@/lib/content";
import {
  buildOperationsMetrics,
  formatMonthLabel,
  formatMonthRangeShort,
  resolveMonthToDate,
  resolvePreviousMonthSamePeriod,
  type CallRecord,
  type JobberBookingRecord,
} from "@/lib/operations-analytics";

type BookingHeroProps = {
  calls: CallRecord[];
  jobs: JobCard[];
  jobberBookings?: JobberBookingRecord[];
  jobberConnected?: boolean;
  loading?: boolean;
};

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 36;
  const points = values
    .map((v, i) => {
      const x = values.length <= 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-9 w-[7.5rem] shrink-0 opacity-80"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="text-brand-500"
      />
    </svg>
  );
}

function HeroSkeleton({ copy }: { copy: typeof dashboardUi.hero }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
        {copy.loading}
      </p>
      <h2 className="mt-2 text-sm font-medium text-slate-600">{copy.serviceRequestsThisMonth}</h2>
      <div className="mt-1 h-16 w-32 animate-pulse rounded-lg bg-slate-200 sm:h-20 sm:w-40" />
      <div className="mt-4 h-4 w-48 animate-pulse rounded bg-slate-100" />
    </>
  );
}

export function BookingHero({
  calls,
  jobs,
  jobberBookings = [],
  jobberConnected = false,
  loading,
}: BookingHeroProps) {
  const t = dashboardUi.hero;
  const now = useMemo(() => new Date(), []);
  const monthRange = useMemo(() => resolveMonthToDate(now), [now]);
  const prevRange = useMemo(() => resolvePreviousMonthSamePeriod(now), [now]);

  const monthMetrics = useMemo(
    () =>
      buildOperationsMetrics(
        calls,
        jobs,
        monthRange.start,
        monthRange.end,
        jobberBookings,
        jobberConnected,
      ),
    [calls, jobs, jobberBookings, jobberConnected, monthRange],
  );

  const prevBookings = useMemo(() => {
    const prev = buildOperationsMetrics(
      calls,
      jobs,
      prevRange.start,
      prevRange.end,
      jobberBookings,
      jobberConnected,
    );
    return prev.kpis.totalBookings;
  }, [calls, jobs, jobberBookings, jobberConnected, prevRange]);

  const bookings = monthMetrics.kpis.totalBookings;
  const monthCalls = useMemo(
    () =>
      calls.filter((c) => {
        const t = new Date(c.createdAt).getTime();
        return t >= monthRange.start.getTime() && t <= monthRange.end.getTime();
      }).length,
    [calls, monthRange],
  );

  const bookingDelta = bookings - prevBookings;
  const deltaLabel =
    bookingDelta === 0
      ? t.sameAsLastMonth
      : bookingDelta > 0
        ? t.vsLastMonthUp(bookingDelta)
        : t.vsLastMonthDown(bookingDelta);

  const sparkValues = monthMetrics.bookingTrend.map((p) => p.bookings);
  const monthLabel = formatMonthLabel(now);
  const rangeLabel = formatMonthRangeShort(monthRange.start, monthRange.end);

  if (loading && calls.length === 0 && jobs.length === 0) {
    return (
      <section className="booking-hero" aria-label={t.ariaLabel}>
        <HeroSkeleton copy={t} />
      </section>
    );
  }

  return (
    <section className="booking-hero" aria-label={t.ariaLabel}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {monthLabel}
          </p>
          <h2 className="mt-2 text-sm font-medium text-slate-600">{t.serviceRequestsThisMonth}</h2>
          <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p
              className={`booking-hero-number text-slate-900 ${loading ? "animate-pulse opacity-70" : ""}`}
              aria-live="polite"
              aria-busy={loading}
            >
              {bookings}
            </p>
            {!loading ? (
              <span
                className={`mb-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  bookingDelta > 0
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                    : bookingDelta < 0
                      ? "bg-rose-50 text-rose-800 ring-1 ring-rose-100"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {deltaLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {rangeLabel}
            {" · "}
            {loading && calls.length === 0
              ? t.updating
              : t.callsLine(monthCalls, monthMetrics.kpis.conversionRate)}
          </p>
        </div>

        {!loading && sparkValues.some((v) => v > 0) ? (
          <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-1">
            <MiniSparkline values={sparkValues} />
            <span className="text-[11px] font-medium text-slate-400">{t.dailyRequests}</span>
          </div>
        ) : null}
      </div>

      {!loading || jobs.length > 0 || calls.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="booking-hero-stat">
            <p className="text-xs font-medium text-slate-500">{t.inboundCalls}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{monthCalls}</p>
          </div>
          <div className="booking-hero-stat">
            <p className="text-xs font-medium text-slate-500">{t.conversion}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">
              {monthCalls > 0 ? `${monthMetrics.kpis.conversionRate}%` : "—"}
            </p>
          </div>
          <div className="booking-hero-stat">
            <p className="text-xs font-medium text-slate-500">{t.emergenciesP1}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">
              {monthMetrics.kpis.emergencyCalls}
            </p>
          </div>
        </div>
      ) : null}

      {!loading && bookings === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-600">
          {jobberConnected ? t.emptyConnected : t.emptyNotConnected}
        </p>
      ) : null}
    </section>
  );
}
