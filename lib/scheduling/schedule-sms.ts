import { sendSms, type SmsSendContext } from "../send-sms";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import { findUserById } from "../users-db";
import { resolveOwnerAlertPhone } from "../owner-alert-phone";
import { resolveShopDisplayName } from "../link-intake-brand";
import { setSmsReplyTarget } from "../sms-reply-context";
import type { JobPriority } from "../types";

function shopLabel(shopName?: string): string {
  const name = shopName?.trim();
  return name && name.length > 0 ? name : "Your HVAC team";
}

function smsCtx(userId: string, op: string, bookingId?: string): SmsSendContext {
  return { userId, operation: op, bookingId };
}

async function sendCustomer(params: {
  userId: string;
  phone: string;
  body: string;
  dedupeId: string;
  operation: string;
  bookingId: string;
}) {
  if (!(await shouldSendSmsOnce(params.userId, params.dedupeId))) return;
  const result = await sendSms(params.phone, params.body, params.operation, {
    context: smsCtx(params.userId, params.operation, params.bookingId),
  });
  if (result.ok) await markSmsSent(params.userId, params.dedupeId);
}

async function sendOwner(params: {
  userId: string;
  phone: string;
  body: string;
  dedupeId: string;
  operation: string;
  bookingId: string;
}) {
  if (!(await shouldSendSmsOnce(params.userId, params.dedupeId))) return;
  await setSmsReplyTarget(params.userId, params.bookingId);
  const result = await sendSms(params.phone, params.body, params.operation, {
    context: smsCtx(params.userId, params.operation, params.bookingId),
  });
  if (result.ok) await markSmsSent(params.userId, params.dedupeId);
}

export async function notifyCustomerIntakeAck(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
  issue: string;
}) {
  const phone = params.phone?.trim();
  if (!phone) return;
  const user = await findUserById(params.userId);
  const body = `${shopLabel(user?.shopName)}: We got your request for ${params.issue}. We'll confirm your visit window shortly.`;
  await sendCustomer({
    userId: params.userId,
    phone,
    body,
    dedupeId: `${params.bookingId}:intake_ack`,
    operation: "customer_intake_ack",
    bookingId: params.bookingId,
  });
}

export async function notifyCustomerScheduled(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
  window: string;
  address: string;
  priority: JobPriority;
}) {
  const phone = params.phone?.trim();
  if (!phone) return;
  const user = await findUserById(params.userId);
  const shop = shopLabel(user?.shopName);
  const body =
    params.priority === "P1"
      ? `${shop}: URGENT — We've prioritized your request. Expected arrival window: ${params.window} at ${params.address}.`
      : `${shop}: Your visit is scheduled for ${params.window} at ${params.address}. We'll call if we're running late.`;
  await sendCustomer({
    userId: params.userId,
    phone,
    body,
    dedupeId: `${params.bookingId}:scheduled`,
    operation: "customer_scheduled",
    bookingId: params.bookingId,
  });
}

export async function notifyCustomerNoSlot(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
}) {
  const phone = params.phone?.trim();
  if (!phone) return;
  const user = await findUserById(params.userId);
  const body = `${shopLabel(user?.shopName)}: We received your request. Our schedule is full for now — we'll contact you within 2 hours to set a time.`;
  await sendCustomer({
    userId: params.userId,
    phone,
    body,
    dedupeId: `${params.bookingId}:no_slot`,
    operation: "customer_no_slot",
    bookingId: params.bookingId,
  });
}

export async function notifyOwnerScheduledFyi(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issue: string;
  window: string;
  undoMinutes: number;
}) {
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) return;
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const body = `${shop}: Booked ${params.window} — ${params.customerName}, ${params.issue}. Undo within ${params.undoMinutes} min: reply 9.`;
  await sendOwner({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:owner_fyi`,
    operation: "owner_scheduled_fyi",
    bookingId: params.bookingId,
  });
}

export async function notifyOwnerApprovalNeeded(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issue: string;
  window: string;
  priority: JobPriority;
}) {
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) return;
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const tag = params.priority === "P1" ? "P1" : "review";
  const body = `${shop} ${tag}: ${params.customerName} — ${params.issue}. Customer picked ${params.window}. Reply 1=Confirm 2=Pass.`;
  await sendOwner({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:owner_approval`,
    operation: "owner_approval_needed",
    bookingId: params.bookingId,
  });
}

export async function notifyOwnerNoSlot(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issue: string;
}) {
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) return;
  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const body = `${shop}: No open slot for ${params.customerName} — ${params.issue}. Assign manually in dashboard.`;
  await sendOwner({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:owner_no_slot`,
    operation: "owner_no_slot",
    bookingId: params.bookingId,
  });
}

export async function notifyOwnerShadowResult(params: {
  userId: string;
  bookingId: string;
  window: string;
  customerName: string;
  shadowLeft: number;
}) {
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) return;
  const body = `Vowpath [TEST]: Would have booked ${params.window} for ${params.customerName}. ${params.shadowLeft} test calls left.`;
  await sendOwner({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:shadow`,
    operation: "owner_shadow",
    bookingId: params.bookingId,
  });
}
