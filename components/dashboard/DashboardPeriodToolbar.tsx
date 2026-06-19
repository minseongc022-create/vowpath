"use client";

import {
  DashboardDateRangePicker,
  type DashboardDateRange,
} from "@/components/dashboard/DashboardDateRangePicker";
import type { MissedCallsAnalyticsPreset } from "@/lib/missed-calls-analytics";
import { analyticsPresetToDateRange } from "@/lib/dashboard-period";

export type PeriodPresetOption = {
  id: MissedCallsAnalyticsPreset;
  label: string;
};

type DashboardPeriodToolbarProps = {
  value: DashboardDateRange;
  onChange: (range: DashboardDateRange) => void;
  activePreset: MissedCallsAnalyticsPreset | "custom";
  onPresetChange: (preset: MissedCallsAnalyticsPreset) => void;
  presets: PeriodPresetOption[];
  dark?: boolean;
  className?: string;
};

export function DashboardPeriodToolbar({
  value,
  onChange,
  activePreset,
  onPresetChange,
  presets,
  dark = false,
  className = "",
}: DashboardPeriodToolbarProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onPresetChange(p.id);
              onChange(analyticsPresetToDateRange(p.id));
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activePreset === p.id
                ? dark
                  ? "bg-white/10 text-slate-100 ring-1 ring-white/15"
                  : "bg-brand-500 text-white shadow-md"
                : dark
                  ? "bg-white/[0.06] text-slate-400 ring-1 ring-white/10 hover:bg-white/[0.1]"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <DashboardDateRangePicker
        value={value}
        onChange={(range) => onChange(range)}
      />
    </div>
  );
}
