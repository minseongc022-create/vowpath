import { NextResponse } from "next/server";
import { addCallLog } from "@/lib/call-logs";
import { addJobRecord } from "@/lib/jobs-db";
import { extractIntakeFromSpeechForVertical } from "@/lib/call-intake/extraction";
import { applyPriorityAnalysisToDraft } from "@/lib/apply-service-priority";
import { getShopVertical } from "@/lib/vertical-context.js";
import {
  notifyCustomerRequestReceivedEs,
  notifyOwnerNewRequest,
} from "@/lib/customer-sms";
import { notifyZapierNewRequest } from "@/lib/zapier-webhook";
import { formatCityState } from "@/lib/recent-bookings";
import { initialRequestStatusAfterIntake } from "@/lib/booking-policy";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import {
  twimlGatherSpanishIntake,
  twimlResponse,
  twimlSay,
  twimlSpanishIntakeConfirmation,
} from "@/lib/twilio-xml";
import { logOperationFailure } from "@/lib/ops-failures";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/**
 * Spanish voice intake — simpler than the English tree by design (see
 * twimlGatherSpanishIntake): one open speech capture, always pending_review, no
 * auto-dispatch. A caller describing a real emergency in Spanish still gets triaged
 * correctly (the extraction model is multilingual) — the owner just always confirms
 * before anything is dispatched, since this path skips the English flow's slot-by-slot
 * verification.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);

  if (!validateTwilioWebhook(request, rawBody)) {
    return twimlXml(
      twimlResponse(twimlSay("Lo sentimos, ocurrió un error. Adiós.", "es-US")),
    );
  }

  const form = new URLSearchParams(rawBody);
  const speech = form.get("SpeechResult")?.trim() ?? "";
  const from = form.get("From") ?? "";
  const to = form.get("To") ?? "";
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const attempt = Number(url.searchParams.get("attempt") ?? "1");

  if (!speech) {
    if (attempt < 2) {
      const retryUrl = `${url.origin}${url.pathname}?callSid=${encodeURIComponent(callSid)}&attempt=${attempt + 1}`;
      return twimlXml(twimlResponse(twimlGatherSpanishIntake(retryUrl)));
    }
    return twimlXml(
      twimlResponse(
        twimlSay(
          "No pudimos escuchar los detalles. Por favor llame de nuevo. Adiós.",
          "es-US",
        ),
      ),
    );
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    return twimlXml(
      twimlResponse(twimlSay("Lo sentimos, ocurrió un error. Adiós.", "es-US")),
    );
  }

  try {
    const vertical = await getShopVertical(userId);
    const { draft: extracted, confidence } = await extractIntakeFromSpeechForVertical(
      vertical,
      speech,
      null,
    );
    const draft = await applyPriorityAnalysisToDraft(speech, extracted, null);

    const callLogId = crypto.randomUUID();
    await addCallLog({
      id: callLogId,
      userId,
      from,
      to,
      transcript: speech,
      priority: draft.priority,
      servicePriority: draft.servicePriority,
      priorityReasons: draft.priorityReasons,
      prioritySource: draft.prioritySource,
      symptom: draft.symptom,
      customerName: draft.customerName,
      address: draft.address,
      serviceLocation: draft.serviceLocation,
      issueType: draft.issueType,
      arrivalWindow: draft.arrivalWindow,
      callSid,
      callbackPhone: from,
      confidence,
      verificationComplete: false,
      intakeChannel: "phone",
      lossCategory: draft.lossCategory,
      insuranceCarrier: draft.insuranceCarrier,
      insuranceClaimNumber: draft.insuranceClaimNumber,
      waterSource: draft.waterSource,
      activeLoss: draft.activeLoss,
      severity: draft.severity,
      lastServiceYear: draft.lastServiceYear,
      urgency: draft.urgency,
      dispatchNotes: draft.dispatchNotes,
      jobberPasteBlock: draft.jobberPasteBlock,
      createdAt: new Date().toISOString(),
    });

    await addJobRecord(userId, {
      priority: draft.priority,
      servicePriority: draft.servicePriority,
      priorityReasons: draft.priorityReasons,
      prioritySource: draft.prioritySource,
      symptom: draft.symptom,
      customerName: draft.customerName,
      address: draft.address,
      arrivalWindow: draft.arrivalWindow,
      status: initialRequestStatusAfterIntake(),
      sourceCallId: callLogId,
    });

    try {
      await notifyOwnerNewRequest({
        userId,
        bookingId: `call-${callLogId}`,
        customerName: draft.customerName,
        issueType: draft.issueType,
        symptom: draft.symptom,
        priority: draft.priority,
        cityState: formatCityState(draft.address),
        ambiguous: true,
        customerPhone: from,
      });
    } catch (e) {
      console.warn("[twilio/es-intake] owner notify", e);
    }

    try {
      await notifyCustomerRequestReceivedEs({
        userId,
        bookingId: `call-${callLogId}`,
        phone: from,
      });
    } catch (e) {
      console.warn("[twilio/es-intake] customer notify", e);
    }

    void notifyZapierNewRequest({
      userId,
      bookingId: `call-${callLogId}`,
      customerName: draft.customerName,
      phone: from,
      issueType: draft.issueType,
      symptom: draft.symptom,
      address: draft.address,
      priority: draft.priority,
      createdAt: new Date().toISOString(),
    });

    return twimlXml(twimlResponse(twimlSpanishIntakeConfirmation()));
  } catch (e) {
    await logOperationFailure({
      userId,
      category: "ai",
      operation: "esIntake",
      message: e instanceof Error ? e.message : "Spanish intake failed",
      retryable: true,
      callSid,
    });
    return twimlXml(
      twimlResponse(
        twimlSay(
          "Recibimos su llamada, pero tuvimos un problema técnico. Alguien le llamará pronto. Adiós.",
          "es-US",
        ),
      ),
    );
  }
}
