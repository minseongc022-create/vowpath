"use client";

import { useEffect, useMemo, useState } from "react";
import { buildBookingTimeline } from "@/lib/booking-timeline";
import type { BookingDetail } from "@/lib/booking-detail";
import type { CustomerVerificationRecord } from "@/lib/customer-verification/types";
import type { TenantEvent } from "@/lib/tenant-events";

function formatTimelineTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingTimelinePanel({
  detail,
  tenantEvents,
  verification,
}: {
  detail: BookingDetail;
  tenantEvents: TenantEvent[];
  verification: CustomerVerificationRecord | null;
}) {
  const [serverEvents, setServerEvents] = useState<TenantEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bookings/timeline?id=${encodeURIComponent(detail.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { events?: TenantEvent[] } | null) => {
        if (!cancelled) setServerEvents(data?.events ?? null);
      })
      .catch(() => {
        if (!cancelled) setServerEvents(null);
      });
    return () => {
      cancelled = true;
    };
  }, [detail.id]);

  const entries = useMemo(
    () =>
      buildBookingTimeline({
        detail,
        tenantEvents: serverEvents ?? tenantEvents,
        verification,
      }),
    [detail, serverEvents, tenantEvents, verification],
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#3d3228] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-white">Booking Timeline</h2>
        <p className="mt-1 text-xs text-slate-500">
          Only verified events from Vowpath records are shown.
        </p>
      </div>
      <ol className="space-y-0 px-4 py-4 sm:px-5">
        {entries.map((entry, index) => (
          <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < entries.length - 1 ? (
              <span
                className="absolute left-[0.4375rem] top-4 h-full w-px bg-white/[0.08]"
                aria-hidden
              />
            ) : null}
            <span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-brand-400/50 bg-brand-500/30" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-white">{entry.title}</p>
                <time className="text-xs text-slate-500">{formatTimelineTime(entry.at)}</time>
              </div>
              {entry.detail ? (
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{entry.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
