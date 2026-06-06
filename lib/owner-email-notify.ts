import { getPublicAppUrl } from "./app-url";
import { resolveShopDisplayName } from "./link-intake-brand";
import { OWNER_EMAIL_BACKUP_NOTE } from "./notification-channels";
import { logOperationFailure } from "./ops-failures";
import { sendEmail, isEmailConfigured } from "./send-email";
import { markSmsSent, shouldSendSmsOnce } from "./sms-dedupe";
import type { JobPriority } from "./types";
import { findUserById } from "./users-db";

function bookingDashboardUrl(bookingId: string): string {
  const base = getPublicAppUrl();
  const path = `/dashboard/bookings/${encodeURIComponent(bookingId)}`;
  return base ? `${base}${path}` : path;
}

async function resolveOwnerEmail(userId: string): Promise<string | null> {
  const user = await findUserById(userId);
  const fromAccount = user?.email?.trim();
  if (fromAccount) return fromAccount;
  return process.env.OWNER_ALERT_EMAIL?.trim() || null;
}

async function sendOwnerEmailAlert(params: {
  userId: string;
  bookingId: string;
  subject: string;
  text: string;
  dedupeId: string;
  operation: string;
}): Promise<void> {
  const to = await resolveOwnerEmail(params.userId);
  if (!to) {
    await logOperationFailure({
      userId: params.userId,
      category: "email",
      operation: params.operation,
      message: "Shop email missing — use account email or OWNER_ALERT_EMAIL",
      retryable: false,
      payload: { bookingId: params.bookingId },
    });
    return;
  }

  const emailDedupeId = `email:${params.dedupeId}`;
  const allowed = await shouldSendSmsOnce(params.userId, emailDedupeId);
  if (!allowed) return;

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[owner-email] ${params.operation} → ${to}\nSubject: ${params.subject}\n${params.text}`,
      );
      await markSmsSent(params.userId, emailDedupeId);
    }
    return;
  }

  const result = await sendEmail({
    to,
    subject: params.subject,
    text: params.text,
    devLogLabel: params.operation,
  });

  if (result.ok) {
    await markSmsSent(params.userId, emailDedupeId);
    return;
  }

  await logOperationFailure({
    userId: params.userId,
    category: "email",
    operation: params.operation,
    message: result.error ?? "Owner email failed",
    retryable: true,
    payload: { bookingId: params.bookingId, to },
  });
}

export async function notifyOwnerNewRequestEmail(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType?: string;
  symptom?: string;
  priority: JobPriority;
  cityState?: string;
  address?: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const issue =
    params.issueType?.trim() ||
    params.symptom?.trim() ||
    "Service request";
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? `\nArea: ${params.cityState}`
      : "";
  const addr = params.address?.trim() ? `\nAddress: ${params.address}` : "";
  const tag = params.priority === "P1" ? "URGENT" : params.priority;

  await sendOwnerEmailAlert({
    userId: params.userId,
    bookingId: params.bookingId,
    subject: `${shop} · New service request (${tag})`,
    text:
      `New service request — ${shop}\n\n` +
      `Customer: ${params.customerName}\n` +
      `Issue: ${issue}${place}${addr}\n` +
      `Priority: ${tag}\n\n` +
      `Reply by SMS: 1 = Approve, 2 = Reject\n` +
      `Or open your dashboard:\n${bookingDashboardUrl(params.bookingId)}\n\n` +
      `${OWNER_EMAIL_BACKUP_NOTE}\n`,
    dedupeId: `${params.bookingId}:owner_new_request`,
    operation: "owner_new_request_email",
  });
}

export async function notifyOwnerCustomerVerifiedEmail(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const tag = params.priority === "P1" ? "URGENT" : params.priority;

  await sendOwnerEmailAlert({
    userId: params.userId,
    bookingId: params.bookingId,
    subject: `${shop} · Customer confirmed (YES)`,
    text:
      `Customer confirmed phone intake details — ${shop}\n\n` +
      `Customer: ${params.customerName}\n` +
      `Issue: ${params.issueType}\n` +
      `Address: ${params.address}\n` +
      `${params.cityState && params.cityState !== "—" ? `Area: ${params.cityState}\n` : ""}` +
      `Priority: ${tag}\n\n` +
      `Reply by SMS when ready: 1 = Approve, 2 = Reject\n` +
      `Dashboard:\n${bookingDashboardUrl(params.bookingId)}\n\n` +
      `${OWNER_EMAIL_BACKUP_NOTE}\n`,
    dedupeId: `${params.bookingId}:customer_verified_yes`,
    operation: "owner_customer_verified_email",
  });
}

export async function notifyOwnerCustomerCorrectionEmail(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const tag = params.priority === "P1" ? "URGENT" : params.priority;

  await sendOwnerEmailAlert({
    userId: params.userId,
    bookingId: params.bookingId,
    subject: `${shop} · Customer corrected request (NO)`,
    text:
      `Customer submitted corrected details — ${shop}\n\n` +
      `Customer: ${params.customerName}\n` +
      `Issue: ${params.issueType}\n` +
      `Address: ${params.address}\n` +
      `${params.cityState && params.cityState !== "—" ? `Area: ${params.cityState}\n` : ""}` +
      `Priority: ${tag}\n\n` +
      `Reply by SMS when ready: 1 = Approve, 2 = Reject\n` +
      `Dashboard:\n${bookingDashboardUrl(params.bookingId)}\n\n` +
      `${OWNER_EMAIL_BACKUP_NOTE}\n`,
    dedupeId: `${params.bookingId}:customer_correction:${Date.now()}`,
    operation: "owner_customer_correction_email",
  });
}

export async function notifyOwnerSmsFailureEmail(params: {
  userId: string;
  operation: string;
  message: string;
  bookingId?: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const settingsUrl = getPublicAppUrl()
    ? `${getPublicAppUrl()}/settings?section=contact`
    : "/settings?section=contact";

  await sendOwnerEmailAlert({
    userId: params.userId,
    bookingId: params.bookingId ?? `sms-${params.operation}`,
    subject: `${shop} · SMS delivery failed`,
    text:
      `SMS could not be delivered — ${shop}\n\n` +
      `Operation: ${params.operation}\n` +
      `Detail: ${params.message}\n\n` +
      `Check Twilio env vars, US (+1) phone numbers, Trial verified recipients, and Geo permissions (US SMS).\n` +
      `Settings: ${settingsUrl}\n\n` +
      `${OWNER_EMAIL_BACKUP_NOTE}\n`,
    dedupeId: `sms_fail:${params.operation}:${params.message.slice(0, 80)}`,
    operation: "owner_sms_failure_email",
  });
}

export async function notifyOwnerLinkIntakeUpdatedEmail(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const tag = params.priority === "P1" ? "URGENT" : params.priority;

  await sendOwnerEmailAlert({
    userId: params.userId,
    bookingId: params.bookingId,
    subject: `${shop} · SMS link request updated`,
    text:
      `Customer updated SMS link intake — ${shop}\n\n` +
      `Customer: ${params.customerName}\n` +
      `Issue: ${params.issueType}\n` +
      `Address: ${params.address}\n` +
      `${params.cityState && params.cityState !== "—" ? `Area: ${params.cityState}\n` : ""}` +
      `Priority: ${tag}\n\n` +
      `Reply by SMS when ready: 1 = Approve, 2 = Reject\n` +
      `Dashboard:\n${bookingDashboardUrl(params.bookingId)}\n\n` +
      `${OWNER_EMAIL_BACKUP_NOTE}\n`,
    dedupeId: `${params.bookingId}:link_update:${Date.now()}`,
    operation: "owner_link_intake_updated_email",
  });
}
