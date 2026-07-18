"use client";

import Link from "next/link";
import { AppPage } from "@/components/ui/AppPage";
import { RecentBookingsList } from "@/components/dashboard/RecentBookings";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";

export function AllBookingsContent({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { jobs, jobberBookings, calls, requestStatuses, loading, error, hasLoaded } =
    useDashboardData(null);
  const showLoading = loading && !hasLoaded && jobs.length === 0;

  return (
    <AppPage width="wide">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-brand-950">Requests & bookings</h1>
      <p className="mt-1 text-sm text-stone-600">
        View all inbound requests and approval status.
      </p>
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
    </AppPage>
  );
}
