import type { RequestStatus } from "./booking-policy";
import { getCustomerRequestStatusLabels } from "./booking-policy";
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
import { isAddressPending } from "./address/pending";
import {
  markAddressConfirmed,
  needsAddressConfirmationUi,
  requiresAddressConfirmation,
} from "./address/confirmation";

export type CustomerBookingPortalView = LinkIntakeBookingView & {
  status: RequestStatus;
  statusLabel: string;
  arrivalWindow: string;
  portalToken: string;
  canCancel: boolean;
  canReschedule: boolean;
  /** True when the booking has no visit window yet — portal should open on the time picker. */
  needsSchedule: boolean;
  /**
   * True when address must be collected or re-confirmed on the portal
   * (missing, low confidence, or phone spoken address awaiting confirm).
   */
  needsAddress: boolean;
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

  const baseView = callToLinkIntakeBookingView(call);
  const terminal = status === "rejected" || status === "completed";
  const hasScheduledSlot = Boolean(scheduled?.scheduledStartAt);
  // First-time schedule (phone intake without verbal slot) OR later reschedule.
  const canReschedule =
    !terminal &&
    (status === "scheduled" ||
      status === "approved" ||
      status === "pending_review");
  const needsSchedule = canReschedule && !hasScheduledSlot;
  const needsAddress =
    !terminal &&
    needsAddressConfirmationUi(call.addressConfirmation, baseView.address);
  const canCancel = !terminal;

  const arrivalWindow =
    scheduled?.arrivalWindowLabel?.trim() ||
    call.arrivalWindow?.trim() ||
    (needsSchedule
      ? needsAddress
        ? "Confirm address & pick a visit window"
        : "Not set yet — pick a visit window"
      : "Pending — we'll confirm your window soon");

  // After the job is done/cancelled: keep request # + status, hide PII until link expires.
  if (terminal) {
    return {
      ...baseView,
      customerName: baseView.customerName ? "Customer" : "",
      phone: "",
      address: "",
      issueType: "",
      bookingId,
      status,
      statusLabel: getCustomerRequestStatusLabels()[status] ?? status,
      arrivalWindow: status === "completed" ? "Visit complete" : "Cancelled",
      portalToken: params.token,
      canCancel,
      canReschedule,
      needsSchedule: false,
      needsAddress: false,
    };
  }

  return {
    ...baseView,
    bookingId,
    status,
    statusLabel: getCustomerRequestStatusLabels()[status] ?? status,
    arrivalWindow,
    portalToken: params.token,
    canCancel,
    canReschedule,
    needsSchedule,
    needsAddress,
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
  /** Spoken or edited address from the portal (required when confirmation still pending). */
  address?: string;
}): Promise<
  | { ok: true; arrivalWindow: string }
  | { ok: false; error: string }
> {
  const { resolveLinkIntakeSlot } = await import("./call-intake/link-intake-flow");
  const { commitSlotBooking } = await import("./scheduling/commit-slot");
  const { persistRequestStatusForBooking } = await import("./booking-status-sync");
  const { notifyCustomerScheduled } = await import("./scheduling/schedule-sms");
  const { buildBookingPortalUrl } = await import("./portal-url");

  const calls = await listCallLogs(params.userId);
  const call = calls.find((c) => c.id === params.callId);
  if (!call) return { ok: false, error: "Booking not found." };

  const nextAddress = (params.address ?? call.address ?? "").trim();
  if (isAddressPending(nextAddress)) {
    return { ok: false, error: "Confirm your full service address first." };
  }

  // Low-confidence / missing phone addresses must be explicitly confirmed on the portal.
  if (
    requiresAddressConfirmation(call.addressConfirmation, call.address) &&
    !params.address?.trim()
  ) {
    return { ok: false, error: "Confirm your full service address first." };
  }

  const addressConfirmation = markAddressConfirmed({
    previous: call.addressConfirmation,
    confirmedAddress: nextAddress,
  });

  const shouldPatchAddress =
    Boolean(params.address?.trim()) || nextAddress !== (call.address ?? "").trim();

  await patchCallLog(params.userId, params.callId, {
    ...(shouldPatchAddress ? { address: nextAddress } : {}),
    addressConfirmation,
  });

  if (shouldPatchAddress) {
    try {
      const jobs = await listJobs(params.userId);
      const job = jobs.find((j) => j.id === params.bookingId || j.sourceCallId === params.callId);
      if (job) {
        const { upsertJobRecord } = await import("./jobs-db");
        await upsertJobRecord(params.userId, {
          ...job,
          address: nextAddress,
        });
      }
    } catch {
      /* optional */
    }
  }

  const urgency = params.urgency ?? "this_week";
  const excludeBookingId = params.bookingId;

  const priority = linkUrgencyToPriority(urgency);
  const slot = await resolveLinkIntakeSlot(
    params.userId,
    urgency,
    params.slotId,
    { excludeBookingId },
  );

  if (!slot) {
    return { ok: false, error: "That time is no longer available. Pick another window." };
  }

  const { getShopBookingSettings } = await import("./shop-settings-db");
  const bookingSettings = await getShopBookingSettings(params.userId);
  const isPractice = bookingSettings.shadowModeRemaining > 0;

  const committed = await commitSlotBooking({
    userId: params.userId,
    bookingId: params.bookingId,
    slot,
    priority,
    excludeBookingId,
    isPractice,
  });

  if (!committed.ok) {
    return { ok: false, error: "That time is no longer available. Pick another window." };
  }

  await patchCallLog(params.userId, params.callId, {
    arrivalWindow: committed.slot.label,
  });

  const { getRequestStatuses } = await import("./requests-db");
  const { lookupStoredRequestStatus } = await import("./request-status-resolve");
  const { normalizeRequestStatus } = await import("./booking-policy");
  const statuses = await getRequestStatuses(params.userId);
  const current = normalizeRequestStatus(
    lookupStoredRequestStatus(params.bookingId, statuses) ?? "pending_review",
  );
  // Already on the calendar — only update the slot; do not re-fire approve/dispatch side effects.
  if (current !== "scheduled") {
    await persistRequestStatusForBooking(params.userId, params.bookingId, "scheduled", {
      skipCustomerSms: true,
    });
  }

  const token = await findPortalTokenForBooking(params.userId, params.bookingId);
  const portalUrl = token ? buildBookingPortalUrl(token) : undefined;

  try {
    await notifyCustomerScheduled({
      userId: params.userId,
      bookingId: params.bookingId,
      phone: call.callbackPhone ?? call.from,
      window: committed.slot.label,
      address: nextAddress,
      priority: call.priority ?? "P2",
      portalUrl,
      customerName: params.customerName,
      dedupeKey: `${params.bookingId}:reschedule:${committed.slot.startAt}`,
    });
  } catch {
    /* optional */
  }

  try {
    const { notifyOwnerLinkIntakeUpdated } = await import("./link-intake-owner-notify");
    await notifyOwnerLinkIntakeUpdated({
      userId: params.userId,
      bookingId: params.bookingId,
      customerName: params.customerName,
      issueType: `Rescheduled → ${committed.slot.label}`,
      address: nextAddress,
      cityState: "",
      priority: call.priority ?? "P2",
    });
  } catch {
    /* optional */
  }

  return { ok: true, arrivalWindow: committed.slot.label };
}
