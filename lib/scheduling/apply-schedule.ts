import type { GeneratedJobCard } from "../job-card-ai";
import type { RequestStatus } from "../booking-policy";
import type { SlotOffer } from "../booking-settings";
import {
  shouldOwnerApproveAfterCustomerSlotPick,
  shouldSendOwnerApprovalSms,
} from "../booking-settings";
import { getShopBookingSettings, decrementShadowMode } from "../shop-settings-db";
import {
  getScheduledBooking,
  upsertScheduledBooking,
  deleteScheduledBooking,
} from "../schedule-bookings-db";
import { persistRequestStatusForBooking } from "../booking-status-sync";
import { pushJobberWhenApproved } from "../jobber-on-approve";
import { listCallLogs } from "../call-logs";
import { listJobs, upsertJobRecord } from "../jobs-db";
import { resolvePriorityFields } from "../service-priority";
import { getConfidenceThreshold } from "../call-intake/confidence-config";
import type { FieldConfidence } from "../call-intake/types";
import {
  notifyCustomerScheduled,
  notifyCustomerNoSlot,
  notifyOwnerScheduledFyi,
  notifyOwnerApprovalNeeded,
  notifyOwnerNoSlot,
  notifyOwnerShadowResult,
} from "../scheduling/schedule-sms";
import { logOperationFailure } from "../ops-failures";

export type ApplyScheduleParams = {
  userId: string;
  bookingId: string;
  callLogId: string;
  slot: SlotOffer | null;
  card: GeneratedJobCard;
  confidence: FieldConfidence;
  priority: "P1" | "P2" | "P3";
  customerPhone?: string;
};

function confidenceMin(confidence: FieldConfidence): number {
  return Math.min(
    confidence.customerName,
    confidence.address,
    confidence.serviceLocation,
    confidence.issueType,
  );
}

export async function applyCustomerChosenSchedule(
  params: ApplyScheduleParams,
): Promise<RequestStatus> {
  const settings = await getShopBookingSettings(params.userId);
  const shadow = settings.shadowModeRemaining > 0;

  if (!params.slot) {
    await notifyCustomerNoSlot({
      userId: params.userId,
      bookingId: params.bookingId,
      phone: params.customerPhone,
    });
    await notifyOwnerNoSlot({
      userId: params.userId,
      bookingId: params.bookingId,
      customerName: params.card.customerName,
      issue: params.card.symptom,
    });
    await persistRequestStatusForBooking(
      params.userId,
      params.bookingId,
      "pending_review",
    );
    return "pending_review";
  }

  const needsApproval = shouldOwnerApproveAfterCustomerSlotPick({
    mode: settings.schedulingMode,
    priority: params.priority,
    confidenceMin: confidenceMin(params.confidence),
    confidenceThreshold: getConfidenceThreshold(),
  });

  const undoAt = new Date();
  undoAt.setMinutes(undoAt.getMinutes() + settings.undoWindowMinutes);

  if (!shadow) {
    await upsertScheduledBooking(params.userId, {
      bookingId: params.bookingId,
      scheduledStartAt: params.slot.startAt,
      scheduledEndAt: params.slot.endAt,
      arrivalWindowLabel: params.slot.label,
      slotSource: params.slot.source,
      undoExpiresAt: needsApproval ? undefined : undoAt.toISOString(),
    });
  }

  const jobs = await listJobs(params.userId);
  const job = jobs.find((j) => j.sourceCallId === params.callLogId);
  if (job) {
    await upsertJobRecord(params.userId, {
      ...job,
      arrivalWindow: params.slot.label,
      status: needsApproval ? "pending_review" : "scheduled",
    });
  }

  const status: RequestStatus = needsApproval ? "pending_review" : "scheduled";
  await persistRequestStatusForBooking(params.userId, params.bookingId, status);

  if (shadow) {
    const left = await decrementShadowMode(params.userId);
    await notifyOwnerShadowResult({
      userId: params.userId,
      bookingId: params.bookingId,
      window: params.slot.label,
      customerName: params.card.customerName,
      shadowLeft: left.shadowModeRemaining,
    });
    return status;
  }

  if (needsApproval) {
    if (
      shouldSendOwnerApprovalSms(
        settings.ownerApprovalSms,
        params.priority,
        settings.schedulingMode,
      )
    ) {
      await notifyOwnerApprovalNeeded({
        userId: params.userId,
        bookingId: params.bookingId,
        customerName: params.card.customerName,
        issue: params.card.symptom,
        window: params.slot.label,
        priority: params.priority,
      });
    }
  } else {
    await notifyCustomerScheduled({
      userId: params.userId,
      bookingId: params.bookingId,
      phone: params.customerPhone,
      window: params.slot.label,
      address: params.card.address,
      priority: params.priority,
    });
    await notifyOwnerScheduledFyi({
      userId: params.userId,
      bookingId: params.bookingId,
      customerName: params.card.customerName,
      issue: params.card.symptom,
      window: params.slot.label,
      undoMinutes: settings.undoWindowMinutes,
    });

    const callLogs = await listCallLogs(params.userId);
    const freshJobs = await listJobs(params.userId);
    try {
      await pushJobberWhenApproved(
        params.userId,
        params.bookingId,
        "approved",
        callLogs,
        freshJobs,
      );
    } catch (e) {
      await logOperationFailure({
        userId: params.userId,
        category: "jobber",
        operation: "applyScheduleJobber",
        message: e instanceof Error ? e.message : "Jobber sync failed",
        retryable: true,
        payload: { bookingId: params.bookingId },
      });
    }
  }

  return status;
}

/** Owner approved a customer-picked slot (hybrid/control). */
export async function completeScheduledBookingAfterOwnerApprove(
  userId: string,
  bookingId: string,
  callLogs: Awaited<ReturnType<typeof listCallLogs>>,
  jobs: Awaited<ReturnType<typeof listJobs>>,
): Promise<boolean> {
  const scheduled = await getScheduledBooking(userId, bookingId);
  if (!scheduled) return false;

  const settings = await getShopBookingSettings(userId);
  const call = callLogs.find((c) => bookingId === `call-${c.id}`);
  const job = jobs.find((j) => j.sourceCallId === call?.id);
  const pf = call
    ? resolvePriorityFields(call)
    : resolvePriorityFields(job ?? { priority: "P2" });
  const card: GeneratedJobCard = call
    ? {
        priority: pf.priority,
        servicePriority: pf.servicePriority,
        priorityReasons: pf.priorityReasons,
        prioritySource: pf.prioritySource,
        symptom: call.symptom ?? "Service request",
        customerName: call.customerName ?? "Unknown",
        address: call.address ?? "Unknown",
        phone: call.callbackPhone?.trim() || call.from,
        arrivalWindow: scheduled.arrivalWindowLabel,
        dispatchNotes: call.aiSummary?.trim() || "",
        jobberPasteBlock: "",
      }
    : {
        priority: pf.priority,
        servicePriority: pf.servicePriority,
        priorityReasons: pf.priorityReasons,
        prioritySource: pf.prioritySource,
        symptom: job?.symptom ?? "Service request",
        customerName: job?.customerName ?? "Unknown",
        address: job?.address ?? "Unknown",
        phone: "—",
        arrivalWindow: scheduled.arrivalWindowLabel,
        dispatchNotes: "",
        jobberPasteBlock: "",
      };

  const customerPhone = call?.callbackPhone?.trim() || call?.from;
  await notifyCustomerScheduled({
    userId,
    bookingId,
    phone: customerPhone,
    window: scheduled.arrivalWindowLabel,
    address: card.address,
    priority: card.priority,
  });

  const undoAt = new Date();
  undoAt.setMinutes(undoAt.getMinutes() + settings.undoWindowMinutes);
  await upsertScheduledBooking(userId, {
    bookingId,
    scheduledStartAt: scheduled.scheduledStartAt,
    scheduledEndAt: scheduled.scheduledEndAt,
    arrivalWindowLabel: scheduled.arrivalWindowLabel,
    slotSource: scheduled.slotSource,
    undoExpiresAt: undoAt.toISOString(),
  });

  const freshJobs = await listJobs(userId);
  try {
    await pushJobberWhenApproved(
      userId,
      bookingId,
      "approved",
      callLogs,
      freshJobs,
    );
  } catch (e) {
    await logOperationFailure({
      userId,
      category: "jobber",
      operation: "approveScheduleJobber",
      message: e instanceof Error ? e.message : "Jobber sync failed",
      retryable: true,
      payload: { bookingId },
    });
  }

  return true;
}

export async function undoScheduledBooking(
  userId: string,
  bookingId: string,
): Promise<boolean> {
  const scheduled = await getScheduledBooking(userId, bookingId);
  if (!scheduled?.undoExpiresAt) return false;
  if (new Date(scheduled.undoExpiresAt).getTime() < Date.now()) return false;

  await deleteScheduledBooking(userId, bookingId);
  await persistRequestStatusForBooking(userId, bookingId, "pending_review");
  return true;
}
