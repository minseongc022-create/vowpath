import { addCallLog } from "../call-logs";
import { initialRequestStatusAfterIntake } from "../booking-policy";
import type { SlotOffer } from "../booking-settings";
import { addJobRecord } from "../jobs-db";
import type { GeneratedJobCard } from "../job-card-ai";
import { logOperationFailure } from "../ops-failures";
import { notifyOwnerNewRequest } from "../customer-sms";
import { startCustomerVerification } from "../customer-verification/flow";
import { getShopBookingSettings } from "../shop-settings-db";
import { applyCustomerChosenSchedule } from "../scheduling/apply-schedule";
import { looksLikeSpamCall } from "../spam-call-filter";
import {
  recordCallSignalEvents,
  recordServiceRequestCreated,
} from "../record-tenant-events";
import { persistRequestStatusForBooking } from "../booking-status-sync";
import { formatCityState } from "../recent-bookings";
import type { InboundSpeechResult } from "../process-inbound-speech";
import type { IntakeChannel, VerifiedCallPayload } from "./types";

export type FinalizeIntakeOptions = {
  intakeChannel?: IntakeChannel;
  /** Phone intake sends YES/NO verification SMS by default; set false to skip */
  sendCustomerVerificationSms?: boolean;
  selectedSlot?: SlotOffer | null;
};

function toJobCard(payload: VerifiedCallPayload): GeneratedJobCard {
  return {
    priority: payload.priority,
    servicePriority: payload.servicePriority,
    priorityReasons: payload.priorityReasons,
    prioritySource: payload.prioritySource,
    symptom: payload.symptom,
    customerName: payload.customerName,
    address: payload.address,
    phone: payload.callbackPhone,
    arrivalWindow: payload.arrivalWindow,
    dispatchNotes: payload.dispatchNotes,
    jobberPasteBlock: payload.jobberPasteBlock,
  };
}

/**
 * Persist a fully verified intake. Jobber is created after shop approval, not here.
 */
export async function finalizeVerifiedIntake(
  userId: string,
  payload: VerifiedCallPayload,
  options: FinalizeIntakeOptions = {},
): Promise<InboundSpeechResult> {
  const channel = options.intakeChannel ?? "phone";
  const sendCustomerVerification =
    channel === "phone" && options.sendCustomerVerificationSms !== false;
  const card = toJobCard(payload);
  const settings = await getShopBookingSettings(userId);
  const schedulingActive = settings.schedulingEnabled;
  const isSpam =
    settings.spamFilterEnabled &&
    looksLikeSpamCall(payload.transcript, payload.symptom);

  const callLogId = crypto.randomUUID();
  try {
    await addCallLog({
      id: callLogId,
      userId,
      from: payload.callbackPhone,
      to: payload.to,
      transcript: payload.transcript,
      priority: payload.priority,
      servicePriority: payload.servicePriority,
      priorityReasons: payload.priorityReasons,
      prioritySource: payload.prioritySource,
      priorityOverriddenAt: payload.priorityOverriddenAt,
      symptom: payload.symptom,
      customerName: payload.customerName,
      address: payload.address,
      serviceLocation: payload.serviceLocation,
      issueType: payload.issueType,
      arrivalWindow: payload.arrivalWindow,
      callSid: payload.callSid,
      recordingUrl: payload.recordingUrl,
      aiSummary: payload.aiSummary,
      callbackPhone: payload.callbackPhone,
      confidence: payload.confidence,
      verificationComplete: true,
      intakeChannel: channel,
      intakePhotoRef: payload.intakePhotoRef,
      addressValidation: payload.addressValidation,
      verifiedFields: payload.verifiedFields,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    await logOperationFailure({
      userId,
      category: "storage",
      operation: "addCallLog",
      message: e instanceof Error ? e.message : "Call log save failed",
      retryable: true,
      callSid: payload.callSid,
    });
    throw e;
  }

  try {
    await addJobRecord(userId, {
      priority: payload.priority,
      servicePriority: payload.servicePriority,
      priorityReasons: payload.priorityReasons,
      prioritySource: payload.prioritySource,
      priorityOverriddenAt: payload.priorityOverriddenAt,
      symptom: payload.symptom,
      customerName: payload.customerName,
      address: payload.address,
      arrivalWindow: payload.arrivalWindow,
      status: initialRequestStatusAfterIntake(),
      sourceCallId: callLogId,
    });
  } catch (e) {
    await logOperationFailure({
      userId,
      category: "storage",
      operation: "addJobRecord",
      message: e instanceof Error ? e.message : "Job record save failed",
      retryable: true,
      callSid: payload.callSid,
    });
  }

  const bookingId = `call-${callLogId}`;

  if (schedulingActive) {
    try {
      await applyCustomerChosenSchedule({
        userId,
        bookingId,
        callLogId,
        slot: options.selectedSlot ?? null,
        card,
        confidence: payload.confidence,
        priority: payload.priority,
        customerPhone: payload.callbackPhone,
      });
    } catch (e) {
      console.warn("[finalize-intake] apply schedule", e);
      try {
        await persistRequestStatusForBooking(
          userId,
          bookingId,
          initialRequestStatusAfterIntake(),
        );
      } catch (inner) {
        console.warn("[finalize-intake] request status fallback", inner);
      }
    }
  } else {
    try {
      await persistRequestStatusForBooking(
        userId,
        bookingId,
        initialRequestStatusAfterIntake(),
      );
    } catch (e) {
      console.warn("[finalize-intake] request status seed", e);
    }
  }

  try {
    await recordServiceRequestCreated({
      userId,
      bookingId,
      callId: callLogId,
      customerName: payload.customerName,
      issueType: payload.issueType,
      cityState: formatCityState(payload.address),
      priority: payload.priority,
    });
    await recordCallSignalEvents({
      userId,
      callId: callLogId,
      bookingId,
      customerName: payload.customerName,
      symptom: payload.symptom,
      priority: payload.priority,
      transcript: payload.transcript,
      recordingUrl: payload.recordingUrl,
    });
  } catch (e) {
    console.warn("[finalize-intake] tenant event", e);
  }

  const customerPhone = payload.callbackPhone?.trim();
  if (
    customerPhone &&
    sendCustomerVerification &&
    channel === "phone" &&
    !schedulingActive
  ) {
    try {
      await startCustomerVerification({
        userId,
        bookingId,
        callId: callLogId,
        customerPhone,
        customerName: payload.customerName,
        address: payload.address,
        issueType: payload.issueType,
        intakeChannel: channel,
      });
    } catch (e) {
      console.warn("[finalize-intake] customer verification sms", e);
    }
  }

  if (!schedulingActive && !isSpam) {
    try {
      await notifyOwnerNewRequest({
        userId,
        bookingId,
        customerName: payload.customerName,
        issueType: payload.issueType,
        symptom: payload.symptom,
        priority: payload.priority,
        cityState: formatCityState(payload.address),
        address: payload.address,
      });
    } catch (e) {
      console.warn("[finalize-intake] owner new request sms", e);
    }
  }

  return { card, callLogId };
}
