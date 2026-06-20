"use client";

import { useEffect, useState } from "react";
import type { RecoveryMetrics } from "@/lib/recovery-roi";
import type { DashboardDateRange } from "@/components/dashboard/DashboardDateRangePicker";

type RecoveryMetricsPanelProps = {
  dateRange: DashboardDateRange;
  loading?: boolean;
};

export function RecoveryMetricsPanel({ dateRange, loading }: RecoveryMetricsPanelProps) {
  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);
  const [avgTicket, setAvgTicket] = useState(350);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    const qs = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
    fetch(`/api/shop/recovery-metrics?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
      .then((d: { metrics: RecoveryMetrics; settings?: { avgJobTicketUsd: number } }) => {
        if (cancelled) return;
        setMetrics(d.metrics);
        if (d.settings?.avgJobTicketUsd) setAvgTicket(d.settings.avgJobTicketUsd);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load recovery metrics.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange.start, dateRange.end, loading]);

  async function saveAvgTicket(next: number) {
    setAvgTicket(next);
    await fetch("/api/shop/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avgJobTicketUsd: next }),
    });
  }

  const m = metrics;
  const showShadow = m?.shadowModeActive;

  return (
    <section className="vow-dash-panel">
      <div className="vow-dash-panel-head border-b border-brand-200/60">
        <div>
          <h2 className="text-base font-semibold text-brand-950">Recovered revenue</h2>
          <p className="mt-0.5 text-xs text-stone-600">
            Missed-call recovery tracked 24/7 — not only when AI is scheduled on.
          </p>
        </div>
      </div>

      {showShadow ? (
        <div className="border-b border-amber-200/80 bg-amber-50/90 px-5 py-3 text-sm text-amber-950">
          <strong>Baseline period:</strong> {m.shadowModeRemaining} practice booking
          {m.shadowModeRemaining === 1 ? "" : "s"} left — customer SMS and Jobber push stay off
          until you finish shadow mode in Settings.
        </div>
      ) : null}

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {busy ? (
          <p className="col-span-full text-sm text-stone-500">Loading recovery metrics…</p>
        ) : error ? (
          <p className="col-span-full text-sm text-rose-700">{error}</p>
        ) : m ? (
          <>
            <MetricCard
              label="Est. recovered"
              value={`$${m.estimatedRecoveredUsd.toLocaleString()}`}
              hint={`${m.callsRecovered} booked from after-hours / missed-risk calls`}
              accent="border-t-orange-500"
            />
            <MetricCard
              label="AI-handled calls"
              value={String(m.inboundAnsweredByAi)}
              hint={`${m.inboundTotal} inbound touches logged`}
              accent="border-t-sky-500"
            />
            <MetricCard
              label="Recovery rate"
              value={`${m.callsRecoveredRatePct}%`}
              hint="Booked ÷ AI-handled (missed-risk window)"
              accent="border-t-emerald-500"
            />
            <MetricCard
              label="Raw missed (CDR)"
              value={String(m.inboundMissedRaw)}
              hint="Short / no-answer before AI capture"
              accent="border-t-rose-400"
            />
          </>
        ) : null}
      </div>

      <div className="border-t border-brand-200/50 px-5 py-4">
        <label className="flex flex-wrap items-center gap-3 text-sm text-stone-700">
          <span className="font-medium">Avg job ticket (for $ estimate)</span>
          <span className="text-stone-500">$</span>
          <input
            type="number"
            min={50}
            max={5000}
            step={25}
            value={avgTicket}
            onChange={(e) => setAvgTicket(Number(e.target.value) || 350)}
            onBlur={() => void saveAvgTicket(avgTicket)}
            className="w-28 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-brand-950"
          />
        </label>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className={`vow-dash-card border-t-[3px] ${accent} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-brand-950">{value}</p>
      <p className="mt-1 text-xs text-stone-600">{hint}</p>
    </div>
  );
}
