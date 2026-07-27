import { listCallLogs, type StoredCallLog } from "./call-logs";
import { listJobs } from "./jobs-db";

async function callLogForBookingId(
  userId: string,
  bookingId: string,
): Promise<StoredCallLog | undefined> {
  const callLogs = await listCallLogs(userId);
  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    return callLogs.find((c) => c.id === callId);
  }
  if (bookingId.startsWith("jobber-")) {
    const jobberId = bookingId.slice("jobber-".length);
    return callLogs.find((c) => c.jobberRequestId === jobberId);
  }
  const jobs = await listJobs(userId);
  const job = jobs.find((j) => j.id === bookingId);
  if (job?.sourceCallId) {
    return callLogs.find((c) => c.id === job.sourceCallId);
  }
  return undefined;
}

/** True when customer opted in to promotional SMS on intake (review, quote follow-up, PM offer). */
export async function hasCustomerMarketingSmsConsent(
  userId: string,
  bookingId: string,
): Promise<boolean> {
  const call = await callLogForBookingId(userId, bookingId);
  return Boolean(call?.customerSmsConsent?.smsMarketingAt);
}
