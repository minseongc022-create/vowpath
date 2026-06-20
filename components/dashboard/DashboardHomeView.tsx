"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { dashboardGreeting } from "@/lib/dashboard-home-metrics";
import { useDashboardUi, useVowDashboard } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";
import { normalizeShopState } from "@/lib/shop-storage";
import { useShopState } from "@/lib/hooks/use-shop-state";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { parseDateInput } from "@/lib/dashboard-analytics";
import { buildDashboardHomeMetrics } from "@/lib/dashboard-home-metrics";
import { buildMissedCallsAnalytics } from "@/lib/missed-calls-analytics";
import { missedCallsTrendSubtitle } from "@/lib/missed-calls-chart-series";
import { countWaitingCustomers } from "@/lib/booking-status-counts";
import { buildRecentBookingsList } from "@/lib/recent-bookings";
import {
  isApprovedBooking,
  type RequestStatus,
} from "@/lib/booking-policy";
import { lookupStoredRequestStatus } from "@/lib/request-status-resolve";
import { OwnerKpiCards } from "@/components/dashboard/OwnerKpiCards";
import { KpiDrilldownPanel } from "@/components/dashboard/KpiDrilldownPanel";
import {
  buildKpiDrilldownItems,
  type KpiDrilldownId,
} from "@/lib/kpi-drilldown";
import {
  DashboardPeriodToolbar,
  type PeriodPresetOption,
} from "@/components/dashboard/DashboardPeriodToolbar";
import {
  formatDashboardPeriodLabel,
  matchAnalyticsPreset,
} from "@/lib/dashboard-period";
import type { MissedCallsAnalyticsPreset } from "@/lib/missed-calls-analytics";
import { DashboardRecentRequests } from "@/components/dashboard/DashboardRecentRequests";
import { MissedCallsPreventedChart } from "@/components/dashboard/MissedCallsPreventedChart";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { DashboardCallInsights } from "@/components/dashboard/DashboardCallInsights";
import { DashboardUpcomingBookings } from "@/components/dashboard/DashboardUpcomingBookings";
import {
  defaultDashboardDateRange,
  type DashboardDateRange,
} from "@/components/dashboard/DashboardDateRangePicker";
import { DashboardNewRequestButton } from "@/components/dashboard/DashboardNewRequestButton";
import { PendingReviewQueue } from "@/components/dashboard/PendingReviewQueue";
import { RecoveryMetricsPanel } from "@/components/dashboard/RecoveryMetricsPanel";

export function DashboardHomeView() {
  const v = useVowDashboard();
  const dashboardUi = useDashboardUi();
  const periodPresets = dashboardUi.missedCallsAnalytics.periodPresets as PeriodPresetOption[];

  const { shop: rawShop } = useShopState();
  const shop = useMemo(() => normalizeShopState(rawShop), [rawShop]);
  const [dateRange, setDateRange] = useState<DashboardDateRange>(defaultDashboardDateRange);
  const [activePreset, setActivePreset] = useState<MissedCallsAnalyticsPreset | "custom">(
    () => matchAnalyticsPreset(defaultDashboardDateRange()) ?? "30d",
  );
  const [displayName, setDisplayName] = useState("");
  const [activeKpi, setActiveKpi] = useState<KpiDrilldownId | null>(null);

  const {
    calls,
    jobs,
    jobberBookings,
    heroCalls,
    heroJobs,
    heroJobberBookings,
    tenantEvents,
    jobberConnected,
    jobberAccountName,
    jobberError,
    jobberSyncedAt,
    error,
    loading,
    hasLoaded,
    refresh,
    requestStatuses,
    statusError,
    customerVerifications,
  } = useDashboardData(dateRange);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { shopName?: string; email?: string } | null) => {
        if (d?.shopName) setDisplayName(d.shopName);
        else if (d?.email) setDisplayName(d.email.split("@")[0] ?? "");
      })
      .catch(() => undefined);
  }, []);

  const metrics = useMemo(
    () =>
      buildDashboardHomeMetrics(
        heroCalls,
        heroJobs,
        heroJobberBookings,
        shop,
        requestStatuses,
        jobberConnected,
      ),
    [heroCalls, heroJobs, heroJobberBookings, shop, requestStatuses, jobberConnected],
  );

  const trendChart = useMemo(() => {
    const start = parseDateInput(dateRange.start);
    const end = parseDateInput(dateRange.end);
    if (!start || !end) {
      return { data: metrics.dailyPrevented, subtitle: v.trend.last30 };
    }
    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);
    const analytics = buildMissedCallsAnalytics(heroCalls, shop, start, endDay, {
      jobs: heroJobs,
      jobberBookings: heroJobberBookings,
      requestStatuses,
    });
    const dayCount = analytics.dailyPrevented.length;
    const mode = dayCount > 30 ? "bar" : "line";
    return {
      data: analytics.dailyPrevented,
      subtitle: missedCallsTrendSubtitle(dayCount, mode),
    };
  }, [
    dateRange,
    heroCalls,
    heroJobs,
    heroJobberBookings,
    requestStatuses,
    shop,
    metrics.dailyPrevented,
  ]);

  const recent = useMemo(
    () => buildRecentBookingsList(jobs, jobberBookings, calls, 8, requestStatuses),
    [jobs, jobberBookings, calls, requestStatuses],
  );

  const upcoming = useMemo(
    () =>
      recent.filter((b) => {
        const s = lookupStoredRequestStatus(b.id, requestStatuses, b.jobberJobId) ?? b.status;
        return isApprovedBooking(s as RequestStatus) || s === "scheduled";
      }),
    [recent, requestStatuses],
  );

  const notificationProps = {
    jobs,
    jobberBookings,
    calls,
    jobberConnected,
    jobberError,
    jobberSyncedAt,
    jobberAccountName,
    requestStatuses,
    tenantEvents,
    loading,
    error: error ?? statusError,
  };

  const periodLabel = formatDashboardPeriodLabel(dateRange.start, dateRange.end);

  const waitingCustomersNow = useMemo(
    () => countWaitingCustomers(requestStatuses, jobs, jobberBookings, calls),
    [requestStatuses, jobs, jobberBookings, calls],
  );

  const drilldownItems = useMemo(() => {
    if (!activeKpi) return [];
    return buildKpiDrilldownItems(activeKpi, {
      calls: heroCalls,
      jobs: heroJobs,
      jobberBookings: heroJobberBookings,
      requestStatuses,
      shop,
      dateRange,
      customerVerifications,
    });
  }, [
    activeKpi,
    heroCalls,
    heroJobs,
    heroJobberBookings,
    requestStatuses,
    shop,
    dateRange,
    customerVerifications,
  ]);

  const handleRangeChange = (next: DashboardDateRange) => {
    setDateRange(next);
    setActivePreset(matchAnalyticsPreset(next) ?? "custom");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">
            {dashboardGreeting()}
            {displayName ? `, ${displayName}` : ""}!{" "}
            <span className="inline-block" aria-hidden>
              👋
            </span>
          </h1>
          <p className="mt-1 text-base text-stone-600">{v.header.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DashboardPeriodToolbar
            value={dateRange}
            onChange={handleRangeChange}
            activePreset={activePreset}
            onPresetChange={setActivePreset}
            presets={periodPresets}
            className="!flex-row !items-center"
          />
          <NotificationCenter {...notificationProps} variant="dropdown" />
          <DashboardNewRequestButton onCreated={() => void refresh()} />
        </div>
      </header>

      {jobberError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Jobber sync issue.{" "}
          <Link href={ROUTES.settings} className="font-semibold underline">
            Go live
          </Link>{" "}
          to reconnect.
        </div>
      ) : null}

      <PendingReviewQueue
        jobs={jobs}
        calls={calls}
        jobberBookings={jobberBookings}
        requestStatuses={requestStatuses}
        onStatusChange={() => void refresh()}
      />

      <RecoveryMetricsPanel
        dateRange={dateRange}
        loading={!hasLoaded && loading}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="xl:col-span-5">
          <OwnerKpiCards
            daily={trendChart.data}
            periodLabel={dashboardUi.missedCallsAnalytics.periodSum}
            waitingCustomersNow={waitingCustomersNow}
            loading={!hasLoaded && loading}
            onCardClick={setActiveKpi}
          />
        </div>
      </div>

      <KpiDrilldownPanel
        open={activeKpi !== null}
        kpiId={activeKpi}
        items={drilldownItems}
        periodLabel={periodLabel}
        onClose={() => setActiveKpi(null)}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="vow-dash-panel vow-dash-chart-card lg:col-span-2">
          <div className="space-y-3 border-b border-brand-200/60 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-brand-950">{v.trend.title}</h2>
                <p className="text-sm text-stone-600">
                  {periodLabel} · {trendChart.subtitle}
                </p>
              </div>
              <Link
                href={ROUTES.missedCallsAnalytics}
                className="vow-dash-link shrink-0 whitespace-nowrap pt-0.5"
              >
                {v.trend.viewDetail} →
              </Link>
            </div>
            <DashboardPeriodToolbar
              value={dateRange}
              onChange={handleRangeChange}
              activePreset={activePreset}
              onPresetChange={setActivePreset}
              presets={periodPresets}
              className="!gap-2"
            />
          </div>
          <div className="vow-dash-chart-wrap-home vow-dash-chart-body">
            <div className={!hasLoaded && loading ? "animate-pulse opacity-70" : ""}>
              <MissedCallsPreventedChart
                data={trendChart.data}
                theme="light"
                size="home"
              />
            </div>
          </div>
        </section>
        <DashboardCallInsights rows={metrics.insights} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardRecentRequests
            bookings={recent}
            calls={calls}
            requestStatuses={requestStatuses}
            loading={!hasLoaded && loading}
          />
        </div>
        <DashboardUpcomingBookings
          bookings={upcoming.slice(0, 5)}
          requestStatuses={requestStatuses}
        />
      </div>

      <p className="text-center text-sm text-stone-600">
        New jobs text your cell — reply 1 or 2. Finish setup in{" "}
        <Link href={ROUTES.settings} className="font-semibold text-brand-800 hover:underline">
          Go live
        </Link>
        .
      </p>
    </div>
  );
}
