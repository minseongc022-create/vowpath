"use client";

import Link from "next/link";
import { AppPage } from "@/components/ui/AppPage";
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
    <article className="vow-dash-kpi">
      <p className="vow-dash-kpi-label">{label}</p>
      <p className="vow-dash-kpi-value mt-2 !text-4xl">{value}</p>
      {hint ? <p className="mt-2 text-base text-stone-600">{hint}</p> : null}
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
    <AppPage className="flex flex-col gap-6">
      <section className="vow-dash-hero p-5 sm:p-7">
        <p className="text-sm font-semibold text-brand-800">{briefing.titleDate}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
          Good Morning, {shopName}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
          A 30-second briefing of actual calls, requests, approvals, and urgent items.
          No revenue estimates.
        </p>
      </section>

      {error ? (
        <div className="vow-dash-card border-rose-200 bg-rose-50 p-4 text-base text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="vow-dash-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-800">
              AI Summary
            </p>
            <div className="mt-4 space-y-2 text-base leading-relaxed text-stone-700">
              {briefing.summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          {loading ? (
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800">
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
            <h2 className="text-lg font-semibold text-brand-950">Urgent Requests</h2>
            <Link href="/dashboard/bookings" className="vow-dash-link">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {briefing.urgentBookings.length > 0 ? (
              briefing.urgentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${encodeURIComponent(booking.id)}`}
                  className="block rounded-2xl border border-brand-200/70 bg-stone-50/80 p-4 transition hover:border-brand-300 hover:bg-brand-50/50"
                >
                  <p className="font-semibold text-brand-950">{booking.customerName}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {booking.issueType} · {booking.arrivalWindow ?? "No requested time"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-brand-200/70 bg-stone-50/80 p-4 text-base text-stone-600">
                No urgent requests found.
              </p>
            )}
          </div>
        </article>

        <article className="vow-dash-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-brand-950">Pending Requests</h2>
            <Link href="/dashboard/bookings" className="vow-dash-link">
              Review
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {briefing.pendingBookings.length > 0 ? (
              briefing.pendingBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${encodeURIComponent(booking.id)}`}
                  className="block rounded-2xl border border-brand-200/70 bg-stone-50/80 p-4 transition hover:border-brand-300 hover:bg-brand-50/50"
                >
                  <p className="font-semibold text-brand-950">{booking.customerName}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {booking.issueType} · {booking.arrivalWindow ?? "No requested time"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-brand-200/70 bg-stone-50/80 p-4 text-base text-stone-600">
                No pending requests.
              </p>
            )}
          </div>
        </article>
      </section>
    </AppPage>
  );
}
