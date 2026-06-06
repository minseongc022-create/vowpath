import { normalizeRequestStatus, type RequestStatus } from "./booking-policy";
import type { CallRecord } from "./operations-analytics";
import type { RecentBooking } from "./recent-bookings";
import type { JobCard } from "./types";

/** Lookup persisted status by booking list id or linked Jobber id. */
export function lookupStoredRequestStatus(
  bookingId: string,
  statuses: Record<string, RequestStatus>,
  jobberJobId?: string,
): RequestStatus | undefined {
  if (statuses[bookingId]) return normalizeRequestStatus(statuses[bookingId]);
  if (jobberJobId && statuses[jobberJobId]) {
    return normalizeRequestStatus(statuses[jobberJobId]);
  }
  if (jobberJobId && statuses[`jobber-${jobberJobId}`]) {
    return normalizeRequestStatus(statuses[`jobber-${jobberJobId}`]);
  }
  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    if (statuses[`call-${callId}`]) {
      return normalizeRequestStatus(statuses[`call-${callId}`]);
    }
  }
  return undefined;
}

export function withResolvedBookingStatus(
  booking: RecentBooking,
  statuses: Record<string, RequestStatus>,
): RecentBooking {
  const stored = lookupStoredRequestStatus(
    booking.id,
    statuses,
    booking.jobberJobId,
  );
  if (!stored) return booking;
  return { ...booking, status: stored };
}

/** All KV keys that should receive the same status for one logical booking. */
export function bookingStatusAliasIds(
  bookingId: string,
  jobs: JobCard[],
  calls: CallRecord[],
): string[] {
  const ids = new Set<string>([bookingId]);

  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    const call = calls.find((c) => c.id === callId);
    if (call?.jobberRequestId) {
      ids.add(`jobber-${call.jobberRequestId}`);
      ids.add(call.jobberRequestId);
    }
    const job = jobs.find((j) => j.sourceCallId === callId);
    if (job) ids.add(job.id);
  } else if (bookingId.startsWith("jobber-")) {
    const requestId = bookingId.slice("jobber-".length);
    ids.add(requestId);
    const job = jobs.find((j) => j.jobberJobId === requestId);
    if (job) ids.add(job.id);
    const call = calls.find((c) => c.jobberRequestId === requestId);
    if (call) ids.add(`call-${call.id}`);
  } else {
    const job = jobs.find((j) => j.id === bookingId);
    if (job?.jobberJobId) {
      ids.add(`jobber-${job.jobberJobId}`);
      ids.add(job.jobberJobId);
    }
    if (job?.sourceCallId) ids.add(`call-${job.sourceCallId}`);
  }

  return [...ids];
}

export function findJobsToUpdateForBooking(
  bookingId: string,
  jobs: JobCard[],
  calls: CallRecord[],
): JobCard[] {
  const matches: JobCard[] = [];

  const byId = jobs.find((j) => j.id === bookingId);
  if (byId) matches.push(byId);

  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    const byCall = jobs.find((j) => j.sourceCallId === callId);
    if (byCall && !matches.some((m) => m.id === byCall.id)) matches.push(byCall);
    const call = calls.find((c) => c.id === callId);
    if (call?.jobberRequestId) {
      const byJobber = jobs.find((j) => j.jobberJobId === call.jobberRequestId);
      if (byJobber && !matches.some((m) => m.id === byJobber.id)) matches.push(byJobber);
    }
  } else if (bookingId.startsWith("jobber-")) {
    const requestId = bookingId.slice("jobber-".length);
    const byJobber = jobs.find((j) => j.jobberJobId === requestId);
    if (byJobber && !matches.some((m) => m.id === byJobber.id)) matches.push(byJobber);
  } else {
    const job = jobs.find((j) => j.id === bookingId);
    if (job?.jobberJobId) {
      const dup = jobs.find((j) => j.jobberJobId === job.jobberJobId && j.id !== job.id);
      if (dup && !matches.some((m) => m.id === dup.id)) matches.push(dup);
    }
  }

  return matches;
}
