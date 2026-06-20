import { bookingShortRef } from "../booking-ref";
import { listCallLogs } from "../call-logs";
import { resolveShopDisplayName } from "../link-intake-brand";
import { normalizeSmsPhone } from "../phone";
import { lookupStoredRequestStatus } from "../request-status-resolve";
import { getRequestStatuses } from "../requests-db";
import { listScheduledBookings } from "../schedule-bookings-db";
import {
  smsCustomerOnMyWayBody,
  smsStaffEtaInvalidReply,
  smsTechOnMyWayAcceptedHint,
  SMS_ETA_MINUTE_OPTIONS,
} from "../sms-templates";
import { sendSms } from "../send-sms";
import { getSmsReplyTarget } from "../sms-reply-context";
import { resolveOwnerUserIdFromSms } from "../owner-sms-reply";
import { sendTechSms } from "./send-tech-sms";
import { findUserById } from "../users-db";
import {
  clearTechActiveJob,
  findTechByPhone,
  getTechActiveJob,
  getTechAssignment,
  setTechActiveJob,
} from "./store";

export const ON_MY_WAY_ETA_OPTIONS = SMS_ETA_MINUTE_OPTIONS;
export type OnMyWayEtaMinutes = (typeof SMS_ETA_MINUTE_OPTIONS)[number];

function normalizeOtwBody(body: string): string {
  let trimmed = body.trim();
  // Common typo: 0tw30 (zero) instead of OTW30
  trimmed = trimmed.replace(/^0(?=tw|mw\b)/i, "O");
  return trimmed;
}

export function looksLikeOnMyWayAttempt(body: string): boolean {
  const t = normalizeOtwBody(body);
  if (parseOnMyWayMinutes(t) !== null) return true;
  return /^(?:otw|omw|on\s*my\s*way|heading\s*out)\b/i.test(t);
}

export function parseOnMyWayMinutes(body: string): OnMyWayEtaMinutes | null {
  const trimmed = normalizeOtwBody(body);

  const patterns = [
    /^OTW\s*(\d{1,2})$/i,
    /^OMW\s*(\d{1,2})$/i,
    /^(?:on\s*my\s*way|heading\s*out)\s*(\d{1,2})$/i,
    /^(\d{1,2})\s*min(?:ute)?s?\s*(?:eta|away)?$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const n = Number(match[1]);
      if (ON_MY_WAY_ETA_OPTIONS.includes(n as OnMyWayEtaMinutes)) {
        return n as OnMyWayEtaMinutes;
      }
    }
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    const n = Number(trimmed);
    return ON_MY_WAY_ETA_OPTIONS.includes(n as OnMyWayEtaMinutes)
      ? (n as OnMyWayEtaMinutes)
      : null;
  }

  return null;
}

async function resolveCustomerPhone(
  userId: string,
  bookingId: string,
): Promise<string | null> {
  if (!bookingId.startsWith("call-")) return null;
  const callId = bookingId.slice("call-".length);
  const logs = await listCallLogs(userId);
  const call = logs.find((c) => c.id === callId);
  if (!call) return null;
  const raw = call.callbackPhone?.trim() || call.from?.trim();
  return normalizeSmsPhone(raw ?? "") || null;
}

async function resolveCustomerName(
  userId: string,
  bookingId: string,
): Promise<string> {
  if (!bookingId.startsWith("call-")) return "Customer";
  const callId = bookingId.slice("call-".length);
  const logs = await listCallLogs(userId);
  const call = logs.find((c) => c.id === callId);
  return call?.customerName?.trim() || "Customer";
}

async function findActiveVisitBooking(
  userId: string,
): Promise<{ bookingId: string; customerName: string } | null> {
  const statuses = await getRequestStatuses(userId);
  const isActive = (bookingId: string) => {
    const status = lookupStoredRequestStatus(bookingId, statuses);
    return status === "scheduled" || status === "approved";
  };

  const replyTarget = await getSmsReplyTarget(userId);
  if (replyTarget && isActive(replyTarget)) {
    return {
      bookingId: replyTarget,
      customerName: await resolveCustomerName(userId, replyTarget),
    };
  }

  const scheduled = await listScheduledBookings(userId);
  const latest = scheduled
    .filter((row) => isActive(row.bookingId))
    .sort(
      (a, b) =>
        new Date(b.scheduledStartAt).getTime() -
        new Date(a.scheduledStartAt).getTime(),
    )[0];

  if (latest) {
    return {
      bookingId: latest.bookingId,
      customerName: await resolveCustomerName(userId, latest.bookingId),
    };
  }

  const calls = await listCallLogs(userId);
  const callCandidate = calls
    .map((call) => ({
      bookingId: `call-${call.id}`,
      createdAt: call.createdAt,
      customerName: call.customerName?.trim() || "Customer",
    }))
    .filter((row) => isActive(row.bookingId))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  if (callCandidate) {
    return {
      bookingId: callCandidate.bookingId,
      customerName: callCandidate.customerName,
    };
  }

  return null;
}

export async function notifyCustomerOnMyWay(params: {
  userId: string;
  bookingId: string;
  etaMinutes: OnMyWayEtaMinutes;
  techName?: string;
  customerName?: string;
  customerPhone?: string;
}): Promise<{ ok: boolean; error?: string; customerPhone?: string }> {
  const user = await findUserById(params.userId);
  const shopName = resolveShopDisplayName(user?.shopName);

  const assignment = await getTechAssignment(params.userId, params.bookingId);
  const customerName =
    params.customerName?.trim() ||
    assignment?.customerName?.trim() ||
    "there";
  const techName =
    params.techName?.trim() ||
    assignment?.assignedTechName?.trim() ||
    user?.shopName?.trim() ||
    "Your technician";

  const phone =
    params.customerPhone?.trim() ||
    (await resolveCustomerPhone(params.userId, params.bookingId));
  if (!phone) {
    return { ok: false, error: "No customer phone on file for this booking." };
  }

  const body = smsCustomerOnMyWayBody({
    shopName,
    customerName,
    techName,
    etaMinutes: params.etaMinutes,
  });

  const result = await sendSms(phone, body, "customer-on-my-way", {
    context: {
      userId: params.userId,
      operation: "customer_on_my_way",
      bookingId: params.bookingId,
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.error, customerPhone: phone };
  }

  return { ok: true, customerPhone: phone };
}

export async function promptTechOnMyWayAfterAccept(params: {
  userId: string;
  techId: string;
  techPhone: string;
  bookingId: string;
  customerName: string;
}): Promise<void> {
  await setTechActiveJob(params.userId, params.techId, params.bookingId);
  const ref = bookingShortRef(params.bookingId);
  const user = await findUserById(params.userId);
  const body = smsTechOnMyWayAcceptedHint({
    shopName: user?.shopName,
    customerName: params.customerName,
    ref,
  });
  await sendTechSms({
    userId: params.userId,
    techPhone: params.techPhone,
    body,
    devLogLabel: "tech-on-my-way-hint",
    operation: "tech_on_my_way_hint",
    bookingId: params.bookingId,
  });
}

export async function handleOnMyWaySmsReply(params: {
  userId: string;
  fromPhone: string;
  body: string;
}): Promise<{ handled: boolean; replyBody: string }> {
  const minutes = parseOnMyWayMinutes(params.body);
  if (minutes === null) {
    if (looksLikeOnMyWayAttempt(params.body)) {
      return {
        handled: true,
        replyBody: smsStaffEtaInvalidReply(),
      };
    }
    return { handled: false, replyBody: "" };
  }

  const tech = await findTechByPhone(params.userId, params.fromPhone);
  const ownerUserId = await resolveOwnerUserIdFromSms(params.fromPhone);
  const isOwner = ownerUserId === params.userId && !tech;

  if (!tech && !isOwner) {
    return { handled: false, replyBody: "" };
  }

  let bookingId: string | null = null;
  let customerName = "Customer";
  let techName = tech?.name;

  if (tech) {
    bookingId = await getTechActiveJob(params.userId, tech.id);
    if (!bookingId) {
      const visit = await findActiveVisitBooking(params.userId);
      bookingId = visit?.bookingId ?? null;
      if (visit) customerName = visit.customerName;
    } else {
      const assignment = await getTechAssignment(params.userId, bookingId);
      if (
        !assignment ||
        assignment.status !== "accepted" ||
        assignment.assignedTechId !== tech.id
      ) {
        await clearTechActiveJob(params.userId, tech.id);
        bookingId = null;
      } else {
        customerName = assignment.customerName;
      }
    }
  }

  if (!bookingId && isOwner) {
    const visit = await findActiveVisitBooking(params.userId);
    bookingId = visit?.bookingId ?? null;
    if (visit) customerName = visit.customerName;
    techName = undefined;
  }

  if (!bookingId) {
    return {
      handled: true,
      replyBody:
        "No active visit found. Approve a booking first, then reply 30 when heading out.",
    };
  }

  const sent = await notifyCustomerOnMyWay({
    userId: params.userId,
    bookingId,
    etaMinutes: minutes,
    techName,
    customerName,
  });

  if (!sent.ok) {
    return {
      handled: true,
      replyBody: `Could not text customer: ${sent.error ?? "SMS failed"}.`,
    };
  }

  return {
    handled: true,
    replyBody: `Customer notified — ETA ~${minutes} min. Drive safe!`,
  };
}

/** @deprecated Use handleOnMyWaySmsReply */
export async function handleTechOnMyWayReply(params: {
  userId: string;
  fromPhone: string;
  body: string;
}): Promise<{ handled: boolean; replyBody: string }> {
  return handleOnMyWaySmsReply(params);
}
