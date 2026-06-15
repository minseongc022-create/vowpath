import { dashboardUi } from "./content";
import { isPendingShopReview } from "./booking-policy";
import type { RequestStatus } from "./booking-policy";
import {
  isCallbackRequest,
  isEmergencyCall,
  isVoicemail,
} from "./call-signals";
import {
  buildAllRecentBookings,
  formatBookingListHeadline,
  formatBookingListSubtitle,
  formatBookingTimeAgo,
} from "./recent-bookings";
import type { TenantEvent, TenantEventType } from "./tenant-events";
import type { JobberBookingRecord } from "./jobber-bookings";
import type { CallRecord } from "./operations-analytics";
import type { JobCard } from "./types";

export type NotificationType =
  | "booking_created"
  | "emergency_call"
  | "callback_request"
  | "jobber_sync_success"
  | "jobber_sync_failed"
  | "voicemail_received"
  | "sms_delivery_failed";

export type NotificationFilter =
  | "all"
  | "bookings"
  | "emergency"
  | "callbacks"
  | "jobber"
  | "voicemail";

export type DashboardNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  href?: string;
  urgency: "high" | "medium" | "low";
};

export function getNotificationFilters(): { id: NotificationFilter; label: string }[] {
  const nf = dashboardUi.notifications.filters;
  return [
    { id: "all", label: nf.all },
    { id: "bookings", label: nf.bookings },
    { id: "emergency", label: nf.emergency },
    { id: "callbacks", label: nf.callbacks },
    { id: "jobber", label: nf.jobber },
    { id: "voicemail", label: nf.voicemail },
  ];
}

function bookingHref(bookingId: string): string {
  return `/dashboard/bookings/${encodeURIComponent(bookingId)}`;
}

function callHref(
  call: CallRecord,
  bookings: ReturnType<typeof buildAllRecentBookings>,
): string {
  const linked = bookings.find((b) => b.jobberJobId && b.jobberJobId === call.jobberRequestId);
  if (linked) return bookingHref(linked.id);
  return bookingHref(`call-${call.id}`);
}

export type BuildNotificationsInput = {
  jobs: JobCard[];
  jobberBookings: JobberBookingRecord[];
  calls: CallRecord[];
  jobberConnected: boolean;
  jobberError: string | null;
  jobberSyncedAt?: string | null;
  jobberAccountName?: string | null;
  maxAgeDays?: number;
  requestStatuses?: Record<string, RequestStatus>;
  tenantEvents?: TenantEvent[];
  dismissedIds?: string[];
};

function tenantEventToNotificationType(
  type: TenantEventType,
): NotificationType | null {
  switch (type) {
    case "service_request_created":
      return "booking_created";
    case "emergency_call":
      return "emergency_call";
    case "callback_requested":
      return "callback_request";
    case "voicemail_received":
      return "voicemail_received";
    case "jobber_sync_failed":
      return "jobber_sync_failed";
    case "sms_delivery_failed":
      return "sms_delivery_failed";
    default:
      return null;
  }
}

function mapTenantEvent(event: TenantEvent): DashboardNotification | null {
  const type = tenantEventToNotificationType(event.type);
  if (!type) return null;
  return {
    id: `event-${event.id}`,
    type,
    title: event.title,
    body: event.body,
    createdAt: event.createdAt,
    href: event.href,
    urgency: event.urgency,
  };
}

export function buildDashboardNotifications(
  input: BuildNotificationsInput,
): DashboardNotification[] {
  const {
    jobs,
    jobberBookings,
    calls,
    jobberConnected,
    jobberError,
    jobberSyncedAt,
    jobberAccountName,
    maxAgeDays = 14,
    requestStatuses = {},
    tenantEvents = [],
    dismissedIds = [],
  } = input;

  const dismissedSet = new Set(dismissedIds);
  const cutoff = Date.now() - maxAgeDays * 86_400_000;
  const inRange = (iso: string) => new Date(iso).getTime() >= cutoff;

  const bookings = buildAllRecentBookings(
    jobs,
    jobberBookings,
    calls,
    requestStatuses,
  );
  const items: DashboardNotification[] = [];
  const seen = new Set<string>();
  const eventBookingIds = new Set(
    tenantEvents.map((e) => e.bookingId).filter((id): id is string => Boolean(id)),
  );
  const eventCallIds = new Set(
    tenantEvents.map((e) => e.callId).filter((id): id is string => Boolean(id)),
  );

  const push = (n: DashboardNotification) => {
    if (seen.has(n.id) || dismissedSet.has(n.id) || !inRange(n.createdAt)) return;
    seen.add(n.id);
    items.push(n);
  };

  const latestJobberFail = tenantEvents.find((e) => e.type === "jobber_sync_failed");
  for (const event of tenantEvents) {
    if (event.type === "jobber_sync_failed" && event.id !== latestJobberFail?.id) {
      continue;
    }
    const mapped = mapTenantEvent(event);
    if (mapped) push(mapped);
  }

  for (const booking of bookings) {
    if (!isPendingShopReview(booking.status)) continue;
    if (eventBookingIds.has(booking.id)) continue;
    push({
      id: `booking-${booking.id}`,
      type: "booking_created",
      title: dashboardUi.notificationEvents.reviewRequest,
      body: `${formatBookingListHeadline(booking)} — ${formatBookingListSubtitle(booking)}`,
      createdAt: booking.createdAt,
      href: bookingHref(booking.id),
      urgency: booking.priority === "P1" ? "high" : "medium",
    });
  }

  for (const call of calls) {
    if (eventCallIds.has(call.id)) continue;

    if (isEmergencyCall(call.priority) && inRange(call.createdAt)) {
      push({
        id: `emergency-${call.id}`,
        type: "emergency_call",
        title: dashboardUi.notificationEvents.emergency,
        body: `${call.customerName || call.from} · ${call.symptom || dashboardUi.notificationEvents.p1Emergency}`,
        createdAt: call.createdAt,
        href: callHref(call, bookings),
        urgency: "high",
      });
    }

    if (isCallbackRequest(call) && inRange(call.createdAt)) {
      push({
        id: `callback-${call.id}`,
        type: "callback_request",
        title: dashboardUi.notificationEvents.callback,
        body: `${call.customerName || call.from} · ${call.symptom || dashboardUi.notificationEvents.followUp}`,
        createdAt: call.createdAt,
        href: callHref(call, bookings),
        urgency: "medium",
      });
    }

    if (isVoicemail(call) && inRange(call.createdAt)) {
      push({
        id: `voicemail-${call.id}`,
        type: "voicemail_received",
        title: dashboardUi.notificationEvents.voicemail,
        body: `${call.customerName || call.from} · ${call.recordingUrl ? dashboardUi.notificationEvents.recordingReady : dashboardUi.notificationEvents.messageCaptured}`,
        createdAt: call.createdAt,
        href: callHref(call, bookings),
        urgency: "medium",
      });
    }
  }

  const hasJobberFailEvent = tenantEvents.some((e) => e.type === "jobber_sync_failed");
  if (jobberConnected && jobberError && !hasJobberFailEvent) {
    push({
      id: "jobber-fail-active",
      type: "jobber_sync_failed",
      title: dashboardUi.notificationEvents.jobberFail,
      body: jobberError,
      createdAt: jobberSyncedAt ?? new Date().toISOString(),
      href: "/settings?section=jobber",
      urgency: "high",
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function filterNotifications(
  items: DashboardNotification[],
  filter: NotificationFilter,
): DashboardNotification[] {
  if (filter === "all") return items;
  if (filter === "bookings") return items.filter((n) => n.type === "booking_created");
  if (filter === "emergency") return items.filter((n) => n.type === "emergency_call");
  if (filter === "callbacks") return items.filter((n) => n.type === "callback_request");
  if (filter === "jobber") {
    return items.filter(
      (n) => n.type === "jobber_sync_success" || n.type === "jobber_sync_failed",
    );
  }
  if (filter === "voicemail") return items.filter((n) => n.type === "voicemail_received");
  return items;
}

export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case "booking_created":
      return "🟢";
    case "emergency_call":
      return "🔴";
    case "callback_request":
      return "🟡";
    case "jobber_sync_success":
      return "🔵";
    case "jobber_sync_failed":
      return "🟠";
    case "voicemail_received":
      return "🟣";
    case "sms_delivery_failed":
      return "📵";
    default:
      return "⚪";
  }
}

export function formatNotificationTime(iso: string, nowMs = Date.now()): string {
  return formatBookingTimeAgo(iso, nowMs);
}

export function countUnread(
  items: DashboardNotification[],
  readIds: Set<string>,
): number {
  return items.filter((n) => !readIds.has(n.id)).length;
}
