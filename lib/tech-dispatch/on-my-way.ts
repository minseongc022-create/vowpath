import { bookingShortRef } from "../booking-ref";
import { listCallLogs } from "../call-logs";
import { resolveShopDisplayName } from "../link-intake-brand";
import { normalizeSmsPhone } from "../phone";
import {
  smsCustomerOnMyWayBody,
  smsTechOnMyWayAcceptedHint,
} from "../sms-templates";
import { sendSms } from "../send-sms";
import { sendTechSms } from "./send-tech-sms";
import { findUserById } from "../users-db";
import {
  clearTechActiveJob,
  findTechByPhone,
  getTechActiveJob,
  getTechAssignment,
  setTechActiveJob,
} from "./store";

export const ON_MY_WAY_ETA_OPTIONS = [5, 10, 15, 30, 45, 60] as const;
export type OnMyWayEtaMinutes = (typeof ON_MY_WAY_ETA_OPTIONS)[number];

export function parseOnMyWayMinutes(body: string): OnMyWayEtaMinutes | null {
  const trimmed = body.trim();
  const otw = trimmed.match(/^OTW\s*(\d{1,2})$/i) ?? trimmed.match(/^OMW\s*(\d{1,2})$/i);
  if (otw) {
    const n = Number(otw[1]);
    return ON_MY_WAY_ETA_OPTIONS.includes(n as OnMyWayEtaMinutes)
      ? (n as OnMyWayEtaMinutes)
      : null;
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
  const body = smsTechOnMyWayAcceptedHint({
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

export async function handleTechOnMyWayReply(params: {
  userId: string;
  fromPhone: string;
  body: string;
}): Promise<{ handled: boolean; replyBody: string }> {
  const minutes = parseOnMyWayMinutes(params.body);
  if (minutes === null) return { handled: false, replyBody: "" };

  const tech = await findTechByPhone(params.userId, params.fromPhone);
  if (!tech) return { handled: false, replyBody: "" };

  let bookingId = await getTechActiveJob(params.userId, tech.id);
  if (!bookingId) {
    return {
      handled: true,
      replyBody:
        "No active job. Accept a job first (reply 1), then text OTW30 when heading out.",
    };
  }

  const assignment = await getTechAssignment(params.userId, bookingId);
  if (
    !assignment ||
    assignment.status !== "accepted" ||
    assignment.assignedTechId !== tech.id
  ) {
    await clearTechActiveJob(params.userId, tech.id);
    return {
      handled: true,
      replyBody: "That job is closed. Check the dashboard for your next assignment.",
    };
  }

  const sent = await notifyCustomerOnMyWay({
    userId: params.userId,
    bookingId,
    etaMinutes: minutes,
    techName: tech.name,
    customerName: assignment.customerName,
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
