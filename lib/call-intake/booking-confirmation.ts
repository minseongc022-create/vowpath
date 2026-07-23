import { buildBookingPortalUrl } from "../portal-url";
import { resolveShopDisplayName } from "../link-intake-brand";
import { formatLinkRequestNumber } from "../link-intake-urgency";
import { sendSms } from "../send-sms";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import { findUserById } from "../users-db";
import { smsCustomerBookingConfirmationBody } from "../sms-templates";
import { withPracticeSmsPrefix } from "../practice-sms";
import { getShopBookingSettings } from "../shop-settings-db";
import { isPracticeMode } from "../data-truthfulness";
import { savePortalTokenOnCall } from "../customer-booking-portal";
import {
  saveLinkIntakeSession,
  type LinkIntakeSession,
} from "./link-intake-store";

const REVIEW_LINK_TTL_MS = 14 * 86_400_000;

export { buildBookingPortalUrl as buildIntakeReviewUrl };

export async function createBookingReviewLinkSession(params: {
  userId: string;
  callSid: string;
  from: string;
  to: string;
  shopName?: string;
  bookingId: string;
  callId: string;
  customerPhone: string;
  customerName: string;
}): Promise<LinkIntakeSession> {
  const token = crypto.randomUUID().replace(/-/g, "");
  const now = new Date();
  const session: LinkIntakeSession = {
    token,
    userId: params.userId,
    callSid: params.callSid,
    from: params.from,
    to: params.to,
    menuPriority: null,
    shopName: params.shopName,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + REVIEW_LINK_TTL_MS).toISOString(),
    usedAt: now.toISOString(),
    bookingId: params.bookingId,
    callId: params.callId,
    customerPhone: params.customerPhone,
    customerName: params.customerName,
  };
  await saveLinkIntakeSession(session);
  await savePortalTokenOnCall(params.userId, params.callId, token);
  return session;
}

export async function sendIntakeBookingConfirmation(params: {
  userId: string;
  bookingId: string;
  callLogId: string;
  customerPhone: string;
  customerName: string;
  issueType: string;
  arrivalWindow?: string;
  reviewToken: string;
  pendingShopReview?: boolean;
  needsPickTime?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const phone = params.customerPhone?.trim();
  if (!phone) return { ok: false, error: "no_phone" };

  const user = await findUserById(params.userId);
  const settings = await getShopBookingSettings(params.userId);
  const practiceMode = isPracticeMode(settings);
  const portalUrl = buildBookingPortalUrl(params.reviewToken);
  let body = smsCustomerBookingConfirmationBody({
    shopName: user?.shopName ?? "",
    requestNumber: formatLinkRequestNumber(params.callLogId),
    customerName: params.customerName,
    issueType: params.issueType,
    arrivalWindow: params.arrivalWindow,
    portalUrl,
    pendingShopReview: params.pendingShopReview,
    needsPickTime: Boolean(params.needsPickTime),
  });
  body = withPracticeSmsPrefix(body, practiceMode);

  const dedupeId = `${params.bookingId}:booking_confirmation`;
  if (!(await shouldSendSmsOnce(params.userId, dedupeId))) {
    return { ok: true };
  }

  const result = await sendSms(phone, body, "customer_booking_confirmation", {
    usRecipientsOnly: false,
    context: {
      userId: params.userId,
      operation: "customer_booking_confirmation",
      bookingId: params.bookingId,
    },
  });
  if (!result.ok) return { ok: false, error: result.error };
  await markSmsSent(params.userId, dedupeId);
  return { ok: true };
}
