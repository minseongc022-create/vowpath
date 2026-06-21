"use client";

import { useCallback, useEffect, useState } from "react";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import { LINK_URGENCY_OPTIONS, type LinkUrgency } from "@/lib/link-intake-urgency";
import type { LinkIntakeBookingView } from "@/lib/link-intake-portal";
import { UsAddressField } from "@/components/intake/UsAddressField";
import {
  composeUsAddress,
  isUsAddressReady,
  usAddressFromStored,
  type UsAddressFieldValue,
} from "@/lib/address/us-address";

type LinkIntakeSubmissionPanelProps = {
  token: string;
  shopName: string;
  initialBooking: LinkIntakeBookingView;
  /** First submit right now — show success hero */
  justSubmitted?: boolean;
  defaultCustomerName?: string;
  defaultPhone?: string;
  onBackToLookup?: () => void;
};

type Step = "view" | "edit";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-700/50 focus:ring-2 focus:ring-brand-500/12";

function formFromBooking(booking: LinkIntakeBookingView) {
  return {
    customerName: booking.customerName,
    phone: booking.phone,
    address: booking.address,
    issueDescription: booking.issueType,
    urgency: booking.urgency,
  };
}

export function LinkIntakeSubmissionPanel({
  token,
  shopName,
  initialBooking,
  justSubmitted = false,
  defaultCustomerName,
  defaultPhone,
  onBackToLookup,
}: LinkIntakeSubmissionPanelProps) {
  const [step, setStep] = useState<Step>("view");
  const [booking, setBooking] = useState(initialBooking);
  const [customerName, setCustomerName] = useState(
    defaultCustomerName ?? initialBooking.customerName,
  );
  const [phone, setPhone] = useState(defaultPhone ?? initialBooking.phone);
  const [addressValue, setAddressValue] = useState<UsAddressFieldValue>(() =>
    usAddressFromStored(initialBooking.address),
  );
  const [issueDescription, setIssueDescription] = useState(initialBooking.issueType);
  const [urgency, setUrgency] = useState<LinkUrgency>(initialBooking.urgency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateNotice, setUpdateNotice] = useState(false);
  const [showCompleteHero, setShowCompleteHero] = useState(justSubmitted);

  const syncForm = useCallback((b: LinkIntakeBookingView) => {
    const f = formFromBooking(b);
    setCustomerName(f.customerName);
    setPhone(f.phone);
    setAddressValue(usAddressFromStored(f.address));
    setIssueDescription(f.issueDescription);
    setUrgency(f.urgency);
  }, []);

  useEffect(() => {
    setBooking(initialBooking);
    syncForm(initialBooking);
  }, [initialBooking, syncForm]);

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
          phone,
          address: composeUsAddress(addressValue),
          issueDescription,
          urgency,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        booking?: LinkIntakeBookingView;
      };
      if (!res.ok || !data.booking) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setBooking(data.booking);
      syncForm(data.booking);
      setUpdateNotice(true);
      setShowCompleteHero(false);
      setStep("view");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
          <p className="text-xs text-slate-500">
            {step === "edit" ? copy.portalEditTitle : copy.submissionTitle}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-36">
        <div className="mx-auto max-w-md space-y-5">
          {showCompleteHero ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200/80">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{copy.successTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.successBody}</p>
            </div>
          ) : null}

          {updateNotice ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {copy.portalUpdateSuccessBody}
            </p>
          ) : null}

          {step === "view" ? (
            <>
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {copy.submissionSummaryTitle}
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-brand-700">
                  {booking.requestNumber}
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label={copy.nameLabel} value={booking.customerName} />
                  {booking.phone ? (
                    <Row label={copy.portalPhoneLabel} value={booking.phone} />
                  ) : null}
                  <Row label={copy.addressLabel} value={booking.address} />
                  <Row label={copy.issueLabel} value={booking.issueType} />
                  <Row
                    label={copy.portalSubmittedAt}
                    value={new Date(booking.createdAt).toLocaleString("en-US")}
                  />
                </dl>
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-5">
              <Field label={copy.nameLabel} required>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                  autoComplete="name"
                />
              </Field>
              <Field label={copy.portalPhoneLabel}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                  placeholder={copy.portalPhonePlaceholder}
                />
              </Field>
              <Field label={copy.addressLabel} required>
                <UsAddressField
                  value={addressValue}
                  onChange={setAddressValue}
                  inputClassName={inputClass}
                />
              </Field>
              <Field label={copy.issueLabel} required>
                <textarea
                  required
                  rows={4}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className={`${inputClass} min-h-[112px] resize-none`}
                />
              </Field>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-800">
                  {copy.urgencyLabel}
                </legend>
                <div className="space-y-2">
                  {LINK_URGENCY_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
                        urgency === opt.id
                          ? "border-brand-700/40 ring-2 ring-brand-500/15"
                          : "border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        checked={urgency === opt.id}
                        onChange={() => setUrgency(opt.id)}
                        className="sr-only"
                      />
                      <span className="text-sm text-slate-800">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {error ? <ErrorBox message={error} /> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-brand-700 py-4 text-lg font-bold text-white disabled:opacity-50"
              >
                {loading ? copy.portalSaving : copy.portalSave}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  syncForm(booking);
                  setStep("view");
                }}
                className="w-full text-sm text-slate-500"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>

      {step === "view" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-md space-y-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("edit");
              }}
              className="w-full rounded-2xl bg-brand-700 py-4 text-lg font-bold text-white shadow-lg shadow-brand-700/20"
            >
              {copy.portalEdit}
            </button>
            {onBackToLookup ? (
              <button
                type="button"
                onClick={onBackToLookup}
                className="w-full py-2 text-sm font-medium text-slate-500"
              >
                {copy.portalBackToLookup}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {message}
    </p>
  );
}
