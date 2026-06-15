import type { GeneratedJobCard } from "./job-card-ai";
import { pushJobCardToJobber } from "./jobber-api";
import { getJobberTokens } from "./jobber-tokens";
import { getScheduledBooking } from "./schedule-bookings-db";
import { getShopBookingSettings } from "./shop-settings-db";
import { pushJobberScheduledBooking } from "./scheduling/jobber-schedule-write";
import { updateCallLogJobberRequest } from "./call-logs";
import type { StoredCallLog } from "./call-logs";
import { addJobRecord, listJobs, upsertJobRecord } from "./jobs-db";
import type { RequestStatus } from "./booking-policy";
import { bookingStatusAliasIds } from "./request-status-resolve";
import type { CallRecord } from "./operations-analytics";
import { logOperationFailure } from "./ops-failures";
import { setRequestStatusesBulk } from "./requests-db";
import { resolvePriorityFields } from "./service-priority";
import { appendTenantEvent } from "./tenant-events";
import type { JobCard } from "./types";

function callsFromLogs(logs: StoredCallLog[]): CallRecord[] {
  return logs.map((c) => ({
    id: c.id,
    from: c.from,
    createdAt: c.createdAt,
    jobberRequestId: c.jobberRequestId,
  }));
}

function findCallForBooking(
  bookingId: string,
  callLogs: StoredCallLog[],
  jobs: JobCard[],
): StoredCallLog | undefined {
  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    return callLogs.find((c) => c.id === callId);
  }
  if (bookingId.startsWith("jobber-")) {
    const requestId = bookingId.slice("jobber-".length);
    return callLogs.find((c) => c.jobberRequestId === requestId);
  }
  const job = jobs.find((j) => j.id === bookingId);
  if (job?.sourceCallId) {
    return callLogs.find((c) => c.id === job.sourceCallId);
  }
  return undefined;
}

function buildCardFromCall(call: StoredCallLog): GeneratedJobCard {
  const pf = resolvePriorityFields(call);
  return {
    priority: pf.priority,
    servicePriority: pf.servicePriority,
    priorityReasons: pf.priorityReasons,
    prioritySource: pf.prioritySource,
    symptom: call.symptom ?? "Service request",
    customerName: call.customerName ?? "Unknown",
    address: call.address ?? "Unknown",
    phone: call.callbackPhone?.trim() || call.from,
    arrivalWindow: call.arrivalWindow ?? "Pending shop review",
    dispatchNotes: call.aiSummary?.trim() || call.issueType || "",
    jobberPasteBlock: "",
  };
}

function buildCardFromJob(job: JobCard, call?: StoredCallLog): GeneratedJobCard {
  const pf = resolvePriorityFields(job);
  return {
    priority: pf.priority,
    servicePriority: pf.servicePriority,
    priorityReasons: pf.priorityReasons,
    prioritySource: pf.prioritySource,
    symptom: job.symptom,
    customerName: job.customerName,
    address: job.address,
    phone: call?.callbackPhone?.trim() || call?.from || "—",
    arrivalWindow: job.arrivalWindow,
    dispatchNotes: call?.aiSummary?.trim() || "",
    jobberPasteBlock: "",
  };
}

function alreadyLinkedToJobber(
  bookingId: string,
  callLogs: StoredCallLog[],
  jobs: JobCard[],
): boolean {
  if (bookingId.startsWith("jobber-")) return true;
  const call = findCallForBooking(bookingId, callLogs, jobs);
  if (call?.jobberRequestId) return true;
  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    return jobs.some((j) => j.sourceCallId === callId && j.jobberJobId);
  }
  const job = jobs.find((j) => j.id === bookingId);
  return Boolean(job?.jobberJobId);
}

/**
 * Create Jobber request only after shop approval (not at call intake).
 */
export async function pushJobberWhenApproved(
  userId: string,
  bookingId: string,
  status: RequestStatus,
  callLogs: StoredCallLog[],
  jobs: JobCard[],
): Promise<void> {
  if (status !== "approved") return;

  const tokens = await getJobberTokens(userId);
  if (!tokens) return;

  if (alreadyLinkedToJobber(bookingId, callLogs, jobs)) return;

  const call = findCallForBooking(bookingId, callLogs, jobs);
  const jobMatches = jobs.filter((j) => {
    if (bookingId.startsWith("call-")) {
      return j.sourceCallId === bookingId.slice("call-".length);
    }
    return j.id === bookingId;
  });
  const job = jobMatches[0];

  const card = call
    ? buildCardFromCall(call)
    : job
      ? buildCardFromJob(job, call)
      : null;
  if (!card) return;

  try {
    const settings = await getShopBookingSettings(userId);
    const scheduled = await getScheduledBooking(userId, bookingId);
    const pushed =
      scheduled && settings.jobberSchedulingEnabled
        ? (await pushJobberScheduledBooking(userId, bookingId, card, {
            startAt: scheduled.scheduledStartAt,
            endAt: scheduled.scheduledEndAt,
            label: scheduled.arrivalWindowLabel,
          })) ?? (await pushJobCardToJobber(userId, card))
        : await pushJobCardToJobber(userId, card);
    const requestId = pushed.requestId;

    if (call) {
      await updateCallLogJobberRequest(userId, call.id, requestId);
    }

    const freshJobs = await listJobs(userId);
    const linked = call
      ? freshJobs.find((j) => j.sourceCallId === call.id)
      : freshJobs.find((j) => j.id === job?.id);

    const jobberId = pushed.jobId ?? requestId;
    if (linked) {
      await upsertJobRecord(userId, {
        ...linked,
        jobberJobId: jobberId,
        status,
      });
    } else if (call) {
      await addJobRecord(userId, {
        priority: card.priority,
        servicePriority: card.servicePriority,
        priorityReasons: card.priorityReasons,
        prioritySource: card.prioritySource,
        symptom: card.symptom,
        customerName: card.customerName,
        address: card.address,
        arrivalWindow: card.arrivalWindow,
        status,
        jobberJobId: jobberId,
        sourceCallId: call.id,
      });
    }

    const calls = callsFromLogs(
      call
        ? callLogs.map((c) =>
            c.id === call.id ? { ...c, jobberRequestId: requestId } : c,
          )
        : callLogs,
    );
    const updatedJobs = await listJobs(userId);
    const primaryId = `jobber-${requestId}`;
    const aliases = bookingStatusAliasIds(primaryId, updatedJobs, calls);
    const bulk = Object.fromEntries(aliases.map((id) => [id, status]));
    await setRequestStatusesBulk(userId, bulk);
    try {
      await appendTenantEvent({
        userId,
        type: "booking_jobber_synced",
        title: "Jobber synced",
        body: `Jobber request ${requestId}`,
        bookingId,
        href: `/dashboard/bookings/${encodeURIComponent(bookingId)}`,
        urgency: "medium",
      });
    } catch (eventError) {
      console.warn("[jobber-on-approve] timeline event", eventError);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Jobber push on approve failed";
    await logOperationFailure({
      userId,
      category: "jobber",
      operation: "pushJobberWhenApproved",
      message,
      retryable: true,
      payload: { bookingId },
    });
    console.warn("[jobber-on-approve]", e);
  }
}
