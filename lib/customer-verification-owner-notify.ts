import { findUserById } from "./users-db";
import { resolveShopDisplayName } from "./link-intake-brand";
import { sendSms } from "./send-sms";
import { markSmsSent, shouldSendSmsOnce } from "./sms-dedupe";
import type { JobPriority } from "./types";
import {
  notifyOwnerCustomerCorrectionEmail,
  notifyOwnerCustomerVerifiedEmail,
} from "./owner-email-notify";
import {
  reportOwnerPhoneMisconfigured,
  resolveOwnerAlertPhone,
} from "./owner-alert-phone";

async function sendOwnerAlert(params: {
  userId: string;
  bookingId: string;
  body: string;
  dedupeId: string;
  operation: string;
}): Promise<void> {
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) {
    await reportOwnerPhoneMisconfigured({
      userId: params.userId,
      operation: params.operation,
      bookingId: params.bookingId,
    });
    console.warn(
      `[owner-sms] skip ${params.operation} — shop US phone missing (booking ${params.bookingId})`,
    );
    return;
  }

  const allowed = await shouldSendSmsOnce(params.userId, params.dedupeId);
  if (!allowed) return;

  const result = await sendSms(ownerPhone, params.body, params.operation, {
    context: {
      userId: params.userId,
      operation: params.operation,
      bookingId: params.bookingId,
    },
  });
  if (result.ok) {
    await markSmsSent(params.userId, params.dedupeId);
  }
}

export function smsOwnerCustomerVerifiedBody(params: {
  shopName?: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = params.customerName?.trim() || "Customer";
  const issue = params.issueType?.trim() || "Service request";
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? ` · ${params.cityState}`
      : "";
  const addr = params.address?.trim() ? `\nAddress: ${params.address}` : "";
  const tag = params.priority === "P1" ? "URGENT" : params.priority;
  return (
    `${shop}: Customer confirmed phone intake (YES · ${tag}).\n` +
    `${name} — ${issue}${place}${addr}\n` +
    `Reply 1=Approve, 2=Reject when ready.`
  );
}

export function smsOwnerCustomerCorrectionBody(params: {
  shopName?: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = params.customerName?.trim() || "Customer";
  const issue = params.issueType?.trim() || "Service request";
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? ` · ${params.cityState}`
      : "";
  const addr = params.address?.trim() ? `\nAddress: ${params.address}` : "";
  const tag = params.priority === "P1" ? "URGENT" : params.priority;
  return (
    `${shop}: Customer corrected phone intake (NO · ${tag}).\n` +
    `${name} — ${issue}${place}${addr}\n` +
    `Reply 1=Approve, 2=Reject when ready.`
  );
}

export async function notifyOwnerCustomerVerified(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const body = smsOwnerCustomerVerifiedBody({
    shopName: user?.shopName,
    ...params,
  });
  await sendOwnerAlert({
    userId: params.userId,
    bookingId: params.bookingId,
    body,
    dedupeId: `${params.bookingId}:customer_verified_yes`,
    operation: "owner_customer_verified_yes",
  });

  try {
    await notifyOwnerCustomerVerifiedEmail(params);
  } catch (e) {
    console.warn("[owner-sms] owner verified email", e);
  }
}

export async function notifyOwnerCustomerCorrection(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const body = smsOwnerCustomerCorrectionBody({
    shopName: user?.shopName,
    ...params,
  });
  await sendOwnerAlert({
    userId: params.userId,
    bookingId: params.bookingId,
    body,
    dedupeId: `${params.bookingId}:customer_correction:${Date.now()}`,
    operation: "owner_customer_correction",
  });

  try {
    await notifyOwnerCustomerCorrectionEmail(params);
  } catch (e) {
    console.warn("[owner-sms] owner correction email", e);
  }
}
