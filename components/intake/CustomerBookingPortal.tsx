"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerBookingPortalView } from "@/lib/customer-booking-portal";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import { LinkIntakeSlotCalendar } from "@/components/intake/LinkIntakeSlotCalendar";
import type { SlotGridDay, SlotGridItem } from "@/lib/scheduling/slot-grid";
import { LINK_URGENCY_OPTIONS, type LinkUrgency } from "@/lib/link-intake-urgency";

type Mode = "view" | "edit" | "reschedule" | "cancel";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-brand-700/50 focus:ring-2 focus:ring-brand-500/12";

export function CustomerBookingPortal({
  token,
  shopName,
  initialBooking,
}: {
  token: string;
  shopName: string;
  initialBooking: CustomerBookingPortalView;
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [mode, setMode] = useState<Mode>("view");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(booking.customerName);
  const [address, setAddress] = useState(booking.address);
  const [issueDescription, setIssueDescription] = useState(booking.issueType);
  const [urgency, setUrgency] = useState<LinkUrgency>(booking.urgency);

  const [gridDays, setGridDays] = useState<SlotGridDay[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotMeta, setSlotMeta] = useState({ duration: 120, buffer: 0, capacity: 1 });

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/intake-link/${token}/booking`);
    if (res.ok) {
      const data = (await res.json()) as { booking: CustomerBookingPortalView };
      setBooking(data.booking);
    }
  }, [token]);

  useEffect(() => {
    if (mode !== "reschedule") return;
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/intake-link/${token}/slots?urgency=${booking.urgency}`,
      );
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setGridDays(data.grid?.days ?? []);
      setSlotMeta({
        duration: data.durationMinutes ?? 120,
        buffer: data.bufferMinutes ?? 0,
        capacity: data.maxConcurrentVisits ?? 1,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, token, booking.urgency]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/intake-link/${token}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          callId: booking.callId,
          customerName,
          phone: booking.phone,
          address,
          issueDescription,
          urgency,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.booking) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setBooking({ ...booking, ...data.booking, status: booking.status, statusLabel: booking.statusLabel, arrivalWindow: booking.arrivalWindow, portalToken: token, canCancel: booking.canCancel, canReschedule: booking.canReschedule });
      setNotice(copy.portalUpdateSuccessBody);
      setMode("view");
      await refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule() {
    if (!selectedSlotId) {
      setError("Pick a visit time.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/intake-link/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedSlotId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not reschedule.");
        return;
      }
      if (data.booking) setBooking(data.booking);
      setNotice("Visit time updated! We'll see you then.");
      setMode("view");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/intake-link/${token}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not cancel.");
        return;
      }
      if (data.booking) setBooking(data.booking);
      setNotice("Your visit was cancelled.");
      setMode("view");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-brand-50">
      <header className="border-b border-slate-200/80 bg-white px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="truncate text-sm font-bold text-brand-700">{shopName}</p>
          <p className="text-xs text-slate-500">{copy.bookingPortalTitle}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-36">
        <div className="mx-auto max-w-md space-y-5">
          {notice ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {notice}
            </p>
          ) : null}

          {mode === "view" ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {copy.bookingStatusLabel}
                </p>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                  {booking.statusLabel}
                </span>
              </div>
              <p className="mt-2 font-mono text-lg font-bold text-brand-700">
                {booking.requestNumber}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label={copy.nameLabel} value={booking.customerName} />
                <Row label={copy.addressLabel} value={booking.address} />
                <Row label={copy.issueLabel} value={booking.issueType} />
                <Row label={copy.bookingTimeLabel} value={booking.arrivalWindow} />
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{copy.bookingTimeHint}</p>
            </div>
          ) : null}

          {mode === "edit" ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <Field label={copy.nameLabel} required>
                <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
              </Field>
              <Field label={copy.addressLabel} required>
                <input required value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </Field>
              <Field label={copy.issueLabel} required>
                <textarea required rows={3} value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} className={`${inputClass} resize-none`} />
              </Field>
              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-brand-700 py-4 font-bold text-white disabled:opacity-50">
                {loading ? copy.portalSaving : copy.portalSave}
              </button>
              <button type="button" onClick={() => setMode("view")} className="w-full text-sm text-slate-500">
                {copy.portalBackToView}
              </button>
            </form>
          ) : null}

          {mode === "reschedule" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{copy.bookingRescheduleHint}</p>
              <LinkIntakeSlotCalendar
                days={gridDays}
                selectedSlotId={selectedSlotId}
                onSelect={(s: SlotGridItem) => setSelectedSlotId(s.id)}
                durationMinutes={slotMeta.duration}
                bufferMinutes={slotMeta.buffer}
                maxConcurrentVisits={slotMeta.capacity}
              />
              <button type="button" disabled={loading || !selectedSlotId} onClick={handleReschedule} className="w-full rounded-2xl bg-brand-700 py-4 font-bold text-white disabled:opacity-50">
                {loading ? copy.portalSaving : copy.bookingConfirmTime}
              </button>
              <button type="button" onClick={() => setMode("view")} className="w-full text-sm text-slate-500">
                {copy.portalBackToView}
              </button>
            </div>
          ) : null}

          {mode === "cancel" ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
              <p className="font-semibold text-rose-950">{copy.bookingCancelConfirmTitle}</p>
              <p className="mt-2 text-sm text-rose-900">{copy.bookingCancelConfirmBody}</p>
              <button type="button" disabled={loading} onClick={handleCancel} className="mt-4 w-full rounded-2xl bg-rose-700 py-3 font-bold text-white disabled:opacity-50">
                {loading ? "…" : copy.bookingCancelConfirmButton}
              </button>
              <button type="button" onClick={() => setMode("view")} className="mt-3 w-full text-sm text-slate-500">
                {copy.portalBackToView}
              </button>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          ) : null}
        </div>
      </div>

      {mode === "view" && booking.status !== "rejected" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-md space-y-2">
            {booking.canReschedule ? (
              <button type="button" onClick={() => { setError(null); setMode("reschedule"); }} className="w-full rounded-2xl bg-brand-700 py-3.5 font-bold text-white">
                {copy.bookingChangeTime}
              </button>
            ) : null}
            <button type="button" onClick={() => { setError(null); setMode("edit"); }} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-800">
              {copy.bookingEditDetails}
            </button>
            {booking.canCancel ? (
              <button type="button" onClick={() => { setError(null); setMode("cancel"); }} className="w-full py-2 text-sm font-medium text-rose-600">
                {copy.bookingCancel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 flex gap-1 text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value || "—"}</dd>
    </div>
  );
}
