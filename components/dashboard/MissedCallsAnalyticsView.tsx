"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppPage } from "@/components/ui/AppPage";
import { countWaitingCustomers } from "@/lib/booking-status-counts";
import { useDashboardUi } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dashboard-analytics";
import {
  analyticsPresetToDateRange,
  formatDashboardPeriodLabel,
  matchAnalyticsPreset,
} from "@/lib/dashboard-period";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { useShopState } from "@/lib/hooks/use-shop-state";
import {
  buildMissedCallsAnalytics,
  resolveMissedCallsAnalyticsRange,
  type MissedCallsAnalyticsPreset,
} from "@/lib/missed-calls-analytics";
import { MissedCallsPreventedChart } from "@/components/dashboard/MissedCallsPreventedChart";
import { missedCallsTrendSubtitle } from "@/lib/missed-calls-chart-series";
import {
  DashboardPeriodToolbar,
  type PeriodPresetOption,
} from "@/components/dashboard/DashboardPeriodToolbar";
import {
  defaultDashboardDateRange,
  type DashboardDateRange,
} from "@/components/dashboard/DashboardDateRangePicker";
import { OwnerKpiCards } from "@/components/dashboard/OwnerKpiCards";

function resolveRangeFromDateInputs(dateRange: DashboardDateRange) {
  const start = parseDateInput(dateRange.start);
  const end = parseDateInput(dateRange.end);
  if (!start || !end) return resolveMissedCallsAnalyticsRange("30d");
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);
  return { start, end: endDay };
}

export function MissedCallsAnalyticsView({ variant = "light" }: { variant?: "light" | "dark" }) {
  const dashboardUi = useDashboardUi();
  const m = dashboardUi.missedCallsAnalytics;
  const dark = variant === "dark";
  const card = dark ? "vow-dash-card" : "ops-card";
  const { shop } = useShopState();
  const [dateRange, setDateRange] = useState<DashboardDateRange>(defaultDashboardDateRange);
  const [activePreset, setActivePreset] = useState<MissedCallsAnalyticsPreset | "custom">(
    () => matchAnalyticsPreset(defaultDashboardDateRange()) ?? "30d",
  );

  const range = useMemo(() => resolveRangeFromDateInputs(dateRange), [dateRange]);
  const periodLabel = formatDashboardPeriodLabel(dateRange.start, dateRange.end);
  const periodPresets = m.periodPresets as PeriodPresetOption[];

  const fetchRange = useMemo(
    () => ({
      start: dateRange.start,
      end: dateRange.end,
    }),
    [dateRange],
  );

  const {
    calls,
    jobs,
    jobberBookings,
    requestStatuses,
    loading,
    hasLoaded,
    refreshing,
    error,
    refresh,
  } = useDashboardData(fetchRange);

  const analytics = useMemo(() => {
    try {
      return buildMissedCallsAnalytics(calls, shop, range.start, range.end, {
        jobs,
        jobberBookings,
        requestStatuses,
      });
    } catch {
      return {
        totalCalls: 0,
        aiAnsweredCalls: 0,
        missedCallsPrevented: 0,
        afterHoursCalls: 0,
        weekendCalls: 0,
        estimatedMissedWithoutEffiroad: 0,
        dailyPrevented: [],
      };
    }
  }, [calls, jobs, jobberBookings, requestStatuses, shop, range.start, range.end]);

  const waitingCustomersNow = useMemo(
    () => countWaitingCustomers(requestStatuses, jobs, jobberBookings, calls),
    [requestStatuses, jobs, jobberBookings, calls],
  );

  const chartSubtitle = useMemo(() => {
    const dayCount = analytics.dailyPrevented.length;
    const mode = dayCount > 30 ? "bar" : "line";
    return missedCallsTrendSubtitle(dayCount, mode);
  }, [analytics.dailyPrevented.length]);

  const handleRangeChange = (next: DashboardDateRange) => {
    setDateRange(next);
    setActivePreset(matchAnalyticsPreset(next) ?? "custom");
  };

  return (
    <AppPage className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={ROUTES.dashboard}
            className={`text-sm font-medium hover:underline ${dark ? "text-slate-400" : "text-brand-600"}`}
          >
            {m.backToDashboard}
          </Link>
          <p
            className={`mt-3 text-xs font-semibold uppercase tracking-widest ${
              dark ? "text-slate-500" : "text-brand-600"
            }`}
          >
            {m.eyebrow}
          </p>
          <h1
            className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${
              dark ? "text-white" : "text-slate-900"
            }`}
          >
            {m.title}
          </h1>
          <p className={`mt-2 max-w-2xl text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
            {m.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className={
            dark
              ? "vow-dash-btn-primary self-start disabled:opacity-50"
              : "self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          }
        >
          {refreshing ? m.refreshing : m.refresh}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <DashboardPeriodToolbar
        value={dateRange}
        onChange={handleRangeChange}
        activePreset={activePreset}
        onPresetChange={(id) => setActivePreset(id)}
        presets={periodPresets}
        dark={dark}
      />

      <OwnerKpiCards
        daily={analytics.dailyPrevented}
        periodLabel={m.periodSum}
        waitingCustomersNow={waitingCustomersNow}
        loading={!hasLoaded && loading}
        dark={dark}
      />

      <section className={`${card} vow-dash-chart-card w-full`}>
        <div
          className={`mb-5 space-y-3 border-b pb-4 ${dark ? "border-white/[0.06]" : "border-slate-100"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                {m.chartTitle}
              </h2>
              <p className={`mt-0.5 text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}>
                {periodLabel} · {chartSubtitle}
              </p>
              <p className={`mt-1 text-[11px] ${dark ? "text-slate-600" : "text-slate-400"}`}>
                {m.chartSubtitle}
              </p>
            </div>
          </div>
          <DashboardPeriodToolbar
            value={dateRange}
            onChange={handleRangeChange}
            activePreset={activePreset}
            onPresetChange={(id) => setActivePreset(id)}
            presets={periodPresets}
            dark={dark}
            className="!gap-2"
          />
        </div>
        {!hasLoaded && loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <p className="text-sm text-slate-500">{m.loadingChart}</p>
          </div>
        ) : (
          <div className="vow-dash-chart-body vow-dash-chart-body-wide min-h-[300px]">
            <MissedCallsPreventedChart
              data={analytics.dailyPrevented}
              theme={dark ? "dark" : "light"}
              size="full"
              fluid
            />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
          {m.howCalculated}
        </h2>
        <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-slate-400" : "text-slate-600"}`}>
          {m.howCalculatedBody}
        </p>
      </section>
    </AppPage>
  );
}
