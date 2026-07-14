"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RevenueMetrics } from "@/lib/revenue-metrics";
import type { DashboardDateRange } from "@/components/dashboard/DashboardDateRangePicker";
import { ROUTES } from "@/lib/constants";

type CollectedRevenuePanelProps = {
  dateRange: DashboardDateRange;
  loading?: boolean;
  compact?: boolean;
};

export function CollectedRevenuePanel({ dateRange, loading, compact = false }: CollectedRevenuePanelProps) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    const qs = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
    fetch(`/api/shop/revenue-metrics?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
      .then(
        (d: {
          connected: boolean;
          metrics: RevenueMetrics | null;
          warning?: string;
          sync?: { syncedAt?: string; stale?: boolean };
        }) => {
          if (cancelled) return;
          setConnected(d.connected);
          setMetrics(d.metrics);
          setStale(Boolean(d.sync?.stale || d.warning));
          setSyncedAt(d.sync?.syncedAt ?? d.metrics?.syncedAt ?? null);
        },
      )
      .catch(() => {
        if (!cancelled) setError("Could not load collected revenue from Jobber.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange.start, dateRange.end, loading]);

  if (connected === false && !compact) {
    return (
      <section className="vow-dash-panel">
        <div className="vow-dash-panel-head border-b border-brand-200/60 px-5 py-4">
          <h2 className="text-base font-semibold text-brand-950">Collected revenue</h2>
          <p className="mt-1 text-sm text-stone-600">
            Connect Jobber to show real paid amounts from invoices — not estimates.
          </p>
          <Link href={ROUTES.settings} className="vow-dash-link mt-2 inline-block text-sm">
            Connect Jobber in Settings →
          </Link>
        </div>
      </section>
    );
  }

  if (connected === false && compact) {
    return (
      <section className="kb-3d-card overflow-hidden">
        <div className="border-b border-brand-100/80 px-3 py-2.5">
          <h2 className="text-sm font-bold text-brand-950">Revenue</h2>
        </div>
        <div className="px-3 py-4">
          <p className="text-xs leading-relaxed text-stone-600">
            Connect Jobber to show collected invoice totals.
          </p>
          <Link href={ROUTES.settings} className="vow-dash-link mt-2 inline-block text-xs font-semibold">
            Connect in Settings →
          </Link>
        </div>
      </section>
    );
  }

  const m = metrics;

  if (compact) {
    return (
      <section className="kb-3d-card overflow-hidden">
        <div className="border-b border-brand-100/80 px-3 py-2.5">
          <h2 className="text-sm font-bold text-brand-950">Revenue</h2>
        </div>
        <div className="grid grid-cols-2 gap-px bg-brand-100/60">
          {busy ? (
            <p className="col-span-2 bg-white px-3 py-4 text-xs text-stone-500">Loading…</p>
          ) : error ? (
            <p className="col-span-2 bg-white px-3 py-4 text-xs text-rose-700">{error}</p>
          ) : m ? (
            <>
              <CompactMetric label="Collected" value={m.collectedLabel} accent="text-emerald-700" />
              <CompactMetric label="Effiroad" value={m.attributedCollectedLabel} accent="text-brand-800" />
              <CompactMetric label="Invoiced" value={m.invoicedLabel} accent="text-sky-700" />
              <CompactMetric label="Outstanding" value={m.outstandingLabel} accent="text-amber-700" />
            </>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="vow-dash-panel">
      <div className="vow-dash-panel-head border-b border-brand-200/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-brand-950">Collected revenue</h2>
            <p className="mt-0.5 text-xs text-stone-600">
              Paid amounts from Jobber invoices (issued in this period).
            </p>
          </div>
          {syncedAt ? (
            <p className="text-xs text-stone-500">
              Jobber sync {formatSyncAge(syncedAt)}
              {stale ? " · cached" : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {busy ? (
          <p className="col-span-full text-sm text-stone-500">Loading Jobber revenue…</p>
        ) : error ? (
          <p className="col-span-full text-sm text-rose-700">{error}</p>
        ) : m ? (
          <>
            <MetricCard
              label="Collected (paid)"
              value={m.collectedLabel}
              hint={`${m.invoiceCount} invoice${m.invoiceCount === 1 ? "" : "s"} issued`}
              accent="border-t-emerald-600"
            />
            <MetricCard
              label="Effiroad-attributed"
              value={m.attributedCollectedLabel}
              hint={`${m.attributedInvoiceCount} invoice${m.attributedInvoiceCount === 1 ? "" : "s"} linked to Effiroad intake`}
              accent="border-t-brand-500"
            />
            <MetricCard
              label="Invoiced total"
              value={m.invoicedLabel}
              hint="Invoice amounts issued this period"
              accent="border-t-sky-500"
            />
            <MetricCard
              label="Outstanding"
              value={m.outstandingLabel}
              hint="Still owed on those invoices"
              accent="border-t-amber-500"
            />
          </>
        ) : null}
      </div>

      {m && !busy && !error ? (
        <p className="border-t border-brand-200/50 px-5 py-3 text-xs text-stone-500">
          Collected uses Jobber <span className="font-medium">payments total</span> per invoice.
          Effiroad-attributed links invoices to AI calls or bookings via Jobber request / job IDs.
          Dollar totals are not multiplied by average ticket size.
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
      <p className={`mt-1 truncate text-lg font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function formatSyncAge(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-US");
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
