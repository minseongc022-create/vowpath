import {
  isPendingShopReview,
  isWaitingCustomer,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import type { JobberBookingRecord } from "./jobber-bookings";
import type { CallRecord } from "./operations-analytics";
import { buildAllRecentBookings } from "./recent-bookings";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import type { JobCard } from "./types";

function resolveBookingStatus(
  bookingId: string,
  jobberJobId: string | undefined,
  fallback: string,
  statuses: Record<string, RequestStatus | string>,
): RequestStatus {
  const stored = lookupStoredRequestStatus(
    bookingId,
    statuses as Record<string, RequestStatus>,
    jobberJobId,
  );
  return stored ?? normalizeRequestStatus(fallback);
}

/** Count unique bookings (not KV alias keys) matching a status predicate. */
export function countBookingsByStatus(
  requestStatuses: Record<string, RequestStatus | string>,
  predicate: (status: string) => boolean,
  jobs: JobCard[] = [],
  jobberBookings: JobberBookingRecord[] = [],
  calls: CallRecord[] = [],
): number {
  if (jobs.length > 0 || calls.length > 0 || jobberBookings.length > 0) {
    const bookings = buildAllRecentBookings(
      jobs,
      jobberBookings,
      calls,
      requestStatuses as Record<string, RequestStatus>,
    );
    return bookings.filter((b) =>
      predicate(resolveBookingStatus(b.id, b.jobberJobId, b.status, requestStatuses)),
    ).length;
  }

  const keys = Object.keys(requestStatuses);
  const jobberPrefixed = new Set(keys.filter((k) => k.startsWith("jobber-")));
  let count = 0;
  for (const [key, raw] of Object.entries(requestStatuses)) {
    if (!predicate(String(raw))) continue;
    if (key.startsWith("call-") || key.startsWith("jobber-")) {
      count++;
      continue;
    }
    if (jobberPrefixed.has(`jobber-${key}`)) continue;
    count++;
  }
  return count;
}

export function countWaitingCustomers(
  requestStatuses: Record<string, RequestStatus | string>,
  jobs: JobCard[] = [],
  jobberBookings: JobberBookingRecord[] = [],
  calls: CallRecord[] = [],
): number {
  return countBookingsByStatus(requestStatuses, isWaitingCustomer, jobs, jobberBookings, calls);
}

export function countPendingShopReviewBookings(
  requestStatuses: Record<string, RequestStatus | string>,
  jobs: JobCard[] = [],
  jobberBookings: JobberBookingRecord[] = [],
  calls: CallRecord[] = [],
): number {
  return countBookingsByStatus(
    requestStatuses,
    isPendingShopReview,
    jobs,
    jobberBookings,
    calls,
  );
}
