import { hasCustomerMarketingSmsConsent } from "./customer-marketing-consent";
import type { RequestStatus } from "./booking-policy";
import { resolveBookingCustomerPhone } from "./booking-contact";
import { extractIssueType } from "./recent-bookings";
import { sendSms, type SmsSendContext } from "./send-sms";
import { markSmsSent, shouldSendSmsOnce } from "./sms-dedupe";
import type { JobPriority } from "./types";
import { bookingShortRef } from "./booking-ref";
import { setSmsReplyTarget } from "./sms-reply-context";
import { findUserById } from "./users-db";
import { getShopProfile } from "./shop-profile-db";
import { resolveShopDisplayName } from "./link-intake-brand";
import { notifyOwnerNewRequestEmail } from "./owner-email-notify";
import {
  reportOwnerPhoneMisconfigured,
  resolveOwnerAlertPhone,
} from "./owner-alert-phone";
import { withPracticeSmsPrefix } from "./practice-sms";
import { getShopBookingSettings } from "./shop-settings-db";
import { isPracticeMode } from "./data-truthfulness";

import {
  smsAfterHoursCustomerBody,
  smsCustomerApprovedBody,
  smsCustomerQuoteFollowUpBody,
  smsCustomerRejectedBody,
  smsCustomerReviewRequestBody,
  smsOwnerIntakeAutoConfirmedBody,
  smsOwnerNewRequestBody as tplOwnerNewRequestBody,
  smsRequestReceivedBody,
  smsRequestReceivedEsBody,
} from "./sms-templates";

export { smsRequestReceivedBody, smsCustomerApprovedBody as smsApprovedBody, smsCustomerRejectedBody as smsRejectedBody };

export function smsOwnerEmergencyBody(params: {
  shopName?: string;
  customerName: string;
  symptom?: string;
}): string {
  const detail = params.symptom?.trim() || "Emergency (P1)";
  return `Effiroad P1: ${detail} — ${params.customerName || "Caller"}. Open your dashboard to review. (${resolveShopDisplayName(params.shopName)})`;
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
  customerPhone?: string;
}): string {
  const ref = bookingShortRef(params.bookingId);
  const issue =
    params.issueType?.trim() ||
    extractIssueType(params.symptom ?? "", "Service request");
  return tplOwnerNewRequestBody({
    shopName: params.shopName,
    ref,
    customerName: params.customerName,
    issue,
    priority: params.priority,
    cityState: params.cityState,
    ambiguous: params.ambiguous,
    customerPhone: params.customerPhone,
  });
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
  practiceMode?: boolean;
}): Promise<void> {
  const allowed = await shouldSendSmsOnce(params.userId, params.dedupeId);
  if (!allowed) return;

  let practiceMode = params.practiceMode;
  if (practiceMode === undefined) {
    const settings = await getShopBookingSettings(params.userId);
    practiceMode = isPracticeMode(settings);
  }
  const body = withPracticeSmsPrefix(params.body, practiceMode === true);

  const result = await sendSms(params.phone, body, params.operation, {
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
    ? smsAfterHoursCustomerBody(user?.shopName)
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

/** Spanish counterpart of notifyCustomerRequestReceived — used by the Spanish phone intake path. */
export async function notifyCustomerRequestReceivedEs(params: {
  userId: string;
  bookingId: string;
  phone: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  await sendCustomerSms({
    userId: params.userId,
    phone: params.phone,
    body: smsRequestReceivedEsBody(user?.shopName),
    dedupeId: `${params.bookingId}:request_received`,
    operation: "customer_request_received_es",
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
    body: smsCustomerApprovedBody(user?.shopName),
    dedupeId: `${params.bookingId}:approved`,
    operation: "customer_approved",
    bookingId: params.bookingId,
  });
}

/** SMS to customer asking for a review once a job is marked completed. No-ops if the shop hasn't configured a review link. */
export async function notifyCustomerReviewRequest(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
}): Promise<void> {
  const profile = await getShopProfile(params.userId);
  const reviewUrl = profile.googleReviewUrl?.trim();
  if (!reviewUrl) return;

  const phone =
    params.phone?.trim() ||
    (await resolveBookingCustomerPhone(params.userId, params.bookingId));
  if (!phone) {
    console.info(
      `[customer-sms] skip review_request — no phone for ${params.bookingId}`,
    );
    return;
  }

  if (!(await hasCustomerMarketingSmsConsent(params.userId, params.bookingId))) {
    console.info(
      `[customer-sms] skip review_request — no marketing SMS consent for ${params.bookingId}`,
    );
    return;
  }

  const user = await findUserById(params.userId);
  await sendCustomerSms({
    userId: params.userId,
    phone,
    body: smsCustomerReviewRequestBody({ shopName: user?.shopName, reviewUrl }),
    dedupeId: `${params.bookingId}:review_request`,
    operation: "customer_review_request",
    bookingId: params.bookingId,
  });
}

export async function notifyCustomerQuoteFollowUp(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
  amountCents: number;
}): Promise<void> {
  const phone =
    params.phone?.trim() ||
    (await resolveBookingCustomerPhone(params.userId, params.bookingId));
  if (!phone) {
    console.info(
      `[customer-sms] skip quote_follow_up — no phone for ${params.bookingId}`,
    );
    return;
  }

  if (!(await hasCustomerMarketingSmsConsent(params.userId, params.bookingId))) {
    console.info(
      `[customer-sms] skip quote_follow_up — no marketing SMS consent for ${params.bookingId}`,
    );
    return;
  }

  const user = await findUserById(params.userId);
  await sendCustomerSms({
    userId: params.userId,
    phone,
    body: smsCustomerQuoteFollowUpBody({
      shopName: user?.shopName,
      amountCents: params.amountCents,
    }),
    dedupeId: `${params.bookingId}:quote_follow_up`,
    operation: "customer_quote_follow_up",
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
    body: smsCustomerRejectedBody(user?.shopName),
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
  customerPhone?: string;
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
      customerPhone: params.customerPhone,
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
  autoWaterDispatch?: boolean;
  undoMinutes: number;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) return;

  const ref = bookingShortRef(params.bookingId);
  const issue =
    params.issueType?.trim() ||
    extractIssueType(params.symptom ?? "", "Service request");
  const body = smsOwnerIntakeAutoConfirmedBody({
    shopName: user?.shopName,
    customerName: params.customerName,
    issue,
    ref,
    urgent: params.urgent,
    autoWaterDispatch: params.autoWaterDispatch,
    undoMinutes: params.undoMinutes,
  });

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
