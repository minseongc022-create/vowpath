import { getBookingRequestStatuses } from "./booking-status";
import { buildBookingDetail } from "./booking-detail";
import { listCallLogs } from "./call-logs";
import { fetchJobberRequestsInRange } from "./jobber-api";
import { getJobberTokens } from "./jobber-tokens";
import { listJobs } from "./jobs-db";
import {
  bookingFromJob,
  buildAllRecentBookings,
  findRecentBooking,
  type RecentBooking,
} from "./recent-bookings";
import type { CallRecord } from "./operations-analytics";
import type { JobberBookingRecord } from "./jobber-bookings";
import type { JobCard } from "./types";
import type { RequestStatus } from "./booking-policy";

export type ResolvedBookingContext = {
  booking: RecentBooking;
  jobs: JobCard[];
  calls: CallRecord[];
  jobberBookings: JobberBookingRecord[];
  requestStatuses: Record<string, RequestStatus>;
};

export async function resolveBookingForTenant(
  userId: string,
  bookingId: string,
): Promise<ResolvedBookingContext | null> {
  const decoded = decodeURIComponent(bookingId.trim());
  if (!decoded) return null;

  const [jobs, calls, requestStatuses] = await Promise.all([
    listJobs(userId),
    listCallLogs(userId),
    getBookingRequestStatuses(userId),
  ]);

  const callId = decoded.startsWith("call-") ? decoded.slice("call-".length) : null;
  const linkedJob = callId
    ? jobs.find((j) => j.sourceCallId === callId)
    : jobs.find((j) => j.id === decoded);
  const needsJobber =
    decoded.startsWith("jobber-") || Boolean(linkedJob?.jobberJobId);

  let jobberBookings: JobberBookingRecord[] = [];
  if (needsJobber) {
    const tokens = await getJobberTokens(userId);
    if (tokens) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      try {
        jobberBookings = await fetchJobberRequestsInRange(userId, start, end);
      } catch {
        jobberBookings = [];
      }
    }
  }

  const all = buildAllRecentBookings(
    jobs,
    jobberBookings,
    calls as CallRecord[],
    requestStatuses,
  );

  let booking = findRecentBooking(all, decoded, {
    jobs,
    calls: calls as CallRecord[],
    statuses: requestStatuses,
  });

  if (!booking && decoded.startsWith("call-")) {
    const callId = decoded.slice("call-".length);
    const job = jobs.find((j) => j.sourceCallId === callId);
    if (job) {
      booking = bookingFromJob(job, requestStatuses);
    }
  }

  if (!booking) return null;

  return {
    booking,
    jobs,
    calls: calls as CallRecord[],
    jobberBookings,
    requestStatuses,
  };
}

export async function resolveBookingDetailForTenant(
  userId: string,
  bookingId: string,
) {
  const ctx = await resolveBookingForTenant(userId, bookingId);
  if (!ctx) return null;
  return buildBookingDetail(
    ctx.booking,
    ctx.calls,
    ctx.jobberBookings,
    ctx.requestStatuses,
  );
}
