import { listCallLogs, patchCallLog } from "./call-logs";
import { patchJobRecord, listJobs } from "./jobs-db";
import { formatPriorityWithCode } from "./priority-display";
import { legacyToServicePriority, type ServicePriority } from "./service-priority";
import { normalizeJobPriority } from "./priority-display";
import type { JobPriority } from "./types";

function callIdFromBookingId(bookingId: string): string | null {
  if (!bookingId.startsWith("call-")) return null;
  return bookingId.slice("call-".length);
}

function manualOverrideReasons(
  existing: string[] | undefined,
  priority: JobPriority,
): string[] {
  const kept = (existing ?? []).filter(
    (r) => !r.toLowerCase().startsWith("shop manually set priority"),
  );
  return [
    ...kept,
    `Shop manually set priority to ${formatPriorityWithCode(priority)}.`,
  ];
}

export async function updateBookingPriority(
  userId: string,
  bookingId: string,
  priority: JobPriority,
): Promise<
  | { ok: true; priority: JobPriority; servicePriority: ServicePriority }
  | { ok: false; error: string }
> {
  const normalized = normalizeJobPriority(priority);
  const servicePriority = legacyToServicePriority(normalized);

  const callId = callIdFromBookingId(bookingId);
  const jobs = await listJobs(userId);
  const job =
    jobs.find((j) => j.sourceCallId === callId) ?? jobs.find((j) => j.id === bookingId);

  let existingReasons = job?.priorityReasons;
  if (callId && !existingReasons?.length) {
    const calls = await listCallLogs(userId);
    existingReasons = calls.find((c) => c.id === callId)?.priorityReasons;
  }

  if (callId) {
    const callPatch = {
      priority: normalized,
      servicePriority,
      priorityReasons: manualOverrideReasons(existingReasons, normalized),
      prioritySource: "manual" as const,
      priorityOverriddenAt: new Date().toISOString(),
    };
    const updatedCall = await patchCallLog(userId, callId, callPatch);
    if (!updatedCall) {
      return { ok: false, error: "Call log not found" };
    }
  }

  if (job) {
    const updatedJob = await patchJobRecord(userId, job.id, {
      priority: normalized,
      servicePriority,
      priorityReasons: manualOverrideReasons(existingReasons ?? job.priorityReasons, normalized),
      prioritySource: "manual",
      priorityOverriddenAt: new Date().toISOString(),
    });
    if (!updatedJob) {
      return { ok: false, error: "Job record not found" };
    }
  } else if (!callId) {
    return { ok: false, error: "Request not found" };
  }

  return { ok: true, priority: normalized, servicePriority };
}
