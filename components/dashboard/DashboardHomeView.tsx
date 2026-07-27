"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { dashboardGreeting } from "@/lib/dashboard-home-metrics";
import { useDashboardUi, useVowDashboard } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";
import { normalizeShopState } from "@/lib/shop-storage";
import { useShopState } from "@/lib/hooks/use-shop-state";
import { saveDashboardVisibleMetrics } from "@/lib/schedule-save";
import { TREND_CHART_SERIES } from "@/lib/trend-chart-series";
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
import { AppPage } from "@/components/ui/AppPage";
import { CollectedRevenuePanel } from "@/components/dashboard/CollectedRevenuePanel";
import { RecoveryMetricsPanel } from "@/components/dashboard/RecoveryMetricsPanel";
import { QuoteChasePromo } from "@/components/dashboard/QuoteChasePromo";
import { GuidedTour } from "@/components/shared/GuidedTour";
import { DASHBOARD_TOUR_STEPS } from "@/lib/guided-tour-steps";

export function DashboardHomeView() {
  const v = useVowDashboard();
  const dashboardUi = useDashboardUi();
  const periodPresets = dashboardUi.missedCallsAnalytics.periodPresets as PeriodPresetOption[];

  const { shop: rawShop, setShop } = useShopState();
  const shop = useMemo(() => normalizeShopState(rawShop), [rawShop]);
  const [dateRange, setDateRange] = useState<DashboardDateRange>(defaultDashboardDateRange);
  const [activePreset, setActivePreset] = useState<MissedCallsAnalyticsPreset | "custom">(
    () => matchAnalyticsPreset(defaultDashboardDateRange()) ?? "30d",
  );
  const [displayName, setDisplayName] = useState("");
  const [activeKpi, setActiveKpi] = useState<KpiDrilldownId | null>(null);
  const [kpiEditMode, setKpiEditMode] = useState(false);
  const [visibleMetricIds, setVisibleMetricIds] = useState<string[]>(
    () => shop.dashboardVisibleMetrics ?? TREND_CHART_SERIES.map((s) => s.id),
  );

  useEffect(() => {
    setVisibleMetricIds(shop.dashboardVisibleMetrics ?? TREND_CHART_SERIES.map((s) => s.id));
  }, [shop.dashboardVisibleMetrics]);

  const persistVisibleMetrics = async (ids: string[]) => {
    setVisibleMetricIds(ids);
    const saved = await saveDashboardVisibleMetrics(shop, ids);
    setShop(saved);
  };

  const handleToggleMetric = (id: string) => {
    const next = visibleMetricIds.includes(id)
      ? visibleMetricIds.filter((v) => v !== id)
      : [...visibleMetricIds, id];
    if (next.length === 0) return;
    void persistVisibleMetrics(next);
  };

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
    <AppPage width="wide" className="space-y-3 sm:space-y-4">
      <header className="space-y-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-brand-950 sm:text-2xl">
            {dashboardGreeting()}
            {displayName ? `, ${displayName}` : ""}!{" "}
            <span className="inline-block" aria-hidden>
              👋
            </span>
          </h1>
          <p className="mt-0.5 text-xs text-stone-600 sm:text-sm">{v.header.subtitle}</p>
        </div>

        <div className="kb-3d-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
          <DashboardPeriodToolbar
            value={dateRange}
            onChange={handleRangeChange}
            activePreset={activePreset}
            onPresetChange={setActivePreset}
            presets={periodPresets}
            className="w-full min-w-0 flex-1"
          />
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-brand-100 pt-3 sm:border-t-0 sm:pt-0">
            <NotificationCenter {...notificationProps} variant="dropdown" />
            <DashboardNewRequestButton onCreated={() => void refresh()} />
          </div>
        </div>
      </header>

      <QuoteChasePromo />

      {jobberError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Jobber sync issue.{" "}
          <Link href={ROUTES.settings} className="font-semibold underline">
            Go live
          </Link>{" "}
          to reconnect.
        </div>
      ) : null}

      <section data-tour-step="kpi-cards">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-brand-950">At a glance</h2>
            <p className="text-[11px] text-stone-500">{periodLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setKpiEditMode((v) => !v)}
            className="kb-3d-btn shrink-0 !rounded-full !px-3 !py-1.5 !text-xs"
          >
            {kpiEditMode ? "Done" : "Edit"}
          </button>
        </div>
        <OwnerKpiCards
          daily={trendChart.data}
          periodLabel={dashboardUi.missedCallsAnalytics.periodSum}
          waitingCustomersNow={waitingCustomersNow}
          loading={!hasLoaded && loading}
          onCardClick={kpiEditMode ? undefined : setActiveKpi}
          visibleIds={visibleMetricIds}
          editMode={kpiEditMode}
          onToggle={handleToggleMetric}
          compact
        />
      </section>

      <div data-tour-step="pending-review">
        <PendingReviewQueue
          jobs={jobs}
          calls={calls}
          jobberBookings={jobberBookings}
          requestStatuses={requestStatuses}
          onStatusChange={() => void refresh()}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div data-tour-step="revenue">
          <CollectedRevenuePanel dateRange={dateRange} loading={!hasLoaded && loading} compact />
        </div>
        <div data-tour-step="recovery-metrics">
          <RecoveryMetricsPanel dateRange={dateRange} loading={!hasLoaded && loading} compact />
        </div>
      </div>

      <div data-tour-step="call-insights">
        <DashboardCallInsights rows={metrics.insights} compact />
      </div>

      <section className="kb-3d-card overflow-hidden" data-tour-step="trend-chart">
        <div className="flex items-start justify-between gap-3 border-b border-brand-100/80 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-brand-950">{v.trend.title}</h2>
            <p className="text-[11px] text-stone-500">
              {periodLabel} · {trendChart.subtitle}
            </p>
          </div>
          <Link
            href={ROUTES.missedCallsAnalytics}
            className="shrink-0 text-xs font-semibold text-brand-800 hover:underline"
          >
            {v.trend.viewDetail} →
          </Link>
        </div>
        <div className="vow-dash-chart-wrap-home vow-dash-chart-body px-2 pb-3 pt-1 sm:px-3">
          <div className={!hasLoaded && loading ? "animate-pulse opacity-70" : ""}>
            <MissedCallsPreventedChart
              data={trendChart.data}
              theme="light"
              size="home"
              controlledVisible={visibleMetricIds}
              onVisibleChange={(ids) => void persistVisibleMetrics(ids)}
            />
          </div>
        </div>
      </section>

      <KpiDrilldownPanel
        open={activeKpi !== null}
        kpiId={activeKpi}
        items={drilldownItems}
        periodLabel={periodLabel}
        onClose={() => setActiveKpi(null)}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2" data-tour-step="recent-requests">
          <DashboardRecentRequests
            bookings={recent}
            calls={calls}
            requestStatuses={requestStatuses}
            loading={!hasLoaded && loading}
          />
        </div>
        <div data-tour-step="upcoming-bookings">
          <DashboardUpcomingBookings
            bookings={upcoming.slice(0, 5)}
            requestStatuses={requestStatuses}
          />
        </div>
      </div>

      <p className="hidden text-center text-sm text-stone-600 sm:block">
        New jobs text your phone — finish setup in{" "}
        <Link href={ROUTES.settings} className="font-semibold text-brand-800 hover:underline">
          Go live
        </Link>
        .
      </p>

      <GuidedTour steps={DASHBOARD_TOUR_STEPS} storageKey="effiroad_tour_v2" />
    </AppPage>
  );
}
