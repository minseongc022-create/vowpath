"use client";

import Link from "next/link";
import { RecentBookingsList } from "@/components/dashboard/RecentBookings";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";

export function AllBookingsContent({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { jobs, jobberBookings, calls, requestStatuses, loading, error, hasLoaded } =
    useDashboardData(null);
  const showLoading = loading && !hasLoaded && jobs.length === 0;
  const dark = variant === "dark";

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/dashboard"
        className={`text-sm font-medium hover:underline ${dark ? "text-brand-300" : "text-brand-600"}`}
      >
        ← Back to dashboard
      </Link>
      {dark ? (
        <>
          <h1 className="mt-4 text-2xl font-bold text-white">Requests & bookings</h1>
          <p className="mt-1 text-sm text-slate-400">View all inbound requests and approval status.</p>
        </>
      ) : null}
      <div className="mt-6">
        <RecentBookingsList
          jobs={jobs}
          jobberBookings={jobberBookings}
          calls={calls}
          requestStatuses={requestStatuses}
          loading={showLoading}
          error={error}
          variant={variant}
        />
      </div>
    </div>
  );
}
