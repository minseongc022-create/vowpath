"use client";

import {
  computeCustomerVerificationRate,
  formatVerificationRateDisplay,
} from "@/lib/customer-verification/metrics";
import type { CustomerVerificationRecord } from "@/lib/customer-verification/types";
import { dashboardUi } from "@/lib/content";

type CustomerVerificationRateKpiProps = {
  records: CustomerVerificationRecord[];
  loading?: boolean;
  dark?: boolean;
  onClick?: () => void;
};

export function CustomerVerificationRateKpi({
  records,
  loading,
  dark = true,
  onClick,
}: CustomerVerificationRateKpiProps) {
  const copy = dashboardUi.customerVerificationKpi;
  const { ratePct, total } = computeCustomerVerificationRate(records);
  const display = loading ? "—" : formatVerificationRateDisplay(ratePct, total);
  const hint = dashboardUi.kpiDrilldown.tapHint;

  const inner = (
    <>
      <p
        className={`text-xs font-semibold uppercase tracking-wider ${
          dark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {copy.label}
      </p>
      <p
        className={`mt-2 min-h-[2.5rem] text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        {display}
      </p>
      <p className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {copy.shortHint}
      </p>
      <p className={`mt-2 text-[11px] ${dark ? "text-slate-500" : "text-slate-400"}`}>
        {copy.periodLabel}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`text-left transition ${
          dark ? "vow-dash-kpi vow-dash-kpi-owner vow-dash-kpi-clickable" : "ops-kpi ops-kpi-clickable"
        }`}
        style={{ borderTopColor: "#22d3ee", borderTopWidth: 3 }}
        aria-label={`${copy.label} ${display} — ${hint}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={dark ? "vow-dash-kpi vow-dash-kpi-owner" : "ops-kpi"}
      style={{ borderTopColor: "#22d3ee", borderTopWidth: 3 }}
    >
      {inner}
    </div>
  );
}
