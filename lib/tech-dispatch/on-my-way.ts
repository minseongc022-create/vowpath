import { listCallLogs } from "../call-logs";
import { resolveShopDisplayName } from "../link-intake-brand";
import { normalizeSmsPhone } from "../phone";
import { getShopBookingSettings } from "../shop-settings-db";
import { isPracticeMode } from "../data-truthfulness";
import { lookupStoredRequestStatus } from "../request-status-resolve";
import { getRequestStatuses } from "../requests-db";
import { listScheduledBookings } from "../schedule-bookings-db";
import {
  smsCustomerOnMyWayBody,
  smsStaffEtaInvalidReply,
} from "../sms-templates";
import { notifyStaffEtaInstructions } from "../staff-eta-notify";
import { sendSms } from "../send-sms";
import { getSmsReplyTarget } from "../sms-reply-context";
import { resolveOwnerUserIdFromSms } from "../owner-sms-reply";
import { findUserById } from "../users-db";
import { handleApptEtaReply } from "./appointment-reminder";
import {
  clearTechActiveJob,
  findTechByPhone,
  getTechActiveJob,
  getTechAssignment,
  setTechActiveJob,
} from "./store";
import {
  looksLikeOnMyWayAttempt,
  parseDepartingPhrase,
  parseOnMyWayMinutes,
  type OnMyWayEtaMinutes,
  ON_MY_WAY_ETA_OPTIONS,
} from "./on-my-way-parse";

export {
  looksLikeOnMyWayAttempt,
  parseDepartingPhrase,
  parseOnMyWayMinutes,
  ON_MY_WAY_ETA_OPTIONS,
  type OnMyWayEtaMinutes,
};

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
  etaMinutes?: OnMyWayEtaMinutes | null;
  techName?: string;
  customerName?: string;
  customerPhone?: string;
  /** Staff line that triggered departing — gets the /go/ GPS link. */
  staffPhone?: string;
  departed?: boolean;
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

  let trackUrl: string | undefined;
  const departed = params.departed === true || params.etaMinutes != null;
  try {
    const { createOrGetVisitTrack } = await import("../visit-tracking/store");
    const { buildCustomerTrackUrl, buildTechGoUrl } = await import("../visit-tracking/urls");
    const session = await createOrGetVisitTrack({
      userId: params.userId,
      bookingId: params.bookingId,
      shopName,
      customerName,
      techName,
      etaMinutes: params.etaMinutes ?? null,
      departed,
    });
    trackUrl = buildCustomerTrackUrl(session.customerToken);

    const settings = await (await import("./store")).getTechDispatchSettings(params.userId);
    const goRecipient =
      params.staffPhone?.trim() ||
      (assignment?.assignedTechId
        ? settings.techs.find((t) => t.id === assignment.assignedTechId)?.phone
        : null);
    if (goRecipient) {
      const goUrl = buildTechGoUrl(session.techToken);
      const { smsStaffGoLinkBody } = await import("../sms-templates");
      await sendSms(
        goRecipient,
        smsStaffGoLinkBody({ customerName, goUrl }),
        "tech-go-link",
        {
          context: {
            userId: params.userId,
            operation: "tech_go_link",
            bookingId: params.bookingId,
          },
        },
      );
    }
  } catch (e) {
    console.warn("[on-my-way] visit track", e);
  }

  const smsBodyBase = smsCustomerOnMyWayBody({
    shopName,
    customerName,
    techName,
    etaMinutes: params.etaMinutes,
    trackUrl,
  });

  const bookingSettings = await getShopBookingSettings(params.userId);
  const practiceMode = isPracticeMode(bookingSettings);
  const smsBody = practiceMode ? `Effiroad [TEST]: ${smsBodyBase}` : smsBodyBase;

  const result = await sendSms(phone, smsBody, "customer-on-my-way", {
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
  await notifyStaffEtaInstructions({
    userId: params.userId,
    bookingId: params.bookingId,
    staffPhone: params.techPhone,
    customerName: params.customerName,
    dedupeSuffix: "staff_eta_after_tech_accept",
  });

  try {
    const user = await findUserById(params.userId);
    const shopName = resolveShopDisplayName(user?.shopName);
    const assignment = await getTechAssignment(params.userId, params.bookingId);
    const { createOrGetVisitTrack } = await import("../visit-tracking/store");
    const { buildTechGoUrl } = await import("../visit-tracking/urls");
    const { smsStaffGoLinkBody } = await import("../sms-templates");
    const session = await createOrGetVisitTrack({
      userId: params.userId,
      bookingId: params.bookingId,
      shopName,
      customerName: params.customerName,
      techName: assignment?.assignedTechName ?? "Technician",
    });
    const goUrl = buildTechGoUrl(session.techToken);
    await sendSms(
      params.techPhone,
      smsStaffGoLinkBody({ customerName: params.customerName, goUrl }),
      "tech-go-link-accept",
      {
        context: {
          userId: params.userId,
          operation: "tech_go_link",
          bookingId: params.bookingId,
        },
      },
    );
  } catch (e) {
    console.warn("[tech-dispatch] go link after accept", e);
  }
}

export async function handleOnMyWaySmsReply(params: {
  userId: string;
  fromPhone: string;
  body: string;
}): Promise<{ handled: boolean; replyBody: string }> {
  const departing = parseDepartingPhrase(params.body);
  const minutes = parseOnMyWayMinutes(params.body);
  if (!departing && minutes === null) {
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
        "Staff: approve the visit first. Then text DEPARTING — we notify the customer + live map.",
    };
  }

  if (minutes !== null) {
    const user = await findUserById(params.userId);
    const shopName = resolveShopDisplayName(user?.shopName);
    const apptEtaSent = await handleApptEtaReply({
      userId: params.userId,
      bookingId,
      etaMinutes: minutes,
      shopName,
    });
    if (apptEtaSent) {
      return {
        handled: true,
        replyBody: `Sent to customer — ETA ~${minutes} min. (You replied to the shop line; they got the text.)`,
      };
    }
  }

  const sent = await notifyCustomerOnMyWay({
    userId: params.userId,
    bookingId,
    etaMinutes: minutes,
    techName,
    customerName,
    staffPhone: params.fromPhone,
    departed: departing || minutes !== null,
  });

  if (!sent.ok) {
    return {
      handled: true,
      replyBody: `Could not text customer: ${sent.error ?? "SMS failed"}.`,
    };
  }

  if (minutes !== null) {
    return {
      handled: true,
      replyBody: `Sent to customer — ETA ~${minutes} min. (You replied to the shop line; they got the text.)`,
    };
  }

  return {
    handled: true,
    replyBody:
      "Sent to customer — on the way + live map. Open the GPS link we texted you to share location.",
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
