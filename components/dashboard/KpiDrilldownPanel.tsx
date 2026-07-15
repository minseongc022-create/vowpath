"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import { toCustomerVerificationView } from "@/lib/customer-verification/labels";
import { ROUTES } from "@/lib/constants";
import { dashboardUi } from "@/lib/content";
import { useRelativeNow } from "@/lib/hooks/use-relative-now";
import type { KpiDrilldownId, KpiDrilldownItem } from "@/lib/kpi-drilldown";
import {
  formatBookingListHeadline,
  formatBookingListSubtitle,
  formatBookingReceivedLabel,
} from "@/lib/recent-bookings";
import { trendSeriesDef } from "@/lib/trend-chart-series";

type KpiDrilldownPanelProps = {
  open: boolean;
  kpiId: KpiDrilldownId | null;
  items: KpiDrilldownItem[];
  periodLabel: string;
  onClose: () => void;
};

function panelTitle(id: KpiDrilldownId): string {
  if (id === "customerVerification") {
    return dashboardUi.customerVerificationKpi.label;
  }
  return trendSeriesDef(id).label;
}

function panelSubtitle(id: KpiDrilldownId, periodLabel: string): string {
  if (id === "waitingCustomers") return dashboardUi.kpiDrilldown.waitingPeriod;
  if (id === "customerVerification") return dashboardUi.customerVerificationKpi.periodLabel;
  return dashboardUi.kpiDrilldown.periodSum(periodLabel);
}

function CallRow({
  call,
  nowMs,
  onNavigate,
}: {
  call: KpiDrilldownItem & { kind: "call" };
  nowMs: number;
  onNavigate: () => void;
}) {
  const bookingId = `call-${call.call.id}`;
  const name = call.call.customerName?.trim() || call.call.from || "Unknown";
  const issue =
    (call.call.issueType?.trim() ||
    call.call.symptom?.trim() ||
    "Inbound call");

  return (
    <li>
      <Link
        href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(bookingId)}`}
        onClick={onNavigate}
        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-brand-500/30 hover:bg-white/[0.04]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{name}</p>
            {call.call.priority ? (
              <PriorityBadge priority={call.call.priority} theme="dark" />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-400">{issue}</p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          {formatBookingReceivedLabel(call.call.createdAt, nowMs)}
        </p>
      </Link>
    </li>
  );
}

function BookingRow({
  item,
  nowMs,
  onNavigate,
}: {
  item: KpiDrilldownItem & { kind: "booking" };
  nowMs: number;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(item.booking.id)}`}
        onClick={onNavigate}
        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-brand-500/30 hover:bg-white/[0.04]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-white">
              {formatBookingListHeadline(item.booking, nowMs)}
            </p>
            <PriorityBadge priority={item.booking.priority} theme="dark" />
            <BookingStatusBadge status={item.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {formatBookingListSubtitle(item.booking)}
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          {formatBookingReceivedLabel(item.booking.createdAt, nowMs)}
        </p>
      </Link>
    </li>
  );
}

function VerificationRow({
  item,
  nowMs,
  onNavigate,
}: {
  item: KpiDrilldownItem & { kind: "verification" };
  nowMs: number;
  onNavigate: () => void;
}) {
  const view = toCustomerVerificationView(item.record);
  const bookingId = item.record.bookingId;

  return (
    <li>
      <Link
        href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(bookingId)}`}
        onClick={onNavigate}
        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-brand-500/30 hover:bg-white/[0.04]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">
            {item.record.snapshot.customerName || "Customer"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {item.record.snapshot.issueType || item.record.snapshot.address}
          </p>
          {view ? (
            <span
              className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                view.badgeTone === "green"
                  ? "border-emerald-500/30 text-emerald-300"
                  : view.badgeTone === "orange"
                    ? "border-amber-500/30 text-amber-200"
                    : "border-slate-500/30 text-slate-300"
              }`}
            >
              {view.badgeLabel}
            </span>
          ) : null}
        </div>
        <p className="shrink-0 text-xs tabular-nums text-slate-500">
          {formatBookingReceivedLabel(item.record.sentAt, nowMs)}
        </p>
      </Link>
    </li>
  );
}

export function KpiDrilldownPanel({
  open,
  kpiId,
  items,
  periodLabel,
  onClose,
}: KpiDrilldownPanelProps) {
  const copy = dashboardUi.kpiDrilldown;
  const nowMs = useRelativeNow();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !kpiId || typeof document === "undefined") return null;

  const title = panelTitle(kpiId);
  const subtitle = panelSubtitle(kpiId, periodLabel);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        aria-label={copy.close}
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-[#0f1117] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-drilldown-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
              {copy.eyebrow}
            </p>
            <h2 id="kpi-drilldown-title" className="mt-1 text-lg font-bold text-white">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {subtitle} · {copy.count(items.length)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label={copy.close}
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">{copy.empty}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                if (item.kind === "call") {
                  return (
                    <CallRow
                      key={item.id}
                      call={item}
                      nowMs={nowMs}
                      onNavigate={onClose}
                    />
                  );
                }
                if (item.kind === "booking") {
                  return (
                    <BookingRow
                      key={item.id}
                      item={item}
                      nowMs={nowMs}
                      onNavigate={onClose}
                    />
                  );
                }
                return (
                  <VerificationRow
                    key={item.id}
                    item={item}
                    nowMs={nowMs}
                    onNavigate={onClose}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (kpiId === "waitingCustomers" || kpiId === "bookedJobs") ? (
          <footer className="border-t border-white/[0.06] px-5 py-3">
            <Link
              href={ROUTES.dashboard + "/bookings"}
              className="text-xs font-semibold text-brand-300 hover:underline"
              onClick={onClose}
            >
              {copy.viewAllBookings}
            </Link>
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
