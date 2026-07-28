import { sendSms, type SmsSendContext } from "../send-sms";
import { sendSmsMessages } from "../sms-link-delivery";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import { findUserById } from "../users-db";
import { resolveOwnerAlertPhone } from "../owner-alert-phone";
import { setSmsReplyTarget } from "../sms-reply-context";
import type { JobPriority } from "../types";
import {
  smsCustomerIntakeAckBody,
  smsCustomerNoSlotBody,
  smsCustomerScheduledMessages,
  smsOwnerApprovalNeededBody,
  smsOwnerNoSlotBody,
  smsOwnerScheduledFyiBody,
  smsOwnerUrgentAutoBookedBody,
} from "../sms-templates";
import { findPortalTokenForBooking } from "../customer-booking-portal";
import { buildBookingPortalUrl } from "../portal-url";
import { notifyStaffEtaInstructions } from "../staff-eta-notify";
import { withPracticeSmsPrefix } from "../practice-sms";

function smsCtx(userId: string, op: string, bookingId?: string): SmsSendContext {
  return { userId, operation: op, bookingId };
}

async function sendCustomer(params: {
  userId: string;
  phone: string;
  body: string | string[];
  dedupeId: string;
  operation: string;
  bookingId: string;
  practiceMode?: boolean;
}) {
  if (!(await shouldSendSmsOnce(params.userId, params.dedupeId))) return;
  const parts = Array.isArray(params.body) ? params.body : [params.body];
  const messages = parts.map((part) => withPracticeSmsPrefix(part, params.practiceMode === true));
  const result = await sendSmsMessages(params.phone, messages, params.operation, {
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
  const body = smsCustomerIntakeAckBody(user?.shopName, params.issue);
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
  customerName?: string;
  portalUrl?: string;
  practiceMode?: boolean;
  /** Override SMS dedupe key (needed for reschedule confirmations). */
  dedupeKey?: string;
}) {
  const phone = params.phone?.trim();
  if (!phone) return;
  const user = await findUserById(params.userId);
  let portalUrl = params.portalUrl;
  if (!portalUrl) {
    const token = await findPortalTokenForBooking(params.userId, params.bookingId);
    if (token) portalUrl = buildBookingPortalUrl(token);
  }
  const body = smsCustomerScheduledMessages({
    shopName: user?.shopName,
    customerName: params.customerName ?? "there",
    window: params.window,
    portalUrl,
    priority: params.priority,
  });
  await sendCustomer({
    userId: params.userId,
    phone,
    body,
    dedupeId: params.dedupeKey ?? `${params.bookingId}:scheduled`,
    operation: "customer_scheduled",
    bookingId: params.bookingId,
    practiceMode: params.practiceMode,
  });
}

export async function notifyCustomerNoSlot(params: {
  userId: string;
  bookingId: string;
  phone?: string | null;
  practiceMode?: boolean;
}) {
  const phone = params.phone?.trim();
  if (!phone) return;
  const user = await findUserById(params.userId);
  const body = smsCustomerNoSlotBody(user?.shopName);
  await sendCustomer({
    userId: params.userId,
    phone,
    body,
    dedupeId: `${params.bookingId}:no_slot`,
    operation: "customer_no_slot",
    bookingId: params.bookingId,
    practiceMode: params.practiceMode,
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
  const body = smsOwnerScheduledFyiBody({
    shopName: user?.shopName,
    customerName: params.customerName,
    issue: params.issue,
    window: params.window,
    undoMinutes: params.undoMinutes,
  });
  await sendOwner({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:owner_fyi`,
    operation: "owner_scheduled_fyi",
    bookingId: params.bookingId,
  });

  try {
    await notifyStaffEtaInstructions({
      userId: params.userId,
      bookingId: params.bookingId,
      dedupeSuffix: "staff_eta_after_schedule",
    });
  } catch {
    /* optional */
  }
}

export async function notifyOwnerApprovalNeeded(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issue: string;
  window: string;
  priority: JobPriority;
  ambiguous?: boolean;
  address?: string;
}) {
  const user = await findUserById(params.userId);
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);

  const tasks: Promise<unknown>[] = [];

  if (ownerPhone) {
    const body = smsOwnerApprovalNeededBody({
      shopName: user?.shopName,
      customerName: params.customerName,
      issue: params.issue,
      window: params.window,
      priority: params.priority,
      ambiguous: params.ambiguous,
    });
    tasks.push(
      sendOwner({
        userId: params.userId,
        phone: ownerPhone,
        body,
        dedupeId: `${params.bookingId}:owner_approval`,
        operation: "owner_approval_needed",
        bookingId: params.bookingId,
      }),
    );
  }

  tasks.push(
    (async () => {
      const { notifyOwnerApprovalNeededEmail } = await import("../owner-email-notify");
      await notifyOwnerApprovalNeededEmail({
        userId: params.userId,
        bookingId: params.bookingId,
        customerName: params.customerName,
        issueType: params.issue,
        priority: params.priority,
        address: params.address,
        window: params.window,
      });
    })(),
  );

  await Promise.allSettled(tasks);
}

export async function notifyOwnerUrgentAutoBooked(params: {
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
  const body = smsOwnerUrgentAutoBookedBody({
    shopName: user?.shopName,
    customerName: params.customerName,
    issue: params.issue,
    window: params.window,
    undoMinutes: params.undoMinutes,
  });
  await sendOwner({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:owner_urgent_auto`,
    operation: "owner_urgent_auto_booked",
    bookingId: params.bookingId,
  });

  try {
    await notifyStaffEtaInstructions({
      userId: params.userId,
      bookingId: params.bookingId,
      dedupeSuffix: "staff_eta_after_urgent",
    });
  } catch {
    /* optional */
  }
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
  const body = smsOwnerNoSlotBody({
    shopName: user?.shopName,
    customerName: params.customerName,
    issue: params.issue,
  });
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
  const body = `Effiroad [TEST]: Booked ${params.window} for ${params.customerName}. Slot held on calendar. ${params.shadowLeft} practice run${params.shadowLeft === 1 ? "" : "s"} left.`;
  await sendOwner({
    userId: params.userId,
    phone: ownerPhone,
    body,
    dedupeId: `${params.bookingId}:shadow`,
    operation: "owner_shadow",
    bookingId: params.bookingId,
  });
}
