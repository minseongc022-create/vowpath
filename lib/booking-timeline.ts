import type { CustomerVerificationRecord } from "./customer-verification/types";
import type { TenantEvent } from "./tenant-events";

export type BookingTimelineEntry = {
  id: string;
  at: string;
  title: string;
  detail?: string;
};

type DetailLike = {
  id: string;
  createdAt: string;
  linkedCallId?: string | null;
  jobberJobId?: string | null;
};

const EVENT_TITLE: Record<string, string> = {
  service_request_created: "Intake Submitted",
  service_request_approved: "Approved",
  service_request_rejected: "Declined",
  service_request_scheduled: "Calendar Updated",
  service_request_completed: "Completed",
  emergency_call: "Urgent Request Detected",
  callback_requested: "Callback Requested",
  voicemail_received: "Voicemail Captured",
  jobber_sync_failed: "Jobber Sync Failed",
  customer_corrected: "Customer Corrected",
  customer_verified: "Customer Verified",
  booking_jobber_synced: "Jobber Synced",
};

export function buildBookingTimeline(params: {
  detail: DetailLike;
  tenantEvents?: TenantEvent[];
  verification?: CustomerVerificationRecord | null;
}): BookingTimelineEntry[] {
  const rows: BookingTimelineEntry[] = [
    {
      id: "created",
      at: params.detail.createdAt,
      title: params.detail.linkedCallId ? "Customer Called" : "Request Created",
      detail: params.detail.linkedCallId
        ? "Call record linked to this booking."
        : "Booking record created.",
    },
    {
      id: "ai-answered",
      at: params.detail.createdAt,
      title: "AI Answered",
      detail: "Verified from the stored intake timestamp.",
    },
  ];

  for (const event of params.tenantEvents ?? []) {
    if (event.bookingId !== params.detail.id) continue;
    rows.push({
      id: event.id,
      at: event.createdAt,
      title: EVENT_TITLE[event.type] ?? event.title,
      detail: event.body,
    });
  }

  if (params.verification) {
    for (const entry of params.verification.timeline) {
      rows.push({
        id: `verification-${entry.at}-${entry.message}`,
        at: entry.at,
        title: entry.message.toLowerCase().includes("correction")
          ? "Customer Corrected"
          : "Customer Verified",
        detail: entry.message,
      });
    }
  }

  if (params.detail.jobberJobId) {
    rows.push({
      id: "jobber-linked",
      at: params.detail.createdAt,
      title: "Jobber Synced",
      detail: "A Jobber request id is linked to this booking.",
    });
  }

  const seen = new Set<string>();
  return rows
    .filter((row) => row.at && !Number.isNaN(new Date(row.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .filter((row) => {
      const key = `${row.title}-${row.at}-${row.detail ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
