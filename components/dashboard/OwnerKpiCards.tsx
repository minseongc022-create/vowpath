"use client";

import type { MissedCallsDailyPoint } from "@/lib/missed-calls-analytics";
import { dashboardUi } from "@/lib/content";
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
  onCardClick?: (id: KpiDrilldownId) => void;
};

function OwnerKpiCard({
  label,
  shortHint,
  value,
  color,
  periodLabel,
  dark,
  onClick,
}: {
  label: string;
  shortHint: string;
  value: string;
  color: string;
  periodLabel: string;
  dark?: boolean;
  onClick?: () => void;
}) {
  const hint = dashboardUi.kpiDrilldown.tapHint;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left transition ${
        dark ? "vow-dash-kpi vow-dash-kpi-owner vow-dash-kpi-clickable" : "ops-kpi ops-kpi-clickable"
      }`}
      style={{ borderTopColor: color, borderTopWidth: 3 }}
      aria-label={`${label} ${value} — ${hint}`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wider ${
          dark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 min-h-[2.5rem] text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {shortHint}
      </p>
      <p className={`mt-2 text-[11px] ${dark ? "text-slate-500" : "text-slate-400"}`}>
        {periodLabel}
      </p>
    </button>
  );
}

export function OwnerKpiCards({
  daily,
  periodLabel,
  waitingCustomersNow,
  loading,
  dark = true,
  onCardClick,
}: OwnerKpiCardsProps) {
  const totals = sumTrendSeriesTotals(daily);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {TREND_CHART_SERIES.map((series) => {
        const id = series.id as TrendChartSeriesId;
        const isWaiting = id === "waitingCustomers";
        const value =
          isWaiting && waitingCustomersNow !== undefined
            ? waitingCustomersNow
            : totals[id];
        const cardPeriodLabel = isWaiting ? "현재" : periodLabel;

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
          />
        );
      })}
    </div>
  );
}
