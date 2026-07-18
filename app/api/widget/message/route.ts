import { NextResponse } from "next/server";
import { addCallLog } from "@/lib/call-logs";
import { addJobRecord } from "@/lib/jobs-db";
import { extractIntakeFromSpeechForVertical } from "@/lib/call-intake/extraction";
import { applyPriorityAnalysisToDraft } from "@/lib/apply-service-priority";
import { getShopVertical } from "@/lib/vertical-context.js";
import { findUserById } from "@/lib/users-db";
import { notifyOwnerNewRequest } from "@/lib/customer-sms";
import { notifyZapierNewRequest } from "@/lib/zapier-webhook";
import { formatCityState } from "@/lib/recent-bookings";
import { initialRequestStatusAfterIntake } from "@/lib/booking-policy";
import {
  WIDGET_HOURLY_WINDOW_SEC,
  WIDGET_MESSAGE_HOURLY_LIMIT,
  WIDGET_TENANT_HOURLY_LIMIT,
} from "@/lib/security/ai-limits";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
} from "@/lib/security/rate-limit";

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Public, unauthenticated — this is what the embeddable website chat widget calls.
 * Always lands as pending_review (no auto-dispatch): unlike a phone call there's no
 * caller ID to trust, so a typed contact phone can't be verified the way SMS/voice can.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = String(body?.userId ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const contactPhone = String(body?.contactPhone ?? "").trim();

    if (!userId || !message || !contactPhone) {
      return NextResponse.json(
        { error: "Message and a callback phone number are required." },
        { status: 400 },
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Widget not found." }, { status: 404 });
    }

    const ip = clientIpFromRequest(request);
    const limited = await checkRateLimit({
      key: rateLimitKey("widget-message", `${userId}:${ip}`),
      limit: WIDGET_MESSAGE_HOURLY_LIMIT,
      windowSeconds: WIDGET_HOURLY_WINDOW_SEC,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many messages — please try again in a bit." },
        { status: 429 },
      );
    }

    const tenantLimited = await checkRateLimit({
      key: rateLimitKey("widget-message:tenant", userId),
      limit: WIDGET_TENANT_HOURLY_LIMIT,
      windowSeconds: WIDGET_HOURLY_WINDOW_SEC,
    });
    if (!tenantLimited.ok) {
      return NextResponse.json(
        { error: "This shop's chat widget is temporarily unavailable." },
        { status: 429 },
      );
    }

    const vertical = await getShopVertical(userId);
    const { draft: extracted, confidence } = await extractIntakeFromSpeechForVertical(
      vertical,
      message,
      null,
    );
    const draft = await applyPriorityAnalysisToDraft(message, extracted, null);

    const callLogId = crypto.randomUUID();
    await addCallLog({
      id: callLogId,
      userId,
      from: contactPhone,
      to: "webchat",
      transcript: message,
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
      callbackPhone: contactPhone,
      confidence,
      verificationComplete: false,
      intakeChannel: "webchat",
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
        customerPhone: contactPhone,
      });
    } catch (e) {
      console.warn("[widget/message] owner notify", e);
    }

    void notifyZapierNewRequest({
      userId,
      bookingId: `call-${callLogId}`,
      customerName: draft.customerName,
      phone: contactPhone,
      issueType: draft.issueType,
      symptom: draft.symptom,
      address: draft.address,
      priority: draft.priority,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      reply:
        "Got it — thanks! We've received your request and someone will reach out to you shortly.",
    });
  } catch (e) {
    console.error("[widget/message]", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
