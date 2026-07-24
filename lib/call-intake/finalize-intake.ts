import { addCallLog, patchCallLog } from "../call-logs";
import { resolveAddressConfirmationFromIntake } from "../address/confirmation";
import { scoreCallQuality } from "../call-quality-score";
import { initialRequestStatusAfterIntake } from "../booking-policy";
import type { SlotOffer } from "../booking-settings";
import { addJobRecord } from "../jobs-db";
import type { GeneratedJobCard } from "../job-card-ai";
import { logOperationFailure } from "../ops-failures";
import {
  notifyCustomerRequestReceived,
  notifyOwnerNewRequest,
  notifyOwnerIntakeAutoConfirmed,
} from "../customer-sms";
import { confidenceMinFromFields, resolveAutoBookDecisionForVertical } from "../auto-book-policy";
import { getShopVertical } from "../vertical-context.js";
import { startCustomerVerification } from "../customer-verification/flow";
import { getShopBookingSettings } from "../shop-settings-db";
import {
  extractZipFromAddress,
  isZipInServiceArea,
  serviceAreaRejectMessage,
} from "../service-area";
import { findUserById } from "../users-db";
import { applyCustomerChosenSchedule } from "../scheduling/apply-schedule";
import { setInstantUndoExpiry } from "../instant-undo-store";
import { upsertCallMemory } from "../call-memory";
import {
  recordCallSignalEvents,
  recordServiceRequestCreated,
} from "../record-tenant-events";
import { persistRequestStatusForBooking } from "../booking-status-sync";
import { notifyZapierNewRequest } from "../zapier-webhook";
import { formatCityState } from "../recent-bookings";
import type { InboundSpeechResult } from "../process-inbound-speech";
import type { IntakeChannel, VerifiedCallPayload } from "./types";
import {
  createBookingReviewLinkSession,
  sendIntakeBookingConfirmation,
} from "./booking-confirmation";
import { ESTIMATE_ARRIVAL_WINDOW } from "../estimate-pipeline";

export type FinalizeIntakeOptions = {
  intakeChannel?: IntakeChannel;
  /** Phone intake sends YES/NO verification SMS by default; set false to skip */
  sendCustomerVerificationSms?: boolean;
  selectedSlot?: SlotOffer | null;
  afterHours?: boolean;
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
 * Persist a fully verified intake. With scheduling on, slots auto-confirm per shop mode.
 * Jobber syncs on confirm (auto-book) or after owner approves held requests.
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
  const [settings, vertical] = await Promise.all([
    getShopBookingSettings(userId),
    getShopVertical(userId),
  ]);
  const schedulingActive = settings.schedulingEnabled;
  let finalRequestStatus = initialRequestStatusAfterIntake();

  if (settings.serviceAreaZips.length > 0 && payload.address) {
    const zip = extractZipFromAddress(payload.address);
    if (!isZipInServiceArea(zip, settings.serviceAreaZips)) {
      const user = await findUserById(userId);
      return {
        card,
        callLogId: "",
        serviceAreaRejected: true,
        rejectMessage: serviceAreaRejectMessage(user?.shopName),
      };
    }
  }

  const callLogId = crypto.randomUUID();
  const addressConfirmation =
    payload.addressConfirmation ??
    resolveAddressConfirmationFromIntake({
      address: payload.address,
      confidence: payload.confidence,
      channel,
    });
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
      verificationComplete: payload.verificationComplete === true,
      intakeChannel: channel,
      intakePhotoRef: payload.intakePhotoRef,
      addressValidation: payload.addressValidation,
      verifiedFields: payload.verifiedFields,
      addressConfirmation,
      lossCategory: payload.lossCategory,
      insuranceCarrier: payload.insuranceCarrier,
      insuranceClaimNumber: payload.insuranceClaimNumber,
      waterSource: payload.waterSource,
      activeLoss: payload.activeLoss,
      severity: payload.severity,
      lastServiceYear: payload.lastServiceYear,
      urgency: payload.urgency,
      dispatchNotes: payload.dispatchNotes,
      jobberPasteBlock: payload.jobberPasteBlock,
      customerSmsConsent: payload.customerSmsConsent,
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

  // Not awaited on purpose — this is a dashboard nice-to-have, not part of the customer-facing
  // flow, and awaiting an extra OpenAI round trip here would slow down every live call. May get
  // cut short if the serverless instance exits right after the response, in which case the call
  // simply stays unscored (harmless).
  void scoreCallQuality({
    transcript: payload.transcript,
    extracted: {
      priority: payload.priority,
      customerName: payload.customerName,
      address: payload.address,
      issueType: payload.issueType,
      symptom: payload.symptom,
    },
  })
    .then((result) => {
      if (!result) return;
      return patchCallLog(userId, callLogId, {
        qualityScore: result.score,
        qualityReasoning: result.reasoning,
      });
    })
    .catch((e) => console.warn("[finalize-intake] call quality score", e));

  try {
    const estimateLead =
      payload.priority === "P3" &&
      /estimate|quote/i.test(payload.arrivalWindow || payload.symptom || "");
    await addJobRecord(userId, {
      priority: payload.priority,
      servicePriority: payload.servicePriority,
      priorityReasons: payload.priorityReasons,
      prioritySource: payload.prioritySource,
      priorityOverriddenAt: payload.priorityOverriddenAt,
      symptom: payload.symptom,
      customerName: payload.customerName,
      address: payload.address,
      arrivalWindow: estimateLead
        ? payload.arrivalWindow || ESTIMATE_ARRIVAL_WINDOW
        : payload.arrivalWindow,
      status: initialRequestStatusAfterIntake(),
      sourceCallId: callLogId,
      requestKind: estimateLead ? "estimate" : "service",
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

  try {
    await upsertCallMemory({
      userId,
      callId: callLogId,
      bookingId,
      customerName: payload.customerName,
      phoneNumber: payload.callbackPhone,
      issue: payload.issueType || payload.symptom,
      requestedTime: payload.arrivalWindow,
      summary: payload.aiSummary || payload.dispatchNotes || payload.transcript,
      bookingStatus: initialRequestStatusAfterIntake(),
      priority: payload.priority,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[finalize-intake] call memory", e);
  }

  if (schedulingActive) {
    try {
      finalRequestStatus = await applyCustomerChosenSchedule({
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
        finalRequestStatus = initialRequestStatusAfterIntake();
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

  if (!schedulingActive) {
    try {
      const confMin = confidenceMinFromFields(payload.confidence);
      const inServiceArea =
        settings.serviceAreaZips.length === 0 ||
        (payload.address
          ? isZipInServiceArea(extractZipFromAddress(payload.address), settings.serviceAreaZips)
          : true);
      const autoDecision = resolveAutoBookDecisionForVertical(vertical, {
        priority: payload.priority,
        confidenceMin: confMin,
        lossCategory: payload.lossCategory,
        issueType: payload.issueType,
        symptom: payload.symptom,
        customerName: payload.customerName,
        address: payload.address,
        inServiceArea,
      });
      if (!autoDecision.needsOwnerApproval) {
        finalRequestStatus = "approved";
        await persistRequestStatusForBooking(
          userId,
          bookingId,
          "approved",
          { skipCustomerSms: false },
        );
        const undoExpiresAt = await setInstantUndoExpiry(
          userId,
          bookingId,
          settings.undoWindowMinutes,
        );
        await notifyOwnerIntakeAutoConfirmed({
          userId,
          bookingId,
          customerName: payload.customerName,
          issueType: payload.issueType,
          symptom: payload.symptom,
          priority: payload.priority,
          cityState: formatCityState(payload.address),
          urgent: autoDecision.isUrgentAlert,
          autoWaterDispatch: autoDecision.autoWaterDispatch,
          undoMinutes: Math.max(
            1,
            Math.round((new Date(undoExpiresAt).getTime() - Date.now()) / 60_000),
          ),
        });
      } else {
        await notifyOwnerNewRequest({
          userId,
          bookingId,
          customerName: payload.customerName,
          issueType: payload.issueType,
          symptom: payload.symptom,
          priority: payload.priority,
          cityState: formatCityState(payload.address),
          address: payload.address,
          ambiguous: autoDecision.isAmbiguous,
          customerPhone: payload.callbackPhone,
        });
      }
    } catch (e) {
      console.warn("[finalize-intake] owner new request sms", e);
    }
  }

  void notifyZapierNewRequest({
    userId,
    bookingId,
    customerName: payload.customerName,
    phone: payload.callbackPhone,
    issueType: payload.issueType,
    symptom: payload.symptom,
    address: payload.address,
    priority: payload.priority,
    createdAt: new Date().toISOString(),
  });

  if (options.afterHours && customerPhone && !sendCustomerVerification) {
    try {
      await notifyCustomerRequestReceived({
        userId,
        bookingId,
        phone: customerPhone,
        afterHours: true,
      });
    } catch (e) {
      console.warn("[finalize-intake] after-hours customer sms", e);
    }
  }

  if (customerPhone) {
    try {
      const reviewSession = await createBookingReviewLinkSession({
        userId,
        bookingId,
        callId: callLogId,
        callSid: payload.callSid || callLogId,
        from: customerPhone,
        to: payload.to,
        shopName: (await findUserById(userId))?.shopName,
        customerPhone,
        customerName: payload.customerName,
      });
      await sendIntakeBookingConfirmation({
        userId,
        bookingId,
        callLogId,
        customerPhone,
        customerName: payload.customerName,
        issueType: payload.issueType || payload.symptom,
        arrivalWindow: payload.arrivalWindow,
        reviewToken: reviewSession.token,
        pendingShopReview: finalRequestStatus !== "approved",
        needsPickTime: !options.selectedSlot && !payload.arrivalWindow?.trim(),
      });
    } catch (e) {
      console.warn("[finalize-intake] customer booking confirmation sms", e);
    }
  }

  return { card, callLogId };
}
