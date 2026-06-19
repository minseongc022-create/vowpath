import { appendTenantEvent } from "../tenant-events";
import { getPublicAppUrl } from "../app-url";
import { listCallLogs } from "../call-logs";
import { formatCityState } from "../recent-bookings";
import { notifyOwnerCustomerVerified } from "../customer-verification-owner-notify";
import { normalizeSmsPhone } from "../phone";
import { sendSms } from "../send-sms";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import { shopDisplayNameForUser } from "../link-intake-brand";
import {
  saveCorrectionSession,
  type CorrectionIntakeSession,
} from "../correction-intake-store";
import {
  customerVerificationCorrectionSmsBody,
  customerVerificationReminderBody,
  customerVerificationSmsBody,
} from "./sms-copy";
import {
  findPendingVerificationByPhone,
  getCustomerVerification,
  listPendingVerificationIndex,
  saveCustomerVerification,
} from "./store";
import type {
  CustomerVerificationRecord,
  CustomerVerificationResponse,
  CustomerVerificationStatus,
} from "./types";
import type { IntakeChannel } from "../call-intake/types";
import { shouldSendCustomerVerificationSms } from "./triggers";

const REMINDER_AFTER_MS = 30 * 60 * 1000;
const UNVERIFIED_AFTER_MS = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function pushTimeline(
  record: CustomerVerificationRecord,
  message: string,
): CustomerVerificationRecord {
  return {
    ...record,
    timeline: [...record.timeline, { at: nowIso(), message }],
  };
}

async function sendCustomerVerificationSms(params: {
  userId: string;
  phone: string;
  body: string;
  dedupeId: string;
  operation: string;
  bookingId?: string;
}): Promise<boolean> {
  const allowed = await shouldSendSmsOnce(params.userId, params.dedupeId);
  if (!allowed) return true;
  const result = await sendSms(params.phone, params.body, params.operation, {
    context: {
      userId: params.userId,
      operation: params.operation,
      bookingId: params.bookingId,
    },
  });
  if (!result.ok) return false;
  await markSmsSent(params.userId, params.dedupeId);
  return true;
}

export function parseCustomerVerificationReply(
  body: string,
): CustomerVerificationResponse | null {
  const trimmed = body.trim();
  const first = trimmed.split(/\s+/)[0]?.toUpperCase() ?? "";
  if (/^(YES|Y|네|예)$/.test(first)) return "yes";
  if (/^(NO|N|아니|아니요)$/.test(first)) return "no";
  return null;
}

function correctionUrl(token: string): string {
  const base = getPublicAppUrl();
  const path = `/intake/correct/${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

async function createCorrectionToken(
  record: CustomerVerificationRecord,
): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const session: CorrectionIntakeSession = {
    token,
    userId: record.userId,
    bookingId: record.bookingId,
    callId: record.callId,
    shopName: record.shopName,
    customerName: record.snapshot.customerName,
    address: record.snapshot.address,
    issueType: record.snapshot.issueType,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  await saveCorrectionSession(session);
  return token;
}

async function recordVerificationEvent(params: {
  userId: string;
  bookingId: string;
  title: string;
  body: string;
  urgency?: "high" | "medium" | "low";
}): Promise<void> {
  try {
    await appendTenantEvent({
      userId: params.userId,
      type: "service_request_created",
      title: params.title,
      body: params.body,
      bookingId: params.bookingId,
      href: `/dashboard/bookings/${encodeURIComponent(params.bookingId)}`,
      urgency: params.urgency ?? "medium",
    });
  } catch (e) {
    console.warn("[customer-verification] tenant event", e);
  }
}

export async function startCustomerVerification(params: {
  userId: string;
  bookingId: string;
  callId?: string;
  customerPhone: string;
  customerName: string;
  address: string;
  issueType: string;
  intakeChannel: IntakeChannel;
}): Promise<CustomerVerificationRecord | null> {
  if (!shouldSendCustomerVerificationSms(params.intakeChannel)) return null;

  const phone = normalizeSmsPhone(params.customerPhone);
  if (!phone) return null;

  const existing = await getCustomerVerification(params.userId, params.bookingId);
  if (existing?.sentAt) return existing;

  const shopName = await shopDisplayNameForUser(params.userId);
  const record: CustomerVerificationRecord = {
    id: crypto.randomUUID(),
    userId: params.userId,
    bookingId: params.bookingId,
    callId: params.callId,
    customerPhone: phone,
    shopName,
    status: "pending_response",
    sentAt: nowIso(),
    snapshot: {
      customerName: params.customerName,
      address: params.address,
      issueType: params.issueType,
    },
    triggerReasons: ["phone_intake"],
    timeline: [
      {
        at: nowIso(),
        message: "Customer verification SMS sent.",
      },
    ],
  };

  const body = customerVerificationSmsBody({
    shopName,
    address: params.address,
    issueType: params.issueType,
  });

  const sent = await sendCustomerVerificationSms({
    userId: params.userId,
    phone,
    body,
    dedupeId: `${params.bookingId}:customer_verify`,
    operation: "customer_verification_request",
    bookingId: params.bookingId,
  });

  if (!sent) return null;

  await saveCustomerVerification(record);
  return record;
}

async function applyStatus(
  record: CustomerVerificationRecord,
  status: CustomerVerificationStatus,
  response?: CustomerVerificationResponse,
): Promise<CustomerVerificationRecord> {
  const updated: CustomerVerificationRecord = {
    ...record,
    status,
    respondedAt: response ? nowIso() : record.respondedAt,
    response: response ?? record.response,
  };
  await saveCustomerVerification(updated);
  return updated;
}

export async function handleCustomerVerificationReply(params: {
  from: string;
  body: string;
  userId?: string | null;
}): Promise<{ handled: boolean; replyBody: string }> {
  const reply = parseCustomerVerificationReply(params.body);
  if (!reply) {
    return { handled: false, replyBody: "" };
  }

  const pending = await findPendingVerificationByPhone(params.from, params.userId);
  if (!pending) {
    return {
      handled: true,
      replyBody: "No pending request confirmation. Please contact your service provider.",
    };
  }

  if (reply === "yes") {
    const shopName = await shopDisplayNameForUser(pending.userId);
    let record = pushTimeline(
      pending,
      "Customer confirmed request details.",
    );
    record = await applyStatus(record, "verified", "yes");
    await recordVerificationEvent({
      userId: record.userId,
      bookingId: record.bookingId,
      title: "고객 확인 완료",
      body: record.snapshot.customerName,
    });

    try {
      const calls = await listCallLogs(record.userId);
      const call = record.callId
        ? calls.find((c) => c.id === record.callId)
        : undefined;
      await notifyOwnerCustomerVerified({
        userId: record.userId,
        bookingId: record.bookingId,
        customerName: record.snapshot.customerName,
        issueType: record.snapshot.issueType,
        address: record.snapshot.address,
        cityState: formatCityState(record.snapshot.address),
        priority: call?.priority ?? "P3",
      });
    } catch (e) {
      console.warn("[customer-verification] owner yes sms", e);
    }

    return {
      handled: true,
      replyBody: `Thank you. ${shopName} has recorded your confirmation.`,
    };
  }

  const shopName = await shopDisplayNameForUser(pending.userId);
  const token = await createCorrectionToken(pending);
  const url = correctionUrl(token);
  let record = pushTimeline(pending, "Customer requested corrections.");
  record = {
    ...record,
    correctionToken: token,
  };
  record = await applyStatus(record, "needs_review", "no");

  await sendCustomerVerificationSms({
    userId: record.userId,
    phone: record.customerPhone,
    body: customerVerificationCorrectionSmsBody({
      shopName,
      correctionUrl: url,
    }),
    dedupeId: `${record.bookingId}:customer_verify_correction`,
    operation: "customer_verification_correction_link",
    bookingId: record.bookingId,
  });

  await recordVerificationEvent({
    userId: record.userId,
    bookingId: record.bookingId,
    title: "고객 수정 요청",
    body: record.snapshot.customerName,
    urgency: "high",
  });

  return {
    handled: true,
    replyBody: `${shopName}: Please use the link we sent to update your request.`,
  };
}

export async function processCustomerVerificationCron(): Promise<{
  reminders: number;
  expired: number;
}> {
  const index = await listPendingVerificationIndex();
  let reminders = 0;
  let expired = 0;
  const now = Date.now();

  for (const entry of index) {
    const record = await getCustomerVerification(entry.userId, entry.bookingId);
    if (!record || record.status !== "pending_response") continue;

    const sentMs = new Date(record.sentAt).getTime();
    const elapsed = now - sentMs;

    if (elapsed >= UNVERIFIED_AFTER_MS) {
      const updated = pushTimeline(
        { ...record, status: "unverified" },
        "No customer response within 24 hours.",
      );
      await saveCustomerVerification({ ...updated, status: "unverified" });
      expired += 1;
      continue;
    }

    if (
      elapsed >= REMINDER_AFTER_MS &&
      !record.reminderSentAt
    ) {
      const shopName = await shopDisplayNameForUser(record.userId);
      const body = customerVerificationReminderBody(shopName);
      const ok = await sendCustomerVerificationSms({
        userId: record.userId,
        phone: record.customerPhone,
        body,
        dedupeId: `${record.bookingId}:customer_verify_reminder`,
        operation: "customer_verification_reminder",
        bookingId: record.bookingId,
      });
      if (ok) {
        await saveCustomerVerification({
          ...record,
          reminderSentAt: nowIso(),
          timeline: [
            ...record.timeline,
            { at: nowIso(), message: "Reminder SMS sent (30 min)." },
          ],
        });
        reminders += 1;
      }
    }
  }

  return { reminders, expired };
}

