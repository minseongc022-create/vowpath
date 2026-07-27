"use client";

import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";

/** Always-visible notification bell in the mobile dashboard header. */
export function DashboardHeaderNotifications() {
  const {
    jobs,
    jobberBookings,
    calls,
    jobberConnected,
    jobberError,
    jobberSyncedAt,
    jobberAccountName,
    requestStatuses,
    tenantEvents,
    loading,
    error,
    statusError,
  } = useDashboardData();

  return (
    <NotificationCenter
      jobs={jobs}
      jobberBookings={jobberBookings}
      calls={calls}
      jobberConnected={jobberConnected}
      jobberError={jobberError}
      jobberSyncedAt={jobberSyncedAt}
      jobberAccountName={jobberAccountName}
      requestStatuses={requestStatuses}
      tenantEvents={tenantEvents}
      loading={loading}
      error={error ?? statusError}
      variant="dropdown"
    />
  );
}
