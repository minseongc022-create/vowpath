import { listCallLogs } from "./call-logs";
import { listJobs } from "./jobs-db";

function phoneFromCall(
  call: Awaited<ReturnType<typeof listCallLogs>>[number],
): string | null {
  const phone = call.callbackPhone?.trim() || call.from?.trim();
  return phone || null;
}

export async function resolveBookingCustomerPhone(
  userId: string,
  bookingId: string,
): Promise<string | null> {
  const id = bookingId.trim();
  const [calls, jobs] = await Promise.all([listCallLogs(userId), listJobs(userId)]);

  if (id.startsWith("call-")) {
    const callId = id.slice("call-".length);
    const call = calls.find((c) => c.id === callId);
    return call ? phoneFromCall(call) : null;
  }

  if (id.startsWith("jobber-")) {
    const jobberId = id.slice("jobber-".length);
    const callByJobber = calls.find((c) => c.jobberRequestId === jobberId);
    if (callByJobber) return phoneFromCall(callByJobber);

    const job = jobs.find((j) => j.jobberJobId === jobberId);
    if (job?.sourceCallId) {
      const call = calls.find((c) => c.id === job.sourceCallId);
      if (call) return phoneFromCall(call);
    }
    return null;
  }

  const job = jobs.find((j) => j.id === id);
  if (job?.jobberJobId) {
    const callByJobber = calls.find((c) => c.jobberRequestId === job.jobberJobId);
    if (callByJobber) return phoneFromCall(callByJobber);
  }
  if (job?.sourceCallId) {
    const call = calls.find((c) => c.id === job.sourceCallId);
    if (call) return phoneFromCall(call);
  }

  return null;
}
