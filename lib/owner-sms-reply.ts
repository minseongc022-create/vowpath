import {
  canApprove,
  canReject,
  isPendingShopReview,
  normalizeRequestStatus,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
} from "./booking-policy";
import { persistRequestStatusForBooking } from "./booking-status-sync";
import { listCallLogs } from "./call-logs";
import { listJobs } from "./jobs-db";
import { normalizeSmsPhone } from "./phone";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import { getRequestStatuses } from "./requests-db";
import { getTwilioDefaultUserId } from "./twilio-config";
import { clearSmsReplyTarget, getSmsReplyTarget } from "./sms-reply-context";
import { getScheduledBooking, listScheduledBookings } from "./schedule-bookings-db";
import { undoScheduledBooking } from "./scheduling/apply-schedule";
import { resolveShopDisplayName } from "./link-intake-brand";
import { findUserById, findUserByPhone } from "./users-db";

export type OwnerSmsReplyAction = "approve" | "reject" | "undo";

export function parseOwnerSmsReplyCode(body: string): OwnerSmsReplyAction | null {
  const trimmed = body.trim();
  const first = trimmed.split(/\s+/)[0]?.replace(/[^\d]/g, "") ?? "";
  if (first === "1") return "approve";
  if (first === "2") return "reject";
  if (first === "9") return "undo";
  return null;
}

type PendingCandidate = {
  bookingId: string;
  createdAt: string;
  customerName: string;
  status: RequestStatus;
};

function resolveStatus(
  bookingId: string,
  statuses: Record<string, RequestStatus>,
  jobberJobId?: string,
  fallback?: string,
): RequestStatus {
  const stored = lookupStoredRequestStatus(bookingId, statuses, jobberJobId);
  if (stored) return stored;
  return normalizeRequestStatus(fallback);
}

export async function findLatestPendingBooking(
  userId: string,
): Promise<PendingCandidate | null> {
  const [jobs, callLogs, statuses] = await Promise.all([
    listJobs(userId),
    listCallLogs(userId),
    getRequestStatuses(userId),
  ]);

  const candidates: PendingCandidate[] = [];

  for (const job of jobs) {
    const bookingId = job.jobberJobId ? `jobber-${job.jobberJobId}` : job.id;
    const status = resolveStatus(bookingId, statuses, job.jobberJobId, job.status);
    if (!isPendingShopReview(status)) continue;
    candidates.push({
      bookingId,
      createdAt: job.createdAt,
      customerName: job.customerName || "Customer",
      status,
    });
  }

  for (const call of callLogs) {
    const bookingId = call.jobberRequestId
      ? `jobber-${call.jobberRequestId}`
      : `call-${call.id}`;
    if (candidates.some((c) => c.bookingId === bookingId)) continue;
    const status = resolveStatus(bookingId, statuses, call.jobberRequestId);
    if (!isPendingShopReview(status)) continue;
    candidates.push({
      bookingId,
      createdAt: call.createdAt,
      customerName: call.customerName || call.from || "Customer",
      status,
    });
  }

  for (const [id, rawStatus] of Object.entries(statuses)) {
    const status = normalizeRequestStatus(rawStatus);
    if (!isPendingShopReview(status)) continue;
    if (candidates.some((c) => c.bookingId === id)) continue;

    const fromCall = callLogs.find(
      (c) => id === `call-${c.id}` || id === c.jobberRequestId || id === `jobber-${c.jobberRequestId}`,
    );
    const fromJob = jobs.find(
      (j) => id === j.id || id === j.jobberJobId || id === `jobber-${j.jobberJobId}`,
    );
    const createdAt =
      fromCall?.createdAt ?? fromJob?.createdAt ?? new Date(0).toISOString();
    const customerName =
      fromCall?.customerName ??
      fromJob?.customerName ??
      "Customer";

    candidates.push({ bookingId: id, createdAt, customerName, status });
  }

  candidates.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return candidates[0] ?? null;
}

async function resolvePendingByBookingId(
  userId: string,
  bookingId: string,
): Promise<PendingCandidate | null> {
  const [jobs, callLogs, statuses] = await Promise.all([
    listJobs(userId),
    listCallLogs(userId),
    getRequestStatuses(userId),
  ]);

  const job = jobs.find(
    (j) =>
      bookingId === j.id ||
      bookingId === `jobber-${j.jobberJobId}` ||
      (bookingId.startsWith("call-") && j.sourceCallId === bookingId.slice("call-".length)),
  );
  const call = callLogs.find(
    (c) =>
      bookingId === `call-${c.id}` ||
      bookingId === `jobber-${c.jobberRequestId}` ||
      c.jobberRequestId === bookingId.replace(/^jobber-/, ""),
  );

  const status = resolveStatus(
    bookingId,
    statuses,
    call?.jobberRequestId ?? job?.jobberJobId,
    job?.status,
  );
  if (!isPendingShopReview(status)) return null;

  return {
    bookingId,
    createdAt: call?.createdAt ?? job?.createdAt ?? new Date().toISOString(),
    customerName: call?.customerName ?? job?.customerName ?? "Customer",
    status,
  };
}

export async function resolveOwnerUserIdFromSms(fromRaw: string): Promise<string | null> {
  const from = normalizeSmsPhone(fromRaw);
  if (!from) return null;

  const user = await findUserByPhone(from);
  if (user) return user.id;

  const alert = process.env.TWILIO_OWNER_ALERT_PHONE?.trim();
  if (alert && normalizeSmsPhone(alert) === from) {
    const allowAlert =
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_TWILIO_OWNER_ALERT === "true";
    if (!allowAlert) return null;
    return getTwilioDefaultUserId() ?? null;
  }

  return null;
}

export type OwnerSmsReplyResult = {
  replyBody: string;
  handled: boolean;
};

/**
 * Process shop owner SMS reply (1 = approve, 2 = reject) for the latest pending request.
 */
export async function handleOwnerSmsReply(params: {
  from: string;
  body: string;
}): Promise<OwnerSmsReplyResult> {
  const action = parseOwnerSmsReplyCode(params.body);
  if (!action) {
    return {
      handled: false,
      replyBody:
        "Reply 1 to approve, 2 to reject, or 9 to undo a recent booking.",
    };
  }

  const userId = await resolveOwnerUserIdFromSms(params.from);
  if (!userId) {
    return {
      handled: false,
      replyBody:
        "Reply 1 to approve or 2 to reject. This number is not registered — add your phone in account settings.",
    };
  }

  const user = await findUserById(userId);
  const shop = resolveShopDisplayName(user?.shopName);

  if (action === "undo") {
    const replyTarget = await getSmsReplyTarget(userId);
    let bookingId = replyTarget;
    if (!bookingId) {
      const rows = await listScheduledBookings(userId);
      const undoable = rows
        .filter((r) => r.undoExpiresAt && new Date(r.undoExpiresAt).getTime() > Date.now())
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];
      bookingId = undoable?.bookingId;
    }
    if (!bookingId) {
      return {
        handled: true,
        replyBody: `${shop}: No recent booking to undo.`,
      };
    }
    const scheduled = await getScheduledBooking(userId, bookingId);
    if (!scheduled?.undoExpiresAt) {
      return {
        handled: true,
        replyBody: `${shop}: Undo window expired or booking not auto-scheduled.`,
      };
    }
    const ok = await undoScheduledBooking(userId, bookingId);
    await clearSmsReplyTarget(userId);
    return {
      handled: true,
      replyBody: ok
        ? `${shop}: Booking undone — moved back to review.`
        : `${shop}: Could not undo. Check your dashboard.`,
    };
  }

  const replyTarget = await getSmsReplyTarget(userId);
  let pending = replyTarget
    ? await resolvePendingByBookingId(userId, replyTarget)
    : null;
  if (!pending) {
    pending = await findLatestPendingBooking(userId);
  }
  if (!pending) {
    return {
      handled: true,
      replyBody: `${shop}: No pending requests to review right now.`,
    };
  }

  const nextStatus: RequestStatus = action === "approve" ? "approved" : "rejected";

  if (action === "approve" && !canApprove(pending.status)) {
    return {
      handled: true,
      replyBody: `${shop}: "${pending.customerName}" is already ${REQUEST_STATUS_LABELS[normalizeRequestStatus(pending.status)]}.`,
    };
  }
  if (action === "reject" && !canReject(pending.status)) {
    return {
      handled: true,
      replyBody: `${shop}: "${pending.customerName}" cannot be rejected (current: ${REQUEST_STATUS_LABELS[normalizeRequestStatus(pending.status)]}).`,
    };
  }

  try {
    await persistRequestStatusForBooking(userId, pending.bookingId, nextStatus);
    await clearSmsReplyTarget(userId);
  } catch (e) {
    console.error("[owner-sms-reply] persist status", e);
    return {
      handled: false,
      replyBody: `${shop}: Could not save status. Try again from your dashboard.`,
    };
  }

  const label = REQUEST_STATUS_LABELS[nextStatus];
  return {
    handled: true,
    replyBody: `${shop}: ${label} — ${pending.customerName}. Customer notified by SMS.`,
  };
}
