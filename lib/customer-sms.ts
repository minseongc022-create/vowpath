import type { RequestStatus } from "./booking-policy";
import { resolveBookingCustomerPhone } from "./booking-contact";
import { extractIssueType } from "./recent-bookings";
import { sendSms, type SmsSendContext } from "./send-sms";
import { markSmsSent, shouldSendSmsOnce } from "./sms-dedupe";
import type { JobPriority } from "./types";
import { afterHoursCustomerSmsBody } from "./after-hours-intake";
import { bookingShortRef } from "./booking-ref";
import { setSmsReplyTarget } from "./sms-reply-context";
import { findUserById } from "./users-db";
import { resolveShopDisplayName } from "./link-intake-brand";
import { notifyOwnerNewRequestEmail } from "./owner-email-notify";
import {
  reportOwnerPhoneMisconfigured,
  resolveOwnerAlertPhone,
} from "./owner-alert-phone";

function shopLabel(shopName: string | undefined): string {
  const name = shopName?.trim();
  return name && name.length > 0 ? name : "Your HVAC team";
}

const SMS_OPT_OUT = " Reply STOP to opt out.";

export function smsRequestReceivedBody(shopName?: string): string {
  return (
    `${shopLabel(shopName)}: We received your service request. Our team will review it and contact you shortly. This is not a confirmed appointment.` +
    SMS_OPT_OUT
  );
}

export function smsApprovedBody(shopName?: string): string {
  return (
    `${shopLabel(shopName)}: Your service request is confirmed. ` +
    `We will contact you shortly to schedule your visit.` +
    SMS_OPT_OUT
  );
}

export function smsRejectedBody(shopName?: string): string {
  return (
    `${shopLabel(shopName)}: Your service request was declined. ` +
    `Please call us if you still need service.` +
    SMS_OPT_OUT
  );
}

export function smsOwnerEmergencyBody(params: {
  shopName?: string;
  customerName: string;
  symptom?: string;
}): string {
  const detail = params.symptom?.trim() || "Emergency (P1)";
  return `Vowpath P1: ${detail} — ${params.customerName || "Caller"}. Open your dashboard to review. (${shopLabel(params.shopName)})`;
}

/** SMS to shop owner when a new service request is created (Twilio outbound). */
export function smsOwnerNewRequestBody(params: {
  shopName?: string;
  bookingId: string;
  customerName: string;
  issueType?: string;
  symptom?: string;
  priority: JobPriority;
  cityState?: string;
  ambiguous?: boolean;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = params.customerName?.trim() || "Caller";
  const ref = bookingShortRef(params.bookingId);
  const issue =
    params.issueType?.trim() ||
    extractIssueType(params.symptom ?? "", "Service request");
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? ` · ${params.cityState}`
      : "";
  const replyHint = params.ambiguous
    ? ` Ref ${ref}. Unclear details — reply 1 ${ref}=Confirm, 2 ${ref}=Pass.`
    : ` Ref ${ref}. Reply 1 ${ref}=Approve, 2 ${ref}=Reject.`;
  if (params.priority === "P1") {
    return `${shop} URGENT (P1): ${name} — ${issue}${place}. Pending.${replyHint}`;
  }
  const tag = params.priority === "P2" ? "P2" : "P3";
  return `${shop}: New request (${tag}) — ${name}, ${issue}${place}. Pending.${replyHint}`;
}

function smsContext(
  userId: string,
  operation: string,
  bookingId?: string,
): SmsSendContext {
  return { userId, operation, bookingId };
}

async function sendOwnerSms(params: {
  userId: string;
  phone: string;
  body: string;
  dedupeId: string;
  operation: string;
  bookingId?: string;
}): Promise<void> {
  const allowed = await shouldSendSmsOnce(params.userId, params.dedupeId);
  if (!allowed) return;

  const result = await sendSms(params.phone, params.body, params.operation, {
    context: smsContext(params.userId, params.operation, params.bookingId),
  });
  if (result.ok) {
    await markSmsSent(params.userId, params.dedupeId);
  }
}

async function sendCustomerSms(params: {
  userId: string;
  phone: string;
  body: string;
  dedupeId: string;
  operation: string;
  bookingId?: string;
}): Promise<void> {
  const allowed = await shouldSendSmsOnce(params.userId, params.dedupeId);
  if (!allowed) return;

  const result = await sendSms(params.phone, params.body, params.operation, {
    context: smsContext(params.userId, params.operation, params.bookingId),
  });
  if (result.ok) {
    await markSmsSent(params.userId, params.dedupeId);
  }
}

export async function notifyCustomerRequestReceived(params: {
  userId: string;
  bookingId: string;
  phone: string;
  afterHours?: boolean;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const body = params.afterHours
    ? afterHoursCustomerSmsBody(user?.shopName)
    : smsRequestReceivedBody(user?.shopName);
  await sendCustomerSms({
    userId: params.userId,
    phone: params.phone,
    body,
    dedupeId: `${params.bookingId}:request_received`,
    operation: "customer_request_received",
    bookingId: params.bookingId,
  });
}

/** SMS to customer when shop approves the service request. */
export async function notifyCustomerApproved(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
}): Promise<void> {
  const phone =
    params.phone?.trim() ||
    (await resolveBookingCustomerPhone(params.userId, params.bookingId));
  if (!phone) {
    console.info(
      `[customer-sms] skip customer_approved — no phone for ${params.bookingId}`,
    );
    return;
  }

  const user = await findUserById(params.userId);
  await sendCustomerSms({
    userId: params.userId,
    phone,
    body: smsApprovedBody(user?.shopName),
    dedupeId: `${params.bookingId}:approved`,
    operation: "customer_approved",
    bookingId: params.bookingId,
  });
}

export async function notifyCustomerRejected(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
}): Promise<void> {
  const phone =
    params.phone?.trim() ||
    (await resolveBookingCustomerPhone(params.userId, params.bookingId));
  if (!phone) {
    console.info(
      `[customer-sms] skip customer_rejected — no phone for ${params.bookingId}`,
    );
    return;
  }

  const user = await findUserById(params.userId);
  await sendCustomerSms({
    userId: params.userId,
    phone,
    body: smsRejectedBody(user?.shopName),
    dedupeId: `${params.bookingId}:rejected`,
    operation: "customer_rejected",
    bookingId: params.bookingId,
  });
}

export async function notifyCustomerStatusChange(params: {
  userId: string;
  bookingId: string;
  status: RequestStatus;
  phone?: string | null;
}): Promise<void> {
  if (params.status === "approved") {
    await notifyCustomerApproved(params);
    return;
  }
  if (params.status === "rejected") {
    await notifyCustomerRejected(params);
  }
}

/** Notify shop owner on every new service request (intake complete). */
export async function notifyOwnerNewRequest(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType?: string;
  symptom?: string;
  priority: JobPriority;
  cityState?: string;
  address?: string;
  ambiguous?: boolean;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);

  if (ownerPhone) {
    await setSmsReplyTarget(params.userId, params.bookingId);

    const body = smsOwnerNewRequestBody({
      shopName: user?.shopName,
      bookingId: params.bookingId,
      customerName: params.customerName,
      issueType: params.issueType,
      symptom: params.symptom,
      priority: params.priority,
      cityState: params.cityState,
      ambiguous: params.ambiguous,
    });

    await sendOwnerSms({
      userId: params.userId,
      phone: ownerPhone,
      body,
      dedupeId: `${params.bookingId}:owner_new_request`,
      operation: "owner_new_request",
      bookingId: params.bookingId,
    });
  } else {
    await reportOwnerPhoneMisconfigured({
      userId: params.userId,
      operation: "owner_new_request",
      bookingId: params.bookingId,
    });
    console.warn(
      `[owner-sms] skip owner_new_request — shop US phone missing (booking ${params.bookingId})`,
    );
  }

  try {
    await notifyOwnerNewRequestEmail({
      userId: params.userId,
      bookingId: params.bookingId,
      customerName: params.customerName,
      issueType: params.issueType,
      symptom: params.symptom,
      priority: params.priority,
      cityState: params.cityState,
      address: params.address,
    });
  } catch (e) {
    console.warn("[customer-sms] owner new request email", e);
  }
}

/** Owner FYI when intake auto-confirms without scheduling (speed / clear details). */
export async function notifyOwnerIntakeAutoConfirmed(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType?: string;
  symptom?: string;
  priority: JobPriority;
  cityState?: string;
  urgent?: boolean;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) return;

  const shop = resolveShopDisplayName(user?.shopName);
  const name = params.customerName?.trim() || "Caller";
  const issue =
    params.issueType?.trim() ||
    extractIssueType(params.symptom ?? "", "Service request");
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? ` · ${params.cityState}`
      : "";
  const ref = bookingShortRef(params.bookingId);
  const body = params.urgent
    ? `${shop} P1 URGENT — confirmed: ${name}, ${issue}${place}. Crew notified if enabled. Ref ${ref}. Reply 2 ${ref}=Cancel.`
    : `${shop}: Confirmed — ${name}, ${issue}${place}. Jobber synced if connected. Ref ${ref}. Reply 2 ${ref}=Cancel.`;

  await sendOwnerSms({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:owner_intake_auto`,
    operation: params.urgent ? "owner_intake_urgent_auto" : "owner_intake_auto",
    bookingId: params.bookingId,
  });
}

/** @deprecated Use notifyOwnerNewRequest — kept for callers that only reference P1. */
export async function notifyOwnerEmergencyP1(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  symptom?: string;
}): Promise<void> {
  await notifyOwnerNewRequest({
    userId: params.userId,
    bookingId: params.bookingId,
    customerName: params.customerName,
    symptom: params.symptom,
    priority: "P1",
  });
}
