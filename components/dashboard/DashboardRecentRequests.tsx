"use client";



import Link from "next/link";

import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";

import { useVowDashboard } from "@/components/providers/LocaleProvider";

import { ROUTES } from "@/lib/constants";

import { formatBookingReceivedLabel, type RecentBooking } from "@/lib/recent-bookings";
import { useRelativeNow } from "@/lib/hooks/use-relative-now";

import { lookupStoredRequestStatus } from "@/lib/request-status-resolve";

import type { RequestStatus } from "@/lib/booking-policy";

import type { CallRecord } from "@/lib/operations-analytics";



function resolvePhone(

  booking: RecentBooking,

  calls: CallRecord[],

): string {

  if (booking.source === "call") {

    const id = booking.id.replace(/^call-/, "");

    const call = calls.find((c) => c.id === id);

    if (call?.from) return call.from;

  }

  const linked = calls.find(

    (c) => c.jobberRequestId && c.jobberRequestId === booking.jobberJobId,

  );

  return linked?.from ?? "—";

}



type DashboardRecentRequestsProps = {

  bookings: RecentBooking[];

  calls: CallRecord[];

  requestStatuses: Record<string, RequestStatus>;

  loading?: boolean;

};



export function DashboardRecentRequests({

  bookings,

  calls,

  requestStatuses,

  loading,

}: DashboardRecentRequestsProps) {
  const v = useVowDashboard().recentRequests;
  const nowMs = useRelativeNow();

  return (

    <section className="vow-dash-panel">

      <div className="vow-dash-panel-head border-b border-white/[0.06]">

        <div>

          <h2 className="text-base font-semibold text-white">{v.title}</h2>

          <p className="mt-0.5 text-xs text-slate-500">{v.subtitle}</p>

        </div>

        <Link href={`${ROUTES.dashboard}/bookings`} className="vow-dash-link">

          {v.viewAll} →

        </Link>

      </div>



      {loading && bookings.length === 0 ? (

        <p className="px-5 py-12 text-center text-sm text-slate-500">Loading…</p>

      ) : bookings.length === 0 ? (

        <p className="px-5 py-12 text-center text-sm text-slate-500">{v.empty}</p>

      ) : (

        <div className="overflow-x-auto">

          <table className="w-full min-w-[640px] text-left text-sm">

            <thead>

              <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-slate-500">

                <th className="px-5 py-3 font-semibold">{v.columns.customer}</th>

                <th className="px-3 py-3 font-semibold">{v.columns.type}</th>

                <th className="px-3 py-3 font-semibold">{v.columns.priority}</th>

                <th className="px-3 py-3 font-semibold">{v.columns.received}</th>

                <th className="px-3 py-3 font-semibold">{v.columns.status}</th>

                <th className="w-8 px-3 py-3" aria-hidden />

              </tr>

            </thead>

            <tbody>

              {bookings.map((b) => {

                const status =

                  lookupStoredRequestStatus(b.id, requestStatuses, b.jobberJobId) ?? b.status;

                const phone = resolvePhone(b, calls);

                return (

                  <tr key={b.id} className="vow-dash-table-row group">

                    <td className="px-5 py-4">

                      <Link

                        href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(b.id)}`}

                        className="block"

                      >

                        <p className="font-semibold text-white group-hover:text-brand-300">

                          {b.customerName}

                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">{phone}</p>

                      </Link>

                    </td>

                    <td className="px-3 py-4">

                      <p className="font-medium text-slate-200">{b.issueType}</p>

                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{b.cityState}</p>

                    </td>

                    <td className="px-3 py-4">

                      <PriorityBadge priority={b.priority} />

                    </td>

                    <td className="px-3 py-4 text-xs tabular-nums text-slate-500">

                      {formatBookingReceivedLabel(b.createdAt, nowMs)}

                    </td>

                    <td className="px-3 py-4">

                      <BookingStatusBadge status={status} />

                    </td>

                    <td className="px-3 py-4 text-slate-600">

                      <Link

                        href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(b.id)}`}

                        aria-label="Details"

                      >

                        ›

                      </Link>

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

      )}

    </section>

  );

}

