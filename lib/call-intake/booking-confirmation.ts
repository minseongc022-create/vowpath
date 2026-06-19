import { getPublicAppUrl } from "../app-url";
import { resolveShopDisplayName } from "../link-intake-brand";
import { formatLinkRequestNumber } from "../link-intake-urgency";
import { sendSms } from "../send-sms";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import { findUserById } from "../users-db";
import {
  saveLinkIntakeSession,
  type LinkIntakeSession,
} from "./link-intake-store";

const REVIEW_LINK_TTL_MS = 14 * 86_400_000;
const SMS_OPT_OUT = " Reply STOP to opt out.";

export function buildIntakeReviewUrl(token: string): string {
  const base = getPublicAppUrl();
  if (!base) return `/intake/${token}`;
  return `${base.replace(/\/$/, "")}/intake/${token}`;
}

export function smsBookingConfirmationBody(params: {
  shopName: string;
  requestNumber: string;
  customerName: string;
  issueType: string;
  arrivalWindow?: string;
  reviewUrl: string;
  pendingShopReview?: boolean;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const lines = [
    `${shop}: Request #${params.requestNumber} received.`,
    `${params.customerName} - ${params.issueType}`,
  ];
  if (params.arrivalWindow?.trim()) {
    lines.push(`Visit window: ${params.arrivalWindow.trim()}`);
  }
  if (params.pendingShopReview) {
    lines.push("Pending shop review - we'll confirm shortly.");
  }
  lines.push(`Review or update details: ${params.reviewUrl}`);
  lines.push(SMS_OPT_OUT.trim());
  return lines.join("\n");
}

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
}): Promise<{ ok: boolean; error?: string }> {
  const phone = params.customerPhone?.trim();
  if (!phone) return { ok: false, error: "no_phone" };

  const user = await findUserById(params.userId);
  const reviewUrl = buildIntakeReviewUrl(params.reviewToken);
  const body = smsBookingConfirmationBody({
    shopName: user?.shopName ?? "",
    requestNumber: formatLinkRequestNumber(params.callLogId),
    customerName: params.customerName,
    issueType: params.issueType,
    arrivalWindow: params.arrivalWindow,
    reviewUrl,
    pendingShopReview: params.pendingShopReview,
  });

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
