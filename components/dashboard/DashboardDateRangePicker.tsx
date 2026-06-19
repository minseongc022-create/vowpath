"use client";

import { useEffect, useRef, useState } from "react";
import { getVowDashboardCopy } from "@/lib/content";
import { useVowDashboard } from "@/components/providers/LocaleProvider";
import { runtimeUiLocale } from "@/lib/locale";
import { toDateInputValue } from "@/lib/operations-analytics";

export type DashboardDateRange = {
  start: string;
  end: string;
};

type Preset = "7d" | "30d" | "month";

function presetRange(preset: Preset): DashboardDateRange {
  const end = new Date();
  const start = new Date();
  if (preset === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(end.getDate() - 29);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

function formatLabel(start: string, end: string): string {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return getVowDashboardCopy(runtimeUiLocale()).header.dateRange(fmt(s), fmt(e));
}

function isValidRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return start <= end;
}

type DashboardDateRangePickerProps = {
  value: DashboardDateRange;
  onChange: (range: DashboardDateRange) => void;
};

export function DashboardDateRangePicker({ value, onChange }: DashboardDateRangePickerProps) {
  const h = useVowDashboard().header;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setError(null);
    }
  }, [open, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const applyCustom = () => {
    if (!isValidRange(draft.start, draft.end)) {
      setError(h.dateInvalid);
      return;
    }
    onChange({ start: draft.start, end: draft.end });
    setOpen(false);
    setError(null);
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#2a221c] px-2.5 py-2 text-sm text-slate-200 [color-scheme:dark] focus:border-brand-500/40 focus:outline-none focus:ring-1 focus:ring-brand-500/30";

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#3d3228] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
        <span className="truncate">{formatLabel(value.start, value.end)}</span>
        <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div
          className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,17.5rem)] rounded-xl border border-white/[0.08] bg-[#3d3228] p-3 shadow-xl"
          role="dialog"
          aria-label={h.dateCustom}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {h.dateQuick}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {(
              [
                ["7d", "Last 7 days"],
                ["30d", "Last 30 days"],
                ["month", "This month"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-300 transition hover:bg-white/[0.06]"
                onClick={() => {
                  const next = presetRange(key);
                  onChange(next);
                  setOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="my-3 border-t border-white/[0.06]" />

          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {h.dateCustom}
          </p>
          <div className="mt-2 space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">{h.dateFrom}</span>
              <input
                type="date"
                className={inputClass}
                value={draft.start}
                max={draft.end || undefined}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, start: e.target.value }));
                  setError(null);
                }}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">{h.dateTo}</span>
              <input
                type="date"
                className={inputClass}
                value={draft.end}
                min={draft.start || undefined}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, end: e.target.value }));
                  setError(null);
                }}
              />
            </label>
          </div>
          {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
          <button
            type="button"
            onClick={applyCustom}
            className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            {h.dateApply}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function defaultDashboardDateRange(): DashboardDateRange {
  return presetRange("30d");
}
