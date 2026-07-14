"use client";

import type { CallInsightRow } from "@/lib/dashboard-home-metrics";
import { useVowDashboard } from "@/components/providers/LocaleProvider";

const ICONS: Record<string, React.ReactNode> = {
  afterHours: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  ),
  weekend: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
        clipRule="evenodd"
      />
    </svg>
  ),
  emergency: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const TONE_ICON: Record<CallInsightRow["tone"], string> = {
  brand: "text-brand-700 bg-brand-100",
  emerald: "text-emerald-700 bg-emerald-100",
  rose: "text-rose-700 bg-rose-100",
};

export function DashboardCallInsights({
  rows,
  compact = false,
}: {
  rows: CallInsightRow[];
  compact?: boolean;
}) {
  const v = useVowDashboard().insights;

  if (compact) {
    return (
      <section className="kb-3d-card overflow-hidden">
        <div className="border-b border-brand-100/80 px-3 py-2.5">
          <h2 className="text-sm font-bold text-brand-950">{v.title}</h2>
        </div>
        <div className="grid grid-cols-3 divide-x divide-brand-100/80">
          {rows.map((row) => (
            <div key={row.key} className="px-2 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{row.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-brand-950">{row.value}</p>
              <p
                className={`mt-0.5 text-[10px] font-semibold ${
                  row.deltaPct > 0 ? "text-emerald-700" : row.deltaPct < 0 ? "text-rose-700" : "text-stone-400"
                }`}
              >
                {v.delta(row.deltaPct)}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="vow-dash-panel h-full">
      <div className="vow-dash-panel-head border-b border-brand-200/60">
        <h2 className="text-base font-semibold text-brand-950">{v.title}</h2>
      </div>
      <ul className="divide-y divide-brand-100">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-4 px-5 py-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[row.tone]}`}
            >
              {ICONS[row.key]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-950">{row.label}</p>
              <p className="text-sm text-stone-600">{row.sublabel}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-brand-950">{row.value}</p>
              <p
                className={`text-sm font-medium ${
                  row.deltaPct > 0
                    ? "text-emerald-700"
                    : row.deltaPct < 0
                      ? "text-rose-700"
                      : "text-stone-500"
                }`}
              >
                {v.delta(row.deltaPct)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
