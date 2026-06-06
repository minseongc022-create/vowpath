"use client";

import Link from "next/link";
import { vowDashboard } from "@/lib/content";
import { ROUTES } from "@/lib/constants";
import { formatBookingReceivedLabel, type RecentBooking } from "@/lib/recent-bookings";
import { useRelativeNow } from "@/lib/hooks/use-relative-now";
import { lookupStoredRequestStatus } from "@/lib/request-status-resolve";
import { isApprovedBooking, type RequestStatus } from "@/lib/booking-policy";

const v = vowDashboard.upcoming;

type DashboardUpcomingBookingsProps = {
  bookings: RecentBooking[];
  requestStatuses: Record<string, RequestStatus>;
};

export function DashboardUpcomingBookings({
  bookings,
  requestStatuses,
}: DashboardUpcomingBookingsProps) {
  const nowMs = useRelativeNow();
  return (
    <section className="vow-dash-panel h-full">
      <div className="vow-dash-panel-head border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white">{v.title}</h2>
      </div>
      {bookings.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500">{v.empty}</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {bookings.map((b, i) => {
            const status =
              lookupStoredRequestStatus(b.id, requestStatuses, b.jobberJobId) ?? b.status;
            const confirmed =
              status === "scheduled" || isApprovedBooking(status as RequestStatus);
            const iconTone =
              i % 3 === 0
                ? "text-violet-300 bg-violet-500/15"
                : i % 3 === 1
                  ? "text-emerald-400 bg-emerald-500/15"
                  : "text-amber-400 bg-amber-500/15";

            return (
              <li key={b.id}>
                <Link
                  href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(b.id)}`}
                  className="flex gap-3 px-5 py-4 transition hover:bg-white/[0.02]"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">
                      {formatBookingReceivedLabel(b.createdAt, nowMs)}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-200">
                      {b.issueType}
                    </p>
                    <p className="truncate text-xs text-slate-500">{b.customerName}</p>
                    <span
                      className={`mt-2 inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                        confirmed
                          ? "border-emerald-500/30 text-emerald-300"
                          : "border-amber-500/30 text-amber-200"
                      }`}
                    >
                      {confirmed ? v.confirmed : v.pending}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
