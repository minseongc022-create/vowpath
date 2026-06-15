"use client";

import Link from "next/link";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import { lookupStoredRequestStatus } from "@/lib/request-status-resolve";
import {
  buildRecentBookingsList,
  formatBookingListHeadline,
  formatBookingListSubtitle,
  formatBookingReceivedLabel,
  type RecentBooking,
} from "@/lib/recent-bookings";
import { useRelativeNow } from "@/lib/hooks/use-relative-now";
import type { CallRecord } from "@/lib/operations-analytics";
import type { JobberBookingRecord } from "@/lib/jobber-bookings";
import type { RequestStatus } from "@/lib/booking-policy";
import { dashboardUi } from "@/lib/content";
import type { JobCard } from "@/lib/types";

type RecentBookingsProps = {
  jobs: JobCard[];
  jobberBookings: JobberBookingRecord[];
  calls: CallRecord[];
  requestStatuses?: Record<string, RequestStatus>;
  loading?: boolean;
  error?: string | null;
  limit?: number;
  showViewAll?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  variant?: "light" | "dark";
};

function BookingCard({
  booking,
  dark,
  requestStatuses = {},
  nowMs,
}: {
  booking: RecentBooking;
  dark?: boolean;
  requestStatuses?: Record<string, RequestStatus>;
  nowMs: number;
}) {
  const requestStatus =
    lookupStoredRequestStatus(booking.id, requestStatuses, booking.jobberJobId) ??
    booking.status;
  const receivedLabel = formatBookingReceivedLabel(booking.createdAt, nowMs);
  return (
    <Link
      href={`/dashboard/bookings/${encodeURIComponent(booking.id)}`}
      className={
        dark
          ? "group flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 transition hover:border-brand-500/30 hover:bg-white/[0.04]"
          : "recent-booking-card group"
      }
    >
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`min-w-0 truncate text-base font-semibold group-hover:text-brand-400 ${
                dark ? "text-white" : "text-slate-900 group-hover:text-brand-700"
              }`}
            >
              {formatBookingListHeadline(booking, nowMs)}
            </p>
            <PriorityBadge priority={booking.priority} theme={dark ? "dark" : "light"} />
            <BookingStatusBadge status={requestStatus} />
          </div>
          <p className={`mt-0.5 truncate text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
            {formatBookingListSubtitle(booking)}
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className={`text-xs tabular-nums ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {receivedLabel}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
        <p
          className={`text-xs tabular-nums sm:hidden ${dark ? "text-slate-400" : "text-slate-500"}`}
        >
          {receivedLabel}
        </p>
        <span
          className="text-slate-300 transition group-hover:text-brand-500"
          aria-hidden
        >
          →
        </span>
      </div>
    </Link>
  );
}

function LoadingRows({ count = 5, dark }: { count?: number; dark?: boolean }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className={
            dark
              ? "animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 pointer-events-none"
              : "recent-booking-card animate-pulse pointer-events-none"
          }
          aria-hidden
        >
          <div className={`h-5 w-40 rounded ${dark ? "bg-white/10" : "bg-slate-200"}`} />
          <div className={`mt-2 h-4 w-28 rounded ${dark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
        </li>
      ))}
    </ul>
  );
}

export function RecentBookings({
  jobs,
  jobberBookings,
  calls,
  requestStatuses = {},
  loading,
  error,
  limit = 10,
  showViewAll = true,
  className = "",
  title,
  subtitle,
  variant = "light",
}: RecentBookingsProps) {
  const rb = dashboardUi.recentBookings;
  const resolvedTitle = title ?? rb.title;
  const resolvedSubtitle = subtitle ?? rb.subtitle;
  const dark = variant === "dark";
  const nowMs = useRelativeNow();
  const bookings = buildRecentBookingsList(
    jobs,
    jobberBookings,
    calls,
    limit,
    requestStatuses,
  );
  const showFatalError = Boolean(error) && bookings.length === 0 && !loading;

  return (
    <section
      className={
        dark
          ? `vow-dash-card ${className}`
          : `recent-bookings-panel ${className}`
      }
      aria-labelledby="recent-bookings-heading"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-widest ${
              dark ? "text-brand-400" : "text-brand-600"
            }`}
          >
            {rb.liveFeed}
          </p>
          <h2
            id="recent-bookings-heading"
            className={`mt-1 text-xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
          >
            {resolvedTitle}
          </h2>
          <p className={`mt-0.5 text-sm ${dark ? "text-slate-500" : "text-slate-500"}`}>{resolvedSubtitle}</p>
        </div>
        {showViewAll && !loading && !showFatalError && bookings.length > 0 ? (
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
          >
            {rb.viewAll}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>

      {error && bookings.length > 0 ? (
        <p className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-900">
          {error}
        </p>
      ) : null}

      {showFatalError ? (
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 px-5 py-8 text-center">
          <p className="font-semibold text-rose-900">{rb.couldntLoad}</p>
          <p className="mt-1 text-sm text-rose-700/90">{error}</p>
        </div>
      ) : loading && bookings.length === 0 ? (
        <LoadingRows dark={dark} />
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-12 text-center">
          <p className="font-semibold text-slate-900">{rb.emptyTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">{rb.emptyBody}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <BookingCard
                booking={booking}
                dark={dark}
                requestStatuses={requestStatuses}
                nowMs={nowMs}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentBookingsList({
  jobs,
  jobberBookings,
  calls,
  requestStatuses = {},
  loading,
  error,
  variant = "light",
}: Omit<RecentBookingsProps, "limit" | "showViewAll" | "title" | "subtitle"> & {
  variant?: "light" | "dark";
}) {
  const all = buildRecentBookingsList(
    jobs,
    jobberBookings,
    calls,
    500,
    requestStatuses,
  );
  return (
    <RecentBookings
      jobs={jobs}
      jobberBookings={jobberBookings}
      calls={calls}
      requestStatuses={requestStatuses}
      loading={loading}
      error={error}
      limit={500}
      showViewAll={false}
      title="All bookings"
      subtitle={`${all.length} total · newest first`}
      variant={variant}
    />
  );
}
