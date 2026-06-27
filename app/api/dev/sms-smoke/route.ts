import { NextResponse } from "next/server";
import {
  notifyCustomerRequestReceived,
  notifyCustomerApproved,
  notifyCustomerRejected,
  notifyOwnerIntakeAutoConfirmed,
  notifyOwnerNewRequest,
} from "@/lib/customer-sms";
import { sendIntakeBookingConfirmation, createBookingReviewLinkSession } from "@/lib/call-intake/booking-confirmation";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import {
  notifyCustomerIntakeAck,
  notifyCustomerNoSlot,
  notifyCustomerScheduled,
  notifyOwnerApprovalNeeded,
  notifyOwnerNoSlot,
  notifyOwnerScheduledFyi,
  notifyOwnerShadowResult,
  notifyOwnerUrgentAutoBooked,
} from "@/lib/scheduling/schedule-sms";
import { customerVerificationSmsBody } from "@/lib/customer-verification/sms-copy";
import { sendSignupCodeSms } from "@/lib/send-verification-code";
import { smsCustomerOnMyWayBody, smsTechDispatchOfferBody } from "@/lib/sms-templates";
import { getSession } from "@/lib/session";
import { sendSms, smsDevPreviewEnabled } from "@/lib/send-sms";
import { findUserById } from "@/lib/users-db";

type FlowId =
  | "customer_intake_ack"
  | "customer_scheduled"
  | "customer_no_slot"
  | "customer_approved"
  | "customer_rejected"
  | "owner_scheduled_fyi"
  | "owner_approval_needed"
  | "owner_urgent_auto_booked"
  | "owner_no_slot"
  | "owner_shadow"
  | "customer_booking_confirmation"
  | "owner_new_request"
  | "link_intake"
  | "customer_verification"
  | "signup_verification"
  | "tech_dispatch_offer"
  | "customer_on_my_way";

const TEST_BOOKING = `dev-sms-smoke-${Date.now()}`;
const TEST_CALL = "dev-sms-smoke-call";
const TEST_PHONE = "+15125550199";

async function runFlow(
  userId: string,
  flow: FlowId,
  targetPhone?: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await findUserById(userId);
  const shopName = user?.shopName ?? "Your restoration team";
  const phone = targetPhone ?? TEST_PHONE;
  const sampleName = user?.shopName?.includes("Dev") ? "Test Caller" : "Customer";
  const sampleIssue = "AC not cooling";
  const sampleWindow = "Tomorrow 9-11 AM";
  const sampleAddress = "Service address on file";

  try {
    switch (flow) {
      case "customer_intake_ack":
        await notifyCustomerIntakeAck({
          userId,
          bookingId: TEST_BOOKING,
          phone,
          issue: "AC not cooling",
        });
        break;
      case "customer_scheduled":
        await notifyCustomerScheduled({
          userId,
          bookingId: TEST_BOOKING,
          phone,
          window: "Tomorrow 9–11 AM",
          address: sampleAddress,
          priority: "P2",
        });
        break;
      case "customer_no_slot":
        await notifyCustomerNoSlot({
          userId,
          bookingId: TEST_BOOKING,
          phone,
        });
        break;
      case "customer_approved":
        await notifyCustomerApproved({
          userId,
          bookingId: TEST_BOOKING,
          phone,
        });
        break;
      case "customer_rejected":
        await notifyCustomerRejected({
          userId,
          bookingId: TEST_BOOKING,
          phone,
        });
        break;
      case "owner_scheduled_fyi":
        await notifyOwnerScheduledFyi({
          userId,
          bookingId: TEST_BOOKING,
          customerName: sampleName,
          issue: "No cool",
          window: "Tomorrow 9–11 AM",
          undoMinutes: 15,
        });
        break;
      case "owner_approval_needed":
        await notifyOwnerApprovalNeeded({
          userId,
          bookingId: TEST_BOOKING,
          customerName: sampleName,
          issue: sampleIssue,
          window: sampleWindow,
          priority: "P1",
        });
        break;
      case "owner_urgent_auto_booked":
        await notifyOwnerUrgentAutoBooked({
          userId,
          bookingId: TEST_BOOKING,
          customerName: sampleName,
          issue: sampleIssue,
          window: sampleWindow,
          undoMinutes: 15,
        });
        break;
      case "owner_no_slot":
        await notifyOwnerNoSlot({
          userId,
          bookingId: TEST_BOOKING,
          customerName: sampleName,
          issue: "Maintenance",
        });
        break;
      case "owner_shadow":
        await notifyOwnerShadowResult({
          userId,
          bookingId: TEST_BOOKING,
          window: "Tomorrow 9–11 AM",
          customerName: sampleName,
          shadowLeft: 5,
        });
        break;
      case "customer_booking_confirmation": {
        const reviewSession = await createBookingReviewLinkSession({
          userId,
          bookingId: TEST_BOOKING,
          callId: TEST_CALL,
          callSid: TEST_CALL,
          from: phone,
          to: "+12255550100",
          shopName,
          customerPhone: phone,
          customerName: sampleName,
        });
        await sendIntakeBookingConfirmation({
          userId,
          bookingId: TEST_BOOKING,
          callLogId: TEST_CALL,
          customerPhone: phone,
          customerName: sampleName,
          issueType: sampleIssue,
          arrivalWindow: sampleWindow,
          reviewToken: reviewSession.token,
          pendingShopReview: true,
        });
        break;
      }
      case "owner_new_request":
        await notifyOwnerNewRequest({
          userId,
          bookingId: TEST_BOOKING,
          customerName: sampleName,
          issueType: sampleIssue,
          symptom: sampleIssue,
          priority: "P2",
          cityState: "Austin, TX",
          address: sampleAddress,
        });
        await notifyCustomerRequestReceived({
          userId,
          bookingId: TEST_BOOKING,
          phone,
          afterHours: true,
        });
        await notifyOwnerIntakeAutoConfirmed({
          userId,
          bookingId: TEST_BOOKING,
          customerName: sampleName,
          issueType: "Maintenance",
          symptom: "Filter change",
          priority: "P3",
          cityState: "Austin, TX",
          urgent: false,
        });
        break;
      case "link_intake": {
        const session = await createLinkIntakeSession({
          userId,
          callSid: TEST_CALL,
          from: phone,
          to: "+12255550100",
          shopName,
          menuPriority: "P2",
        });
        const sent = await sendLinkIntakeSms({
          userId,
          phone,
          token: session.token,
        });
        if (!sent.ok) return { ok: false, error: sent.error ?? "link_intake failed" };
        break;
      }
      case "customer_verification": {
        const body = customerVerificationSmsBody({
          shopName,
          address: sampleAddress,
          issueType: "AC not cooling",
        });
        const result = await sendSms(phone, body, "customer_verification", {
          context: { userId, operation: "customer_verification", bookingId: TEST_BOOKING },
        });
        if (!result.ok) return { ok: false, error: result.error ?? "verification sms failed" };
        break;
      }
      case "signup_verification": {
        const result = await sendSignupCodeSms(phone, "123456", { allowKrRecipient: true });
        if (!result.ok) return { ok: false, error: result.error ?? "signup sms failed" };
        break;
      }
      case "tech_dispatch_offer": {
        const body = smsTechDispatchOfferBody({
          shopName,
          customerName: sampleName,
          issue: sampleIssue,
          window: sampleWindow,
          ref: "A3F2",
        });
        const result = await sendSms(phone, body, "tech_dispatch_offer", {
          context: { userId, operation: "tech_dispatch_offer", bookingId: TEST_BOOKING },
        });
        if (!result.ok) return { ok: false, error: result.error ?? "tech dispatch sms failed" };
        break;
      }
      case "customer_on_my_way": {
        const previewBody = smsCustomerOnMyWayBody({
          shopName,
          customerName: sampleName,
          techName: "Mike",
          etaMinutes: 30,
        });
        const result = await sendSms(phone, previewBody, "customer-on-my-way", {
          context: { userId, operation: "customer_on_my_way", bookingId: TEST_BOOKING },
        });
        if (!result.ok) return { ok: false, error: result.error ?? "on my way sms failed" };
        break;
      }
      default:
        return { ok: false, error: "unknown flow" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Dev-only: fire each SMS notification template once (dedupe keys scoped to smoke booking). */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let flows: FlowId[] = [];
  let forceLive = false;
  let targetPhone: string | undefined;
  try {
    const body = await request.json();
    if (Array.isArray(body?.flows)) {
      flows = body.flows.filter((f: string) => typeof f === "string") as FlowId[];
    }
    forceLive = body?.live === true;
    if (typeof body?.targetPhone === "string" && body.targetPhone.trim()) {
      targetPhone = body.targetPhone.trim();
    }
  } catch {
    /* all flows */
  }

  const prevPreview = process.env.SMS_DEV_PREVIEW;
  if (forceLive) process.env.SMS_DEV_PREVIEW = "0";

  const allFlows: FlowId[] = [
    "customer_intake_ack",
    "customer_scheduled",
    "customer_no_slot",
    "customer_approved",
    "customer_rejected",
    "owner_scheduled_fyi",
    "owner_approval_needed",
    "owner_urgent_auto_booked",
    "owner_no_slot",
    "owner_shadow",
    "customer_booking_confirmation",
    "owner_new_request",
    "link_intake",
    "customer_verification",
    "signup_verification",
    "tech_dispatch_offer",
    "customer_on_my_way",
  ];

  const toRun = flows.length ? flows : allFlows;
  const preview = forceLive ? false : smsDevPreviewEnabled();
  const results = [];

  try {
    for (const flow of toRun) {
      const out = await runFlow(session.sub, flow, targetPhone);
      results.push({ flow, ...out, preview });
    }
  } finally {
    if (forceLive) {
      if (prevPreview === undefined) delete process.env.SMS_DEV_PREVIEW;
      else process.env.SMS_DEV_PREVIEW = prevPreview;
    }
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    preview,
    shopName: (await findUserById(session.sub))?.shopName,
    results,
  });
}
