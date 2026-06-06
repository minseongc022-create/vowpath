"use client";

import type { DashboardKpi } from "@/lib/dashboard-home-metrics";

export function DashboardKpiCard({
  label,
  kpi,
  footnote,
  icon,
}: {
  label: string;
  kpi: DashboardKpi;
  footnote: string;
  accent?: "brand" | "rose" | "emerald" | "cyan";
  icon: React.ReactNode;
}) {
  const deltaPositive = kpi.deltaPct > 0;
  const deltaNeutral = kpi.deltaPct === 0;

  return (
    <div className="vow-dash-kpi">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400">
          {icon}
        </span>
      </div>
      <p className="vow-dash-kpi-value mt-3">{kpi.display}</p>
      <p className="mt-2 text-xs text-slate-500">
        <span
          className={
            deltaNeutral
              ? "text-slate-500"
              : deltaPositive
                ? "text-slate-300"
                : "text-slate-400"
          }
        >
          {deltaNeutral ? "—" : `${deltaPositive ? "↑" : "↓"} ${Math.abs(kpi.deltaPct)}%`}
        </span>{" "}
        {footnote}
      </p>
    </div>
  );
}
