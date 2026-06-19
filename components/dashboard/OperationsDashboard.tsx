"use client";

import { useEffect, useMemo, useState } from "react";
import type { RequestStatus } from "@/lib/booking-policy";
import type { JobCard } from "@/lib/types";
import {
  buildOperationsMetrics,
  resolveDateRange,
  toDateInputValue,
  type CallRecord,
  type DatePreset,
  type JobberBookingRecord,
  type NamedCount,
} from "@/lib/operations-analytics";
import { BookingTrendChart } from "@/components/dashboard/BookingTrendChart";
import { MissedCallsPreventedKpi } from "@/components/dashboard/MissedCallsPreventedKpi";
import { dashboardUi } from "@/lib/content";
import type { ShopState } from "@/lib/types";

type OperationsDashboardProps = {
  calls: CallRecord[];
  jobs: JobCard[];
  jobberBookings?: JobberBookingRecord[];
  jobberConnected?: boolean;
  jobberAccountName?: string | null;
  jobberError?: string | null;
  requestStatuses?: Record<string, RequestStatus>;
  loading?: boolean;
  /** When false, KPI row is hidden (hero shows month bookings above). */
  showKpiRow?: boolean;
  shop?: Pick<ShopState, "scheduleWindows" | "answerScheduleActive">;
  onDateRangeChange?: (start: string, end: string) => void;
};

function buildPresets(): { id: DatePreset; label: string }[] {
  const ops = dashboardUi.ops;
  return [
  { id: "today", label: ops.today },
  { id: "7d", label: ops.last7 },
  { id: "30d", label: ops.last30 },
  { id: "6m", label: ops.last6m },
  { id: "1y", label: ops.last1y },
  { id: "custom", label: ops.customRange },
  ];
}

function DeltaBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-slate-400">— vs prior</span>;
  const positive = value > 0;
  return (
    <span
      className={`text-xs font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}
    >
      {positive ? "+" : ""}
      {value}
      {suffix} vs prior
    </span>
  );
}

function OpsCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`ops-card ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: string;
  delta: number;
  accent: "blue" | "red" | "violet" | "cyan";
}) {
  const accents = {
    blue: "from-brand-500/20 to-brand-500/5 text-brand-600",
    red: "from-rose-500/20 to-rose-500/5 text-rose-600",
    violet: "from-brand-500/20 to-brand-500/5 text-brand-600",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-600",
  };

  return (
    <div className="ops-kpi">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accents[accent]} ring-1 ring-slate-200/80`}
      >
        <span className="h-2 w-2 rounded-full bg-current" />
      </div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <div className="mt-2">
        <DeltaBadge value={delta} />
      </div>
    </div>
  );
}

function BarChart({ data, color = "#0a84c7" }: { data: NamedCount[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-end gap-1 sm:gap-1.5">
      {data.map((d) => (
        <div key={d.key ?? d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-600">{d.value || ""}</span>
          <div
            className="w-full max-w-[2.5rem] rounded-t-md transition-all"
            style={{
              height: `${Math.max(4, (d.value / max) * 100)}%`,
              background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
              boxShadow: d.value > 0 ? `0 4px 12px ${color}33` : undefined,
            }}
          />
          <span className="truncate text-center text-[9px] font-medium text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ data, colors }: { data: NamedCount[]; colors: string[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.key ?? d.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-slate-700">{d.label}</span>
            <span className="font-semibold text-slate-900">{d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: colors[i % colors.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return dashboardUi.ops.justNow;
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function OperationsDashboard({
  calls,
  jobs,
  jobberBookings = [],
  jobberConnected = false,
  jobberAccountName,
  jobberError,
  requestStatuses = {},
  loading,
  showKpiRow = true,
  shop,
  onDateRangeChange,
}: OperationsDashboardProps) {
  const ops = dashboardUi.ops;
  const presets = buildPresets();
  const initial = resolveDateRange("30d")!;
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [startDate, setStartDate] = useState(toDateInputValue(initial.start));
  const [endDate, setEndDate] = useState(toDateInputValue(initial.end));

  const range = useMemo(
    () => resolveDateRange(preset, startDate, endDate),
    [preset, startDate, endDate],
  );

  const metrics = useMemo(() => {
    if (!range) {
      return buildOperationsMetrics([], [], new Date(), new Date(), [], jobberConnected);
    }
    return buildOperationsMetrics(
      calls,
      jobs,
      range.start,
      range.end,
      jobberBookings,
      jobberConnected,
      requestStatuses,
    );
  }, [calls, jobs, jobberBookings, jobberConnected, requestStatuses, range]);

  useEffect(() => {
    if (!range || !onDateRangeChange) return;
    onDateRangeChange(toDateInputValue(range.start), toDateInputValue(range.end));
  }, [range, onDateRangeChange]);

  function selectPreset(id: DatePreset) {
    setPreset(id);
    if (id !== "custom") {
      const r = resolveDateRange(id);
      if (r) {
        setStartDate(toDateInputValue(r.start));
        setEndDate(toDateInputValue(r.end));
      }
    }
  }

  return (
    <div className="ops-dashboard space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Analytics
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Trends & insights
          </h2>
          <div className="mt-1 min-h-[1.125rem]">
            {loading && calls.length === 0 && jobs.length === 0 ? (
              <p className="text-xs text-slate-500">Loading live data…</p>
            ) : jobberConnected ? (
              <p className="text-xs font-medium text-emerald-700">
                Synced with Jobber{jobberAccountName ? ` · ${jobberAccountName}` : ""}
              </p>
            ) : null}
          </div>
          {jobberError ? (
            <p className="mt-1 text-xs text-amber-700">Jobber sync issue: {jobberError}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectPreset(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                preset === p.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === "custom" ? (
        <div className="ops-card flex flex-wrap items-center gap-3 !py-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            From
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ops-date-input"
            />
          </label>
          <span className="text-slate-300">→</span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            To
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="ops-date-input"
            />
          </label>
          {range === null ? (
            <span className="text-xs font-medium text-rose-600">Invalid date range</span>
          ) : null}
        </div>
      ) : null}

      {showKpiRow ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MissedCallsPreventedKpi
            calls={calls}
            shop={
              shop ?? { scheduleWindows: [], answerScheduleActive: false }
            }
            loading={loading}
          />
          <KpiCard
            label={ops.totalBookings}
            value={String(metrics.kpis.totalBookings)}
            delta={metrics.kpis.bookingsDelta}
            accent="blue"
          />
          <KpiCard
            label={ops.emergencyCalls}
            value={String(metrics.kpis.emergencyCalls)}
            delta={metrics.kpis.emergencyDelta}
            accent="red"
          />
          <KpiCard
            label={ops.conversionRate}
            value={`${metrics.kpis.conversionRate}%`}
            delta={metrics.kpis.conversionDelta}
            accent="violet"
          />
          <KpiCard
            label={ops.afterHours}
            value={String(metrics.kpis.afterHoursHandled)}
            delta={metrics.kpis.afterHoursDelta}
            accent="cyan"
          />
        </div>
      ) : null}

      <OpsCard
        title={ops.bookingTrend}
        subtitle={jobberConnected ? ops.trendSubtitleJobber : ops.trendSubtitle}
      >
        <div className="min-h-[280px]">
          {metrics.bookingTrend.length === 0 ? (
            <p className="flex min-h-[280px] items-center justify-center text-center text-sm text-slate-500">
              {ops.noBookingsInRange}
            </p>
          ) : (
            <BookingTrendChart data={metrics.bookingTrend} />
          )}
        </div>
      </OpsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <OpsCard title={ops.hourly} subtitle={ops.hourlySub}>
          <BarChart data={metrics.hourlyDistribution} color="#6366f1" />
        </OpsCard>
        <OpsCard title={ops.dayOfWeek} subtitle={ops.dayOfWeekSub}>
          <BarChart data={metrics.dayOfWeek} color="#0a84c7" />
        </OpsCard>
        <OpsCard title={ops.emergencyBreakdown} subtitle={ops.emergencySub}>
          <HorizontalBars
            data={metrics.emergencyBreakdown}
            colors={["#ef4444", "#f59e0b", "#64748b", "#cbd5e1"]}
          />
        </OpsCard>
        <OpsCard title={ops.zipAnalysis} subtitle={ops.zipSub}>
          {metrics.zipAnalysis.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Add addresses with ZIP codes on calls or job cards.
            </p>
          ) : (
            <HorizontalBars
              data={metrics.zipAnalysis}
              colors={["#0a84c7", "#38bdf8", "#7dd3fc", "#bae6fd"]}
            />
          )}
        </OpsCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OpsCard title={ops.activityFeed} subtitle={ops.activitySub}>
          <ul className="divide-y divide-slate-100">
            {metrics.recentActivity.length === 0 ? (
              <li className="py-8 text-center text-sm text-slate-500">No activity yet.</li>
            ) : (
              metrics.recentActivity.map((item) => (
                <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      item.kind === "emergency"
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                        : item.kind === "booking"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                    }`}
                  >
                    {item.kind === "booking" ? "B" : item.kind === "emergency" ? "!" : "C"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="truncate text-xs text-slate-500">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {formatRelative(item.createdAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </OpsCard>

        <OpsCard title={ops.insights} subtitle={ops.insightsSub}>
          <ul className="space-y-3">
            {metrics.insights.map((insight) => (
              <li
                key={insight.id}
                className={`rounded-xl border p-4 ${
                  insight.tone === "positive"
                    ? "border-emerald-200/80 bg-emerald-50/50"
                    : insight.tone === "alert"
                      ? "border-rose-200/80 bg-rose-50/50"
                      : "border-slate-200/80 bg-slate-50/80"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{insight.body}</p>
              </li>
            ))}
          </ul>
        </OpsCard>
      </div>
    </div>
  );
}
