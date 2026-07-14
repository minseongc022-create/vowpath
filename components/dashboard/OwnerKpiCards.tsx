"use client";

import type { MissedCallsDailyPoint } from "@/lib/missed-calls-analytics";
import { dashboardUi } from "@/lib/content";
import { isEnglishUi } from "@/lib/locale";
import type { KpiDrilldownId } from "@/lib/kpi-drilldown";
import { displayOwnerKpiValue } from "@/lib/owner-dashboard-kpi";
import {
  sumTrendSeriesTotals,
  TREND_CHART_SERIES,
  type TrendChartSeriesId,
} from "@/lib/trend-chart-series";

type OwnerKpiCardsProps = {
  daily: MissedCallsDailyPoint[];
  periodLabel: string;
  waitingCustomersNow?: number;
  loading?: boolean;
  dark?: boolean;
  compact?: boolean;
  onCardClick?: (id: KpiDrilldownId) => void;
  visibleIds?: string[];
  editMode?: boolean;
  onToggle?: (id: string) => void;
};

function OwnerKpiCard({
  label,
  shortHint,
  value,
  color,
  periodLabel,
  dark,
  onClick,
  editMode,
  included,
  onToggle,
  compact = false,
}: {
  label: string;
  shortHint: string;
  value: string;
  color: string;
  periodLabel: string;
  dark?: boolean;
  onClick?: () => void;
  editMode?: boolean;
  included?: boolean;
  onToggle?: () => void;
  compact?: boolean;
}) {
  const hint = dashboardUi.kpiDrilldown.tapHint;

  const body = compact ? (
    <>
      <p
        className={`truncate text-[10px] font-bold uppercase tracking-wide ${
          dark ? "text-slate-400" : "text-stone-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${
          dark ? "vow-dash-kpi-value !text-xl sm:!text-2xl" : "text-brand-950"
        }`}
      >
        {value}
      </p>
    </>
  ) : (
    <>
      <p
        className={`text-xs font-semibold uppercase tracking-wider vow-dash-kpi-label ${
          dark ? "" : "text-slate-600"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 min-h-[2.5rem] text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${
          dark ? "vow-dash-kpi-value !text-3xl sm:!text-4xl" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className={`mt-1 text-sm ${dark ? "vow-dash-muted" : "text-stone-600"}`}>
        {shortHint}
      </p>
      <p className={`mt-2 text-xs ${dark ? "text-stone-500" : "text-stone-500"}`}>
        {periodLabel}
      </p>
    </>
  );

  const cardClass = compact
    ? dark
      ? "vow-dash-kpi vow-dash-kpi-owner !p-3"
      : "ops-kpi !p-3"
    : dark
      ? "vow-dash-kpi vow-dash-kpi-owner"
      : "ops-kpi";

  if (editMode) {
    const toggleLabel = included
      ? isEnglishUi()
        ? `Remove ${label} from dashboard`
        : `${label} 대시보드에서 제거`
      : isEnglishUi()
        ? `Add ${label} to dashboard`
        : `${label} 대시보드에 추가`;

    return (
      <div
        className={`relative text-left transition ${cardClass} ${included ? "" : "opacity-50"}`}
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={included}
          aria-label={toggleLabel}
          className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
            included
              ? "bg-blue-600 text-white"
              : dark
                ? "bg-white/10 text-slate-300 hover:bg-white/20"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          }`}
        >
          {included ? "✓" : "+"}
        </button>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left transition ${
        dark
          ? `vow-dash-kpi vow-dash-kpi-owner vow-dash-kpi-clickable ${compact ? "!p-3" : ""}`
          : `ops-kpi ops-kpi-clickable ${compact ? "!p-3" : ""}`
      }`}
      style={{ borderTopColor: color, borderTopWidth: 3 }}
      aria-label={`${label} ${value} — ${hint}`}
    >
      {body}
    </button>
  );
}

export function OwnerKpiCards({
  daily,
  periodLabel,
  waitingCustomersNow,
  loading,
  dark = false,
  compact = false,
  onCardClick,
  visibleIds,
  editMode = false,
  onToggle,
}: OwnerKpiCardsProps) {
  const totals = sumTrendSeriesTotals(daily);
  const cardSeries = editMode
    ? TREND_CHART_SERIES
    : TREND_CHART_SERIES.filter((s) => !visibleIds || visibleIds.includes(s.id));

  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"}`}>
      {cardSeries.map((series) => {
        const id = series.id as TrendChartSeriesId;
        const isWaiting = id === "waitingCustomers";
        const value =
          isWaiting && waitingCustomersNow !== undefined
            ? waitingCustomersNow
            : totals[id];
        const cardPeriodLabel = isWaiting ? (isEnglishUi() ? "Now" : "현재") : periodLabel;
        const included = !visibleIds || visibleIds.includes(id);

        return (
          <OwnerKpiCard
            key={series.id}
            label={series.label}
            shortHint={series.shortHint}
            value={displayOwnerKpiValue(id, value, loading)}
            color={series.color}
            periodLabel={cardPeriodLabel}
            dark={dark}
            onClick={onCardClick ? () => onCardClick(id) : undefined}
            editMode={editMode}
            included={included}
            onToggle={onToggle ? () => onToggle(id) : undefined}
            compact={compact}
          />
        );
      })}
    </div>
  );
}
