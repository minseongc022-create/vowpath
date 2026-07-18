import {
  canApprove,
  canMarkCompleted,
  canMarkScheduled,
  canReject,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import { pushJobberWhenApproved } from "./jobber-on-approve";
import { getRequestStatuses, setRequestStatusesBulk } from "./requests-db";
import {
  bookingStatusAliasIds,
  findJobsToUpdateForBooking,
  lookupStoredRequestStatus,
} from "./request-status-resolve";
import { listJobs, upsertJobRecord } from "./jobs-db";
import { listCallLogs, type StoredCallLog } from "./call-logs";
import { resolveBookingCustomerPhone } from "./booking-contact";
import type { CallRecord } from "./operations-analytics";
import { notifyCustomerStatusChange } from "./customer-sms";
import { recordRequestStatusChange } from "./record-tenant-events";
import { getScheduledBooking, deleteScheduledBooking } from "./schedule-bookings-db";
import { recordFlexUsage } from "./billing";
import { isPerDispatchPlan } from "./plan-pricing";
import { completeScheduledBookingAfterOwnerApprove } from "./scheduling/apply-schedule";
import {
  findUserById,
  incrementFlexBillableCount,
} from "./users-db";
import { updateCallMemoryStatus } from "./call-memory";

export class BookingStatusTransitionError extends Error {
  readonly code: "CANNOT_APPROVE" | "CANNOT_REJECT" | "CANNOT_SCHEDULE" | "CANNOT_COMPLETE";
  readonly fromStatus: RequestStatus;

  constructor(
    code: "CANNOT_APPROVE" | "CANNOT_REJECT" | "CANNOT_SCHEDULE" | "CANNOT_COMPLETE",
    fromStatus: RequestStatus,
  ) {
    super(code);
    this.name = "BookingStatusTransitionError";
    this.code = code;
    this.fromStatus = fromStatus;
  }
}

function customerPhoneFromLogs(
  bookingId: string,
  callLogs: StoredCallLog[],
): string | null {
  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    const call = callLogs.find((c) => c.id === callId);
    return call?.callbackPhone?.trim() || call?.from?.trim() || null;
  }
  if (bookingId.startsWith("jobber-")) {
    const jobberId = bookingId.slice("jobber-".length);
    const call = callLogs.find((c) => c.jobberRequestId === jobberId);
    return call?.callbackPhone?.trim() || call?.from?.trim() || null;
  }
  return null;
}

function callLogForBooking(
  bookingId: string,
  callLogs: StoredCallLog[],
  jobs: Awaited<ReturnType<typeof listJobs>> = [],
): StoredCallLog | undefined {
  if (bookingId.startsWith("call-")) {
    return callLogs.find((c) => c.id === bookingId.slice("call-".length));
  }
  if (bookingId.startsWith("jobber-")) {
    return callLogs.find((c) => c.jobberRequestId === bookingId.slice("jobber-".length));
  }
  const job = jobs.find((j) => j.id === bookingId);
  if (job?.sourceCallId) {
    return callLogs.find((c) => c.id === job.sourceCallId);
  }
  return undefined;
}

function customerDetailsFromLogs(
  bookingId: string,
  callLogs: StoredCallLog[],
  jobs: Awaited<ReturnType<typeof listJobs>>,
): { phone: string | null; name: string | null; address: string | null } {
  let call: StoredCallLog | undefined;
  if (bookingId.startsWith("call-")) {
    call = callLogs.find((c) => c.id === bookingId.slice("call-".length));
  } else if (bookingId.startsWith("jobber-")) {
    call = callLogs.find((c) => c.jobberRequestId === bookingId.slice("jobber-".length));
  } else {
    const job = jobs.find((j) => j.id === bookingId);
    if (job?.sourceCallId) {
      call = callLogs.find((c) => c.id === job.sourceCallId);
    }
  }

  const phone = call
    ? call.callbackPhone?.trim() || call.from?.trim() || null
    : customerPhoneFromLogs(bookingId, callLogs);
  const name = call?.customerName?.trim() || null;
  const address =
    call?.address?.trim() || call?.serviceLocation?.trim() || null;

  return { phone, name, address };
}

function callsFromLogs(
  logs: Awaited<ReturnType<typeof listCallLogs>>,
): CallRecord[] {
  return logs.map((c) => ({
    id: c.id,
    from: c.from,
    createdAt: c.createdAt,
    jobberRequestId: c.jobberRequestId,
  }));
}

/**
 * Persist status under every booking alias and sync matching job rows.
 * Customer SMS on approve/reject; Jobber push only after approve (see notification-channels).
 */
export type PersistBookingStatusOptions = {
  skipCustomerSms?: boolean;
};

export async function persistRequestStatusForBooking(
  userId: string,
  bookingId: string,
  status: RequestStatus,
  options?: PersistBookingStatusOptions,
): Promise<Record<string, RequestStatus>> {
  const [jobs, callLogs] = await Promise.all([
    listJobs(userId),
    listCallLogs(userId),
  ]);
  const calls = callsFromLogs(callLogs);

  const existingStatuses = await getRequestStatuses(userId);
  const linkedJobs = findJobsToUpdateForBooking(bookingId, jobs, calls);
  const currentStatus = lookupStoredRequestStatus(
    bookingId,
    existingStatuses,
    linkedJobs[0]?.jobberJobId,
  );
  const from = normalizeRequestStatus(currentStatus ?? "pending_review");
  if (status === "approved" && !canApprove(from)) {
    throw new BookingStatusTransitionError("CANNOT_APPROVE", from);
  }
  if (status === "rejected" && !canReject(from)) {
    throw new BookingStatusTransitionError("CANNOT_REJECT", from);
  }
  if (
    status === "scheduled" &&
    !canMarkScheduled(from) &&
    from !== "pending_review" &&
    from !== "request_received"
  ) {
    throw new BookingStatusTransitionError("CANNOT_SCHEDULE", from);
  }
  if (status === "completed" && !canMarkCompleted(from)) {
    throw new BookingStatusTransitionError("CANNOT_COMPLETE", from);
  }

  const scheduledOnApprove =
    status === "approved"
      ? await getScheduledBooking(userId, bookingId)
      : null;
  const effectiveStatus: RequestStatus = scheduledOnApprove
    ? "scheduled"
    : status;

  const aliases = bookingStatusAliasIds(bookingId, jobs, calls);
  const bulk = Object.fromEntries(aliases.map((id) => [id, effectiveStatus]));
  let statuses = await setRequestStatusesBulk(userId, bulk);

  const toUpdate = findJobsToUpdateForBooking(bookingId, jobs, calls);
  for (const job of toUpdate) {
    await upsertJobRecord(userId, {
      ...job,
      status: effectiveStatus,
      arrivalWindow: scheduledOnApprove?.arrivalWindowLabel ?? job.arrivalWindow,
    });
  }

  const customerName = toUpdate[0]?.customerName;
  try {
    await recordRequestStatusChange({
      userId,
      bookingId,
      status: effectiveStatus,
      customerName,
    });
  } catch (e) {
    console.warn("[booking-status-sync] tenant event", e);
  }

  try {
    await updateCallMemoryStatus(userId, bookingId, effectiveStatus);
  } catch (e) {
    console.warn("[booking-status-sync] call memory status", e);
  }

  if (!options?.skipCustomerSms) {
    try {
      if (scheduledOnApprove) {
        await completeScheduledBookingAfterOwnerApprove(
          userId,
          bookingId,
          callLogs,
          jobs,
        );
      } else {
        const customerPhone =
          customerPhoneFromLogs(bookingId, callLogs) ??
          (await resolveBookingCustomerPhone(userId, bookingId));
        await notifyCustomerStatusChange({
          userId,
          bookingId,
          status,
          phone: customerPhone,
        });
      }
    } catch (e) {
      console.warn("[booking-status-sync] customer sms", e);
    }
  }

  if (status === "approved" && !scheduledOnApprove) {
    try {
      await pushJobberWhenApproved(userId, bookingId, status, callLogs, jobs);
      statuses = await getRequestStatuses(userId);
    } catch (e) {
      console.warn("[booking-status-sync] jobber on approve", e);
    }
  }

  if (effectiveStatus === "approved" || effectiveStatus === "scheduled") {
    try {
      const { startTechAssignmentForBooking } = await import("./tech-dispatch/assign");
      await startTechAssignmentForBooking(userId, bookingId);
    } catch (e) {
      console.warn("[booking-status-sync] tech dispatch", e);
    }
  }

  if (effectiveStatus === "approved" || effectiveStatus === "scheduled") {
    try {
      const call = callLogForBooking(bookingId, callLogs, jobs);
      if (call) {
        const user = await findUserById(userId);
        const { buildDispatchPacket } = await import("./dispatch-packet");
        const { notifyOwnerDispatchPacketEmail } = await import("./owner-email-notify");
        const { resolveShopDisplayName } = await import("./link-intake-brand");
        const packet = buildDispatchPacket({
          bookingId,
          shopName: resolveShopDisplayName(user?.shopName),
          call,
        });
        await notifyOwnerDispatchPacketEmail({
          userId,
          bookingId,
          packetText: packet.plainText,
        });
      }
    } catch (e) {
      console.warn("[booking-status-sync] dispatch packet email", e);
    }
  }

  if (effectiveStatus === "approved" || effectiveStatus === "scheduled") {
    try {
      const user = await findUserById(userId);
      if (user && isPerDispatchPlan(user.plan)) {
        await incrementFlexBillableCount(userId);
        const updated = await findUserById(userId);
        if (updated) await recordFlexUsage(updated);
      }
    } catch (e) {
      console.warn("[booking-status-sync] flex billing", e);
    }
  }

  if (status === "completed") {
    try {
      await deleteScheduledBooking(userId, bookingId);
    } catch (e) {
      console.warn("[booking-status-sync] clear schedule on complete", e);
    }
    try {
      const details = customerDetailsFromLogs(bookingId, callLogs, jobs);
      const { maybeOfferMaintenancePlan } = await import("./agreements/offer-flow");
      await maybeOfferMaintenancePlan(userId, bookingId, details);
    } catch (e) {
      console.warn("[booking-status-sync] agreement offer", e);
    }
  }

  if (status === "rejected") {
    try {
      await deleteScheduledBooking(userId, bookingId);
    } catch (e) {
      console.warn("[booking-status-sync] clear schedule on reject", e);
    }
  }

  return statuses;
}
