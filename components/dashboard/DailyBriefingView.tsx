"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { buildDailyBriefing } from "@/lib/dashboard-briefing";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="vow-dash-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-400">{hint}</p> : null}
    </article>
  );
}

export function DailyBriefingView() {
  const [shopName, setShopName] = useState("My shop");
  const {
    heroCalls,
    heroJobs,
    heroJobberBookings,
    requestStatuses,
    loading,
    error,
  } = useDashboardData();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { shopName?: string; email?: string } | null) => {
        if (d?.shopName?.trim()) setShopName(d.shopName.trim());
        else if (d?.email) setShopName(d.email.split("@")[0] ?? "My shop");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const briefing = useMemo(
    () =>
      buildDailyBriefing({
        calls: heroCalls,
        jobs: heroJobs,
        jobberBookings: heroJobberBookings,
        requestStatuses,
      }),
    [heroCalls, heroJobs, heroJobberBookings, requestStatuses],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="rounded-3xl border border-white/[0.06] bg-[#3d3228] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-7">
        <p className="text-sm font-medium text-brand-300">{briefing.titleDate}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Good Morning, {shopName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          A 30-second briefing of actual calls, requests, approvals, and urgent items.
          No revenue estimates.
        </p>
      </section>

      {error ? (
        <div className="vow-dash-card border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="vow-dash-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              AI Summary
            </p>
            <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
              {briefing.summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          {loading ? (
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-slate-400">
              Refreshing…
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {briefing.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="vow-dash-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Urgent Requests</h2>
            <Link href="/dashboard/bookings" className="text-sm font-medium text-brand-300">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {briefing.urgentBookings.length > 0 ? (
              briefing.urgentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${encodeURIComponent(booking.id)}`}
                  className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <p className="font-semibold text-white">{booking.customerName}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {booking.issueType} · {booking.arrivalWindow ?? "No requested time"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-slate-400">
                No urgent requests found.
              </p>
            )}
          </div>
        </article>

        <article className="vow-dash-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Pending Requests</h2>
            <Link href="/dashboard/bookings" className="text-sm font-medium text-brand-300">
              Review
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {briefing.pendingBookings.length > 0 ? (
              briefing.pendingBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${encodeURIComponent(booking.id)}`}
                  className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <p className="font-semibold text-white">{booking.customerName}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {booking.issueType} · {booking.arrivalWindow ?? "No requested time"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-slate-400">
                No pending requests.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
