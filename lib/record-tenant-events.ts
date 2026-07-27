import { dashboardUi } from "./content";
import { friendlyJobberSyncBody } from "./jobber-sync-message";
import type { RequestStatus } from "./booking-policy";
import {
  isCallbackRequest,
  isEmergencyCall,
  isVoicemail,
} from "./call-signals";
import type { JobPriority } from "./types";
import { appendTenantEvent, type TenantEventType } from "./tenant-events";

function bookingHref(bookingId: string): string {
  return `/dashboard/bookings/${encodeURIComponent(bookingId)}`;
}

export async function recordServiceRequestCreated(params: {
  userId: string;
  bookingId: string;
  callId?: string;
  customerName: string;
  issueType: string;
  cityState?: string;
  priority: JobPriority;
}): Promise<void> {
  await appendTenantEvent({
    userId: params.userId,
    type: "service_request_created",
    title: dashboardUi.notificationEvents.reviewRequest,
    body: `${params.customerName} · ${params.issueType}${params.cityState ? ` · ${params.cityState}` : ""}`,
    bookingId: params.bookingId,
    callId: params.callId,
    href: bookingHref(params.bookingId),
    urgency: params.priority === "P1" ? "high" : "medium",
  });
}

const STATUS_EVENT: Partial<
  Record<RequestStatus, { type: TenantEventType; title: string }>
> = {
  approved: { type: "service_request_approved", title: dashboardUi.notificationEvents.approved },
  rejected: { type: "service_request_rejected", title: dashboardUi.notificationEvents.rejected },
  scheduled: { type: "service_request_scheduled", title: dashboardUi.notificationEvents.scheduled },
  completed: { type: "service_request_completed", title: dashboardUi.notificationEvents.completed },
};

export async function recordRequestStatusChange(params: {
  userId: string;
  bookingId: string;
  status: RequestStatus;
  customerName?: string;
}): Promise<void> {
  const meta = STATUS_EVENT[params.status];
  if (!meta) return;

  await appendTenantEvent({
    userId: params.userId,
    type: meta.type,
    title: meta.title,
    body: params.customerName ?? params.bookingId,
    bookingId: params.bookingId,
    href: bookingHref(params.bookingId),
    urgency: params.status === "rejected" ? "low" : "medium",
  });
}

const JOBBER_SYNC_FAIL_EVENT_ID = "jobber-sync-failed";

export async function recordJobberSyncFailed(params: {
  userId: string;
  message: string;
}): Promise<void> {
  await appendTenantEvent({
    id: JOBBER_SYNC_FAIL_EVENT_ID,
    userId: params.userId,
    type: "jobber_sync_failed",
    title: dashboardUi.notificationEvents.jobberFail,
    body: friendlyJobberSyncBody(params.message),
    href: "/settings?section=jobber",
    urgency: "high",
  });
}

export async function recordCallSignalEvents(params: {
  userId: string;
  callId: string;
  bookingId: string;
  customerName: string;
  symptom?: string;
  priority?: JobPriority;
  transcript?: string;
  recordingUrl?: string | null;
}): Promise<void> {
  const href = bookingHref(params.bookingId);
  const label = params.customerName || dashboardUi.notificationEvents.caller;
  const detail = params.symptom?.trim() || dashboardUi.notificationEvents.inboundCall;

  if (isEmergencyCall(params.priority)) {
    await appendTenantEvent({
      id: `emergency-${params.callId}`,
      userId: params.userId,
      type: "emergency_call",
      title: dashboardUi.notificationEvents.emergency,
      body: `${label} · ${detail}`,
      bookingId: params.bookingId,
      callId: params.callId,
      href,
      urgency: "high",
    });
  }

  const callLike = {
    transcript: params.transcript,
    symptom: params.symptom,
    arrivalWindow: undefined,
    recordingUrl: params.recordingUrl ?? undefined,
  };

  if (isCallbackRequest(callLike)) {
    await appendTenantEvent({
      id: `callback-${params.callId}`,
      userId: params.userId,
      type: "callback_requested",
      title: dashboardUi.notificationEvents.callback,
      body: `${label} · ${detail}`,
      bookingId: params.bookingId,
      callId: params.callId,
      href,
      urgency: "medium",
    });
  }

  if (isVoicemail(callLike)) {
    await appendTenantEvent({
      id: `voicemail-${params.callId}`,
      userId: params.userId,
      type: "voicemail_received",
      title: dashboardUi.notificationEvents.voicemail,
      body: `${label} · ${params.recordingUrl ? dashboardUi.notificationEvents.recordingReady : dashboardUi.notificationEvents.messageCaptured}`,
      bookingId: params.bookingId,
      callId: params.callId,
      href,
      urgency: "medium",
    });
  }
}

export async function recordLinkIntakeCustomerUpdated(params: {
  userId: string;
  bookingId: string;
  callId: string;
  customerName: string;
  issueType: string;
  cityState?: string;
}): Promise<void> {
  await appendTenantEvent({
    userId: params.userId,
    type: "customer_corrected",
    title: "Customer corrected intake",
    body: `${params.customerName} · ${params.issueType}${params.cityState ? ` · ${params.cityState}` : ""} (문자 링크)`,
    bookingId: params.bookingId,
    callId: params.callId,
    href: bookingHref(params.bookingId),
    urgency: "high",
  });
}

export async function recordCallIntakeFailed(params: {
  userId: string;
  callSid?: string;
  message: string;
}): Promise<void> {
  await appendTenantEvent({
    userId: params.userId,
    type: "call_intake_failed",
    title: dashboardUi.notificationEvents.intakeFailed,
    body: params.message,
    callId: params.callSid,
    urgency: "high",
  });
}

export async function recordSmsDeliveryFailed(params: {
  userId: string;
  operation: string;
  message: string;
  bookingId?: string;
  href?: string;
}): Promise<void> {
  await appendTenantEvent({
    userId: params.userId,
    type: "sms_delivery_failed",
    title: dashboardUi.notificationEvents.smsFailed,
    body: `${params.operation}: ${params.message}`,
    bookingId: params.bookingId,
    href: params.href ?? "/settings?section=contact",
    urgency: "high",
  });
}
