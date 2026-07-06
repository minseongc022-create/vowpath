"use client";

import type { DashboardKpi } from "@/lib/dashboard-home-metrics";
import { HelpTip } from "@/components/shared/HelpTip";

export function DashboardKpiCard({
  label,
  kpi,
  footnote,
  icon,
  help,
}: {
  label: string;
  kpi: DashboardKpi;
  footnote: string;
  accent?: "brand" | "rose" | "emerald" | "cyan";
  icon: React.ReactNode;
  /** Optional always-on explanation shown via a small ⓘ next to the label. */
  help?: string;
}) {
  const deltaPositive = kpi.deltaPct > 0;
  const deltaNeutral = kpi.deltaPct === 0;

  return (
    <div className="vow-dash-kpi">
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600">
          {label}
          {help ? <HelpTip text={help} /> : null}
        </p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-200/80">
          {icon}
        </span>
      </div>
      <p className="vow-dash-kpi-value mt-3">{kpi.display}</p>
      <p className="mt-2 text-sm text-stone-600">
        <span
          className={
            deltaNeutral
              ? "text-stone-500"
              : deltaPositive
                ? "text-emerald-700"
                : "text-rose-700"
          }
        >
          {deltaNeutral ? "—" : `${deltaPositive ? "↑" : "↓"} ${Math.abs(kpi.deltaPct)}%`}
        </span>{" "}
        {footnote}
      </p>
    </div>
  );
}
