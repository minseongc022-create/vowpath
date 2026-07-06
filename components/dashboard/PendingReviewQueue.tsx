"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { bookingShortRef } from "@/lib/booking-ref";
import {
  isPendingShopReview,
  REQUEST_STATUS_LABELS,
  normalizeRequestStatus,
} from "@/lib/booking-policy";
import { dashboardUi } from "@/lib/content";
import { ROUTES } from "@/lib/constants";
import { buildAllRecentBookings } from "@/lib/recent-bookings";
import type { JobberBookingRecord } from "@/lib/jobber-bookings";
import type { CallRecord } from "@/lib/operations-analytics";
import type { JobCard } from "@/lib/types";
import type { RequestStatus } from "@/lib/booking-policy";

type Props = {
  jobs: JobCard[];
  calls: CallRecord[];
  jobberBookings: JobberBookingRecord[];
  requestStatuses: Record<string, RequestStatus | string>;
  onStatusChange?: () => void;
};

export function PendingReviewQueue({
  jobs,
  calls,
  jobberBookings,
  requestStatuses,
  onStatusChange,
}: Props) {
  const copy = (
    dashboardUi as {
      pendingReview?: {
        title: string;
        subtitle: string;
        approve: string;
        reject: string;
        empty: string;
        refLabel: string;
        working: string;
      };
    }
  ).pendingReview;

  const title = copy?.title ?? "Pending approval";
  const subtitle = copy?.subtitle ?? "Reply 1/2 by text or approve here";
  const [workingId, setWorkingId] = useState<string | null>(null);

  const pending = useMemo(() => {
    const all = buildAllRecentBookings(
      jobs,
      jobberBookings,
      calls,
      requestStatuses as Record<string, RequestStatus>,
    );
    return all.filter((b) =>
      isPendingShopReview(
        normalizeRequestStatus(
          requestStatuses[b.id] ?? b.status,
        ),
      ),
    );
  }, [jobs, jobberBookings, calls, requestStatuses]);

  const updateStatus = useCallback(
    async (bookingId: string, status: "approved" | "rejected") => {
      setWorkingId(bookingId);
      try {
        const res = await fetch("/api/bookings/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: bookingId, status }),
        });
        if (res.ok) onStatusChange?.();
      } finally {
        setWorkingId(null);
      }
    },
    [onStatusChange],
  );

  return (
    <section className="vow-dash-card !p-0 overflow-hidden border-amber-200/80">
      <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-4">
        <h2 className="text-lg font-semibold text-amber-950">{title}</h2>
        <p className="mt-1 text-sm text-amber-800/90">{subtitle}</p>
      </div>
      {pending.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">
          {copy?.empty ?? "No requests waiting."}
        </p>
      ) : (
      <ul className="divide-y divide-slate-100">
        {pending.map((b) => {
          const ref = bookingShortRef(b.id);
          const busy = workingId === b.id;
          const statusLabel =
            REQUEST_STATUS_LABELS[
              normalizeRequestStatus(requestStatuses[b.id] ?? b.status)
            ];
          return (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-white">
                  {b.customerName || "Customer"}
                  <span className="ml-2 font-mono text-xs text-slate-400">
                    {copy?.refLabel ?? "Ref"} {ref}
                  </span>
                </p>
                <p className="text-sm text-slate-400">
                  {b.issueType || "Service request"} · {statusLabel}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void updateStatus(b.id, "approved")}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {busy ? copy?.working ?? "Saving…" : copy?.approve ?? "Approve"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void updateStatus(b.id, "rejected")}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {copy?.reject ?? "Reject"}
                </button>
                <Link
                  href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(b.id)}`}
                  className="rounded-lg px-3 py-1.5 text-sm text-brand-400 hover:underline"
                >
                  View
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </section>
  );
}
