"use client";

import type { MissedCallsDailyPoint } from "@/lib/missed-calls-analytics";
import {
  sumTrendSeriesTotals,
  TREND_CHART_SERIES,
  type TrendChartSeriesId,
} from "@/lib/trend-chart-series";

type TrendKpiCardsProps = {
  daily: MissedCallsDailyPoint[];
  periodLabel: string;
  loading?: boolean;
  dark?: boolean;
};

function TrendKpiCard({
  label,
  value,
  color,
  periodLabel,
  dark,
}: {
  label: string;
  value: number | string;
  color: string;
  periodLabel: string;
  dark?: boolean;
}) {
  return (
    <div className={dark ? "vow-dash-kpi" : "ops-kpi"}>
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}18` }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      </div>
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          dark ? "text-slate-500" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}>
        {periodLabel}
      </p>
    </div>
  );
}

export function TrendKpiCards({
  daily,
  periodLabel,
  loading,
  dark = true,
}: TrendKpiCardsProps) {
  const totals = sumTrendSeriesTotals(daily);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {TREND_CHART_SERIES.map((series) => (
        <TrendKpiCard
          key={series.id}
          label={series.label}
          value={loading ? "—" : totals[series.id as TrendChartSeriesId]}
          color={series.color}
          periodLabel={periodLabel}
          dark={dark}
        />
      ))}
    </div>
  );
}
