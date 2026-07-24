"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerBookingPortalView } from "@/lib/customer-booking-portal";
import { useLinkIntakeCopy } from "@/components/intake/LinkIntakeCopyContext";
import { LinkIntakeSlotCalendar } from "@/components/intake/LinkIntakeSlotCalendar";
import { UsAddressField } from "@/components/intake/UsAddressField";
import {
  composeUsAddress,
  isUsAddressReady,
  usAddressFromStored,
  type UsAddressFieldValue,
} from "@/lib/address/us-address";
import type { SlotGridDay, SlotGridItem } from "@/lib/scheduling/slot-grid";
import type { LinkUrgency } from "@/lib/link-intake-urgency";

type Mode = "view" | "edit" | "reschedule" | "cancel";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-brand-700/50 focus:ring-2 focus:ring-brand-500/12";

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("invalid_json");
  }
}

export function CustomerBookingPortal({
  token,
  shopName,
  initialBooking,
}: {
  token: string;
  shopName: string;
  initialBooking: CustomerBookingPortalView;
}) {
  const copy = useLinkIntakeCopy();
  const [booking, setBooking] = useState(initialBooking);
  const [mode, setMode] = useState<Mode>(
    initialBooking.needsSchedule || initialBooking.needsAddress ? "reschedule" : "view",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(booking.customerName);
  const [addressValue, setAddressValue] = useState<UsAddressFieldValue>(() =>
    usAddressFromStored(booking.address),
  );
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
    setSelectedSlotId(null);
    (async () => {
      const res = await fetch(
        `/api/intake-link/${token}/slots?urgency=${booking.urgency}&excludeBookingId=${encodeURIComponent(booking.bookingId)}`,
      );
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const days = data.grid?.days ?? [];
      setGridDays(days);
      setSlotMeta({
        duration: data.durationMinutes ?? 120,
        buffer: data.bufferMinutes ?? 0,
        capacity: data.maxConcurrentVisits ?? 1,
      });
      const firstOpen = days
        .flatMap((d: SlotGridDay) => d.slots)
        .find((s: SlotGridItem) => s.status === "available");
      if (!cancelled) setSelectedSlotId(firstOpen?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, token, booking.urgency, booking.bookingId]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!isUsAddressReady(addressValue)) {
      setError(copy.addressPickRequired);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/intake-link/${token}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          callId: booking.callId,
          customerName,
          phone: booking.phone,
          address: composeUsAddress(addressValue),
          issueDescription,
          urgency,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok || !data.booking) {
        setError(String(data.error ?? "Could not save changes."));
        return;
      }
      setNotice(copy.portalUpdateSuccessBody);
      setMode("view");
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message === "invalid_json"
          ? "Server error. Please refresh and try again."
          : "Network error. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule() {
    if (booking.needsAddress && !isUsAddressReady(addressValue)) {
      setError(copy.addressPickRequired);
      return;
    }
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
        body: JSON.stringify({
          slotId: selectedSlotId,
          address: isUsAddressReady(addressValue)
            ? composeUsAddress(addressValue)
            : undefined,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        setError(String(data.error ?? "Could not reschedule."));
        return;
      }
      if (data.booking) setBooking(data.booking as CustomerBookingPortalView);
      setNotice(
        (data.booking as CustomerBookingPortalView | undefined)?.needsSchedule === false
          ? "Address confirmed and visit time booked! We'll see you then."
          : "Visit time updated! We'll see you then.",
      );
      setMode("view");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "invalid_json"
          ? "Server error. Please refresh and try again."
          : "Network error. Please try again.",
      );
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
    } catch (err) {
      setError(
        err instanceof Error && err.message === "invalid_json"
          ? "Server error. Please refresh and try again."
          : "Network error. Please try again.",
      );
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

      <div className="flex-1 overflow-y-auto px-4 py-6">
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
                <UsAddressField
                  value={addressValue}
                  onChange={setAddressValue}
                  inputClassName={inputClass}
                />
              </Field>
              <Field label={copy.issueLabel} required>
                <textarea required rows={3} value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} className={`${inputClass} resize-none`} />
              </Field>
              {error ? <ErrorBox message={error} /> : null}
              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-brand-700 py-4 font-bold text-white disabled:opacity-50">
                {loading ? copy.portalSaving : copy.portalSave}
              </button>
              <button type="button" onClick={() => { setError(null); setMode("view"); }} className="w-full text-sm text-slate-500">
                {copy.portalBackToView}
              </button>
            </form>
          ) : null}

          {mode === "reschedule" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {booking.needsAddress
                  ? "Confirm or fix the address we heard on the phone (typed / map search), then pick a visit window."
                  : booking.needsSchedule
                    ? "Pick an open visit window below — same calendar your shop uses for bookings."
                    : copy.bookingRescheduleHint}
              </p>
              {booking.needsAddress ? (
                <Field label={copy.addressLabel} required>
                  <UsAddressField
                    value={addressValue}
                    onChange={setAddressValue}
                    inputClassName={inputClass}
                  />
                </Field>
              ) : null}
              <LinkIntakeSlotCalendar
                days={gridDays}
                selectedSlotId={selectedSlotId}
                onSelect={(s: SlotGridItem) => {
                  setSelectedSlotId(s.id);
                  setError(null);
                }}
                durationMinutes={slotMeta.duration}
                bufferMinutes={slotMeta.buffer}
                maxConcurrentVisits={slotMeta.capacity}
              />
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

          {mode !== "reschedule" && error ? <ErrorBox message={error} /> : null}
        </div>
      </div>

      {mode === "reschedule" ? (
        <div className="shrink-0 space-y-2 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-md space-y-2">
            {error ? <ErrorBox message={error} /> : null}
            <button
              type="button"
              disabled={loading || !selectedSlotId}
              onClick={() => void handleReschedule()}
              className="w-full rounded-2xl bg-brand-700 py-4 font-bold text-white disabled:opacity-50"
            >
              {loading
                ? copy.portalSaving
                : booking.needsAddress
                  ? "Confirm address & visit time"
                  : booking.needsSchedule
                    ? "Confirm visit time"
                    : copy.bookingConfirmTime}
            </button>
            {booking.needsSchedule || booking.needsAddress ? null : (
              <button
                type="button"
                onClick={() => { setError(null); setMode("view"); }}
                className="w-full text-sm text-slate-500"
              >
                {copy.portalBackToView}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {mode === "view" && booking.status !== "rejected" ? (
        <div className="shrink-0 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-md space-y-2">
            {booking.canReschedule ? (
              <button type="button" onClick={() => { setError(null); setMode("reschedule"); }} className="w-full rounded-2xl bg-brand-700 py-3.5 font-bold text-white">
                {booking.needsAddress
                  ? "Confirm address & time"
                  : booking.needsSchedule
                    ? "Pick visit time"
                    : copy.bookingChangeTime}
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

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
    >
      {message}
    </p>
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
