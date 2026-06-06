"use client";

import type { CallInsightRow } from "@/lib/dashboard-home-metrics";
import { vowDashboard } from "@/lib/content";

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
  brand: "text-violet-300 bg-violet-500/15",
  emerald: "text-emerald-400 bg-emerald-500/15",
  rose: "text-rose-400 bg-rose-500/15",
};

export function DashboardCallInsights({ rows }: { rows: CallInsightRow[] }) {
  const v = vowDashboard.insights;

  return (
    <section className="vow-dash-panel h-full">
      <div className="vow-dash-panel-head border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white">{v.title}</h2>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-4 px-5 py-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[row.tone]}`}
            >
              {ICONS[row.key]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200">{row.label}</p>
              <p className="text-xs text-slate-500">{row.sublabel}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-white">{row.value}</p>
              <p
                className={`text-xs font-medium ${
                  row.deltaPct > 0
                    ? "text-emerald-400"
                    : row.deltaPct < 0
                      ? "text-rose-400"
                      : "text-slate-500"
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
