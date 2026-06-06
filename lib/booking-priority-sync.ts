import { patchCallLog } from "./call-logs";
import { findLinkedCall } from "./booking-detail";
import { patchJobRecord } from "./jobs-db";
import { listCallLogs } from "./call-logs";
import { listJobs } from "./jobs-db";
import { buildAllRecentBookings, findRecentBooking } from "./recent-bookings";
import type { CallRecord } from "./operations-analytics";
import {
  normalizeServicePriority,
  servicePriorityToLegacy,
  SERVICE_PRIORITY_LABELS,
  type ServicePriority,
} from "./service-priority";

export async function persistBookingPriorityOverride(
  userId: string,
  bookingId: string,
  servicePriority: ServicePriority,
  manualNote?: string,
): Promise<{ ok: true; bookingId: string; servicePriority: ServicePriority } | { ok: false; error: string }> {
  const tier = normalizeServicePriority(servicePriority);
  const priority = servicePriorityToLegacy(tier);
  const reasons = [
    `Shop manually set priority to ${SERVICE_PRIORITY_LABELS[tier]}.`,
    ...(manualNote?.trim() ? [manualNote.trim()] : []),
  ];
  const patch = {
    servicePriority: tier,
    priority,
    priorityReasons: reasons,
    prioritySource: "manual" as const,
    priorityOverriddenAt: new Date().toISOString(),
  };

  const jobs = await listJobs(userId);
  const calls = (await listCallLogs(userId)) as CallRecord[];
  const booking = findRecentBooking(
    buildAllRecentBookings(jobs, [], calls),
    bookingId,
    { jobs, calls },
  );
  if (!booking) {
    return { ok: false, error: "Request not found." };
  }

  if (booking.id.startsWith("call-")) {
    const callId = booking.id.slice("call-".length);
    const callUpdated = await patchCallLog(userId, callId, patch);
    if (!callUpdated) {
      return { ok: false, error: "Linked call log not found." };
    }
    const linkedJob = jobs.find((j) => j.sourceCallId === callId);
    if (linkedJob) {
      await patchJobRecord(userId, linkedJob.id, patch);
    }
    return { ok: true, bookingId, servicePriority: tier };
  }

  const jobUpdated = await patchJobRecord(userId, booking.id, patch);
  if (!jobUpdated) {
    return { ok: false, error: "Job record not found." };
  }
  const call = findLinkedCall(booking, calls);
  if (call) {
    await patchCallLog(userId, call.id, patch);
  }

  return { ok: true, bookingId, servicePriority: tier };
}
