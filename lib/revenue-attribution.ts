import type { StoredCallLog } from "./call-logs";
import type { JobberBookingRecord } from "./jobber-bookings";
import type { StoredJob } from "./jobs-db";
import type { ScheduledBookingRecord } from "./schedule-bookings-db";
import type { RevenueFact } from "./revenue-facts";

export type AttributionMaps = {
  jobToRequestId: Map<string, string>;
  requestToCallId: Map<string, string>;
  requestToBookingId: Map<string, string>;
};

export function buildAttributionMaps(params: {
  calls: StoredCallLog[];
  jobs: StoredJob[];
  jobberBookings: JobberBookingRecord[];
  scheduledBookings: ScheduledBookingRecord[];
}): AttributionMaps {
  const jobToRequestId = new Map<string, string>();
  const requestToCallId = new Map<string, string>();
  const requestToBookingId = new Map<string, string>();

  for (const booking of params.jobberBookings) {
    for (const jobId of booking.jobIds) {
      jobToRequestId.set(jobId, booking.requestId);
    }
  }

  for (const row of params.scheduledBookings) {
    if (row.jobberJobId && row.jobberRequestId) {
      jobToRequestId.set(row.jobberJobId, row.jobberRequestId);
    }
    if (row.jobberRequestId) {
      requestToBookingId.set(row.jobberRequestId, row.bookingId);
    }
  }

  for (const call of params.calls) {
    if (!call.jobberRequestId) continue;
    requestToCallId.set(call.jobberRequestId, call.id);
    requestToBookingId.set(call.jobberRequestId, `call-${call.id}`);
  }

  for (const job of params.jobs) {
    if (job.jobberJobId) {
      jobToRequestId.set(job.jobberJobId, job.jobberJobId);
      if (job.sourceCallId) {
        requestToCallId.set(job.jobberJobId, job.sourceCallId);
        requestToBookingId.set(job.jobberJobId, job.id);
      }
    }
  }

  return { jobToRequestId, requestToCallId, requestToBookingId };
}

export function attributeInvoiceJobs(
  invoice: {
    invoiceId: string;
    invoiceNumber?: string;
    invoiceStatus: string;
    issuedDate?: string;
    collectedCents: number;
    invoicedCents: number;
    outstandingCents: number;
    jobberJobIds: string[];
    jobberWebUri?: string;
  },
  maps: AttributionMaps,
  now = new Date(),
): RevenueFact {
  let jobberRequestId: string | undefined;
  let vowpathCallId: string | undefined;
  let vowpathBookingId: string | undefined;

  for (const jobId of invoice.jobberJobIds) {
    const requestId = maps.jobToRequestId.get(jobId);
    if (!requestId) continue;
    jobberRequestId = requestId;
    vowpathCallId = maps.requestToCallId.get(requestId);
    vowpathBookingId = maps.requestToBookingId.get(requestId);
    if (vowpathCallId || vowpathBookingId) break;
  }

  if (!vowpathCallId && !vowpathBookingId && jobberRequestId) {
    vowpathCallId = maps.requestToCallId.get(jobberRequestId);
    vowpathBookingId = maps.requestToBookingId.get(jobberRequestId);
  }

  const attributedToVowpath = Boolean(vowpathCallId || vowpathBookingId);

  return {
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceStatus: invoice.invoiceStatus,
    issuedDate: invoice.issuedDate,
    collectedCents: invoice.collectedCents,
    invoicedCents: invoice.invoicedCents,
    outstandingCents: invoice.outstandingCents,
    jobberJobIds: invoice.jobberJobIds,
    jobberRequestId,
    vowpathCallId,
    vowpathBookingId,
    attributedToVowpath,
    jobberWebUri: invoice.jobberWebUri,
    updatedAt: now.toISOString(),
  };
}
