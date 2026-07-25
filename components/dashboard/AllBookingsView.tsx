"use client";

import Link from "next/link";
import { AppPage } from "@/components/ui/AppPage";
import { RecentBookingsList } from "@/components/dashboard/RecentBookings";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { useVowDashboard } from "@/components/providers/LocaleProvider";

export function AllBookingsContent({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { jobs, jobberBookings, calls, requestStatuses, loading, error, hasLoaded } =
    useDashboardData(null);
  const showLoading = loading && !hasLoaded && jobs.length === 0;
  const copy = useVowDashboard().bookingsList;

  return (
    <AppPage width="wide">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline"
      >
        {copy.back}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-brand-950">{copy.title}</h1>
      <p className="mt-1 text-sm text-stone-600">{copy.subtitle}</p>
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
