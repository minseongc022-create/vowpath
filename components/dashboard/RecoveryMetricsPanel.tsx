"use client";

import { useEffect, useState } from "react";
import type { RecoveryMetrics } from "@/lib/recovery-roi";
import { HelpTip } from "@/components/shared/HelpTip";
import type { DashboardDateRange } from "@/components/dashboard/DashboardDateRangePicker";

type RecoveryMetricsPanelProps = {
  dateRange: DashboardDateRange;
  loading?: boolean;
  compact?: boolean;
};

export function RecoveryMetricsPanel({ dateRange, loading, compact = false }: RecoveryMetricsPanelProps) {
  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);
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
      .then((d: { metrics: RecoveryMetrics }) => {
        if (cancelled) return;
        setMetrics(d.metrics);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load call recovery metrics.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange.start, dateRange.end, loading]);

  const m = metrics;
  const showShadow = m?.shadowModeActive;

  if (compact) {
    return (
      <section className="kb-3d-card overflow-hidden">
        <div className="border-b border-brand-100/80 px-3 py-2.5">
          <h2 className="text-sm font-bold text-brand-950">Call recovery</h2>
        </div>
        {showShadow ? (
          <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            Test mode is ON — SMS tagged [TEST]; not live yet
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-px bg-brand-100/60">
          {busy ? (
            <p className="col-span-2 bg-white px-3 py-4 text-xs text-stone-500">Loading…</p>
          ) : error ? (
            <p className="col-span-2 bg-white px-3 py-4 text-xs text-rose-700">{error}</p>
          ) : m ? (
            <>
              <CompactMetric label="AI bookings" value={String(m.bookingsFromAiCalls)} accent="text-emerald-700" />
              <CompactMetric label="After hours" value={String(m.afterHoursBookingsFromAi)} accent="text-orange-700" />
              <CompactMetric label="AI answered" value={String(m.inboundAnsweredByAi)} accent="text-sky-700" />
              <CompactMetric label="Missed raw" value={String(m.inboundMissedRaw)} accent="text-rose-600" />
            </>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="vow-dash-panel">
      <div className="vow-dash-panel-head border-b border-brand-200/60">
        <div>
          <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-950">
            Call recovery
            <HelpTip text="Shows how many would-be-missed calls Effiroad saved. Counted from real bookings and call logs — no revenue estimates. Actual dollar amounts live in your Jobber invoices." />
          </h2>
          <p className="mt-0.5 text-xs text-stone-600">
            Counts from Effiroad bookings and Twilio call logs — no revenue estimates.
          </p>
        </div>
      </div>

      {showShadow ? (
        <div className="border-b border-amber-200/80 bg-amber-50/90 px-5 py-3 text-sm text-amber-950">
          <strong>Test mode is ON.</strong> Calendar slots behave like live; customer SMS are marked [TEST].
          Jobber writes stay off until you turn test mode off in Settings.
        </div>
      ) : null}

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {busy ? (
          <p className="col-span-full text-sm text-stone-500">Loading call recovery metrics…</p>
        ) : error ? (
          <p className="col-span-full text-sm text-rose-700">{error}</p>
        ) : m ? (
          <>
            <MetricCard
              label="Bookings from AI calls"
              value={String(m.bookingsFromAiCalls)}
              hint="Scheduled or completed in Effiroad after AI intake"
              accent="border-t-emerald-500"
            />
            <MetricCard
              label="After-hours bookings"
              value={String(m.afterHoursBookingsFromAi)}
              hint="Same, but call arrived evenings or weekends"
              accent="border-t-orange-500"
            />
            <MetricCard
              label="AI-handled calls"
              value={String(m.inboundAnsweredByAi)}
              hint={`${m.inboundTotal} inbound touches logged`}
              accent="border-t-sky-500"
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

      {m && !busy && !error ? (
        <p className="border-t border-brand-200/50 px-5 py-3 text-xs text-stone-500">
          Booking rate this period: {m.bookingRatePct}% of AI-handled calls (
          {m.bookingsFromAiCalls}/{m.inboundAnsweredByAi || 0}). Dollar totals belong in Jobber
          invoices — Effiroad does not sync invoice amounts yet.
        </p>
      ) : null}
    </section>
  );
}

function CompactMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
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
