import type { RequestStatus } from "./booking-policy";
import { REQUEST_STATUS_LABELS } from "./booking-policy";
import { listCallLogs, patchCallLog, type StoredCallLog } from "./call-logs";
import { listJobs } from "./jobs-db";
import { formatLinkRequestNumber } from "./link-intake-urgency";
import type { LinkIntakeSession } from "./call-intake/link-intake-store";
import { getScheduledBooking } from "./schedule-bookings-db";
import { getRequestStatuses } from "./requests-db";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import { normalizeRequestStatus } from "./booking-policy";
import type { LinkIntakeBookingView } from "./link-intake-portal";
import { callToLinkIntakeBookingView } from "./link-intake-portal";
import type { LinkUrgency } from "./link-intake-urgency";
import { linkUrgencyToPriority } from "./link-intake-urgency";

export type CustomerBookingPortalView = LinkIntakeBookingView & {
  status: RequestStatus;
  statusLabel: string;
  arrivalWindow: string;
  portalToken: string;
  canCancel: boolean;
  canReschedule: boolean;
};

function resolveStatus(
  bookingId: string,
  statuses: Record<string, RequestStatus>,
  fallback?: string,
): RequestStatus {
  const stored = lookupStoredRequestStatus(bookingId, statuses, undefined);
  if (stored) return stored;
  return normalizeRequestStatus(fallback);
}

export async function loadCustomerBookingPortalView(params: {
  session: LinkIntakeSession;
  token: string;
}): Promise<CustomerBookingPortalView | null> {
  if (!params.session.callId) return null;

  const calls = await listCallLogs(params.session.userId);
  const call = calls.find((c) => c.id === params.session.callId);
  if (!call) return null;

  const bookingId =
    params.session.bookingId ?? `call-${call.id}`;
  const statuses = await getRequestStatuses(params.session.userId);
  const status = resolveStatus(bookingId, statuses, "pending_review");
  const scheduled = await getScheduledBooking(params.session.userId, bookingId);

  const base = callToLinkIntakeBookingView(call);
  const arrivalWindow =
    scheduled?.arrivalWindowLabel?.trim() ||
    call.arrivalWindow?.trim() ||
    "Pending — we'll confirm your window soon";

  const terminal = status === "rejected" || status === "completed";
  const hasScheduledSlot = Boolean(scheduled?.scheduledStartAt);
  const canReschedule =
    !terminal &&
    (status === "scheduled" ||
      status === "approved" ||
      (status === "pending_review" && hasScheduledSlot));
  const canCancel = !terminal;

  return {
    ...base,
    bookingId,
    status,
    statusLabel: REQUEST_STATUS_LABELS[status] ?? status,
    arrivalWindow,
    portalToken: params.token,
    canCancel,
    canReschedule,
  };
}

export async function savePortalTokenOnCall(
  userId: string,
  callId: string,
  portalToken: string,
): Promise<void> {
  await patchCallLog(userId, callId, { portalToken });
}

export async function findPortalTokenForBooking(
  userId: string,
  bookingId: string,
): Promise<string | null> {
  const callId = bookingId.startsWith("call-") ? bookingId.slice(5) : null;
  if (!callId) return null;
  const calls = await listCallLogs(userId);
  const call = calls.find((c) => c.id === callId);
  return call?.portalToken ?? null;
}

export async function customerCancelBooking(params: {
  userId: string;
  bookingId: string;
  callId: string;
  customerName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { persistRequestStatusForBooking } = await import("./booking-status-sync");
  const { deleteScheduledBooking } = await import("./schedule-bookings-db");
  const { notifyOwnerLinkIntakeUpdated } = await import("./link-intake-owner-notify");

  await deleteScheduledBooking(params.userId, params.bookingId);
  await persistRequestStatusForBooking(params.userId, params.bookingId, "rejected");

  const calls = await listCallLogs(params.userId);
  const call = calls.find((c) => c.id === params.callId);
  if (call) {
    await patchCallLog(params.userId, params.callId, {
      arrivalWindow: "Cancelled by customer",
    });
  }

  try {
    await notifyOwnerLinkIntakeUpdated({
      userId: params.userId,
      bookingId: params.bookingId,
      customerName: params.customerName,
      issueType: "Customer cancelled visit",
      address: call?.address ?? "",
      cityState: "",
      priority: call?.priority ?? "P2",
    });
  } catch {
    /* optional */
  }

  return { ok: true };
}

export async function customerRescheduleBooking(params: {
  userId: string;
  bookingId: string;
  callId: string;
  slotId: string;
  customerName: string;
  urgency?: LinkUrgency;
}): Promise<
  | { ok: true; arrivalWindow: string }
  | { ok: false; error: string }
> {
  const { resolveLinkIntakeSlot } = await import("./call-intake/link-intake-flow");
  const { offerSlotGridForTenant } = await import("./scheduling/offer-slots");
  const { upsertScheduledBooking } = await import("./schedule-bookings-db");
  const { persistRequestStatusForBooking } = await import("./booking-status-sync");
  const { notifyCustomerScheduled } = await import("./scheduling/schedule-sms");
  const { buildBookingPortalUrl } = await import("./portal-url");

  const calls = await listCallLogs(params.userId);
  const call = calls.find((c) => c.id === params.callId);
  if (!call) return { ok: false, error: "Booking not found." };

  const urgency = params.urgency ?? "this_week";
  const excludeBookingId = params.bookingId;

  let slot = await resolveLinkIntakeSlot(
    params.userId,
    urgency,
    params.slotId,
    { excludeBookingId },
  );

  if (!slot) {
    const priorities = ["P1", "P2", "P3"] as const;
    for (const priority of priorities) {
      if (priority === linkUrgencyToPriority(urgency)) continue;
      const grid = await offerSlotGridForTenant({
        userId: params.userId,
        priority,
        excludeBookingId,
      });
      const match = grid?.days
        .flatMap((day) => day.slots)
        .find((s) => s.id === params.slotId && s.status === "available");
      if (match) {
        const day = grid!.days.find((d) => d.slots.some((s) => s.id === match.id));
        slot = {
          id: match.id,
          label: `${day?.weekdayLabel ?? ""} ${match.label}`.trim(),
          startAt: match.startAt,
          endAt: match.endAt,
          source: match.source,
        };
        break;
      }
    }
  }

  if (!slot) {
    return { ok: false, error: "That time is no longer available. Pick another window." };
  }

  await upsertScheduledBooking(params.userId, {
    bookingId: params.bookingId,
    scheduledStartAt: slot.startAt,
    scheduledEndAt: slot.endAt,
    arrivalWindowLabel: slot.label,
    slotSource: slot.source,
    undoExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  });

  await patchCallLog(params.userId, params.callId, {
    arrivalWindow: slot.label,
  });

  await persistRequestStatusForBooking(params.userId, params.bookingId, "scheduled", {
    skipCustomerSms: true,
  });

  const token = await findPortalTokenForBooking(params.userId, params.bookingId);
  const portalUrl = token ? buildBookingPortalUrl(token) : undefined;

  try {
    await notifyCustomerScheduled({
      userId: params.userId,
      bookingId: params.bookingId,
      phone: call.callbackPhone ?? call.from,
      window: slot.label,
      address: call.address ?? "",
      priority: call.priority ?? "P2",
      portalUrl,
      customerName: params.customerName,
    });
  } catch {
    /* optional */
  }

  return { ok: true, arrivalWindow: slot.label };
}
