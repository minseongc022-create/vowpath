"use client";

import { useCallback, useEffect, useState } from "react";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import type { CorrectionBookingView } from "@/lib/customer-verification/correction-types";

type CustomerCorrectionPanelProps = {
  token: string;
  shopName: string;
  initialBooking: CorrectionBookingView;
};

type Step = "view" | "edit" | "done";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-700/50 focus:ring-2 focus:ring-brand-500/12";

export function CustomerCorrectionPanel({
  token,
  shopName,
  initialBooking,
}: CustomerCorrectionPanelProps) {
  const [step, setStep] = useState<Step>("view");
  const [booking, setBooking] = useState(initialBooking);
  const [customerName, setCustomerName] = useState(initialBooking.customerName);
  const [address, setAddress] = useState(initialBooking.address);
  const [issueDescription, setIssueDescription] = useState(initialBooking.issueType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncForm = useCallback((b: CorrectionBookingView) => {
    setCustomerName(b.customerName);
    setAddress(b.address);
    setIssueDescription(b.issueType);
  }, []);

  useEffect(() => {
    setBooking(initialBooking);
    syncForm(initialBooking);
  }, [initialBooking, syncForm]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/correction/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          address,
          issueDescription,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        booking?: CorrectionBookingView;
      };
      if (!res.ok || !data.booking) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setBooking(data.booking);
      syncForm(data.booking);
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-brand-50">
        <div className="flex flex-1 flex-col px-4 py-8">
          <div className="mx-auto w-full max-w-md space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">
                {copy.correctionDoneTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{copy.correctionDoneBody}</p>
            </div>
            <SummaryCard booking={booking} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-brand-50">
      <header className="border-b border-slate-200/80 bg-white px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="truncate text-sm font-bold text-brand-700">{shopName}</p>
          <p className="text-xs text-slate-500">
            {step === "edit" ? copy.correctionEditTitle : copy.correctionViewTitle}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-36">
        <div className="mx-auto max-w-md space-y-5">
          {step === "view" ? (
            <>
              <p className="text-[15px] leading-relaxed text-slate-600">
                {copy.correctionViewHint}
              </p>
              <SummaryCard booking={booking} />
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
              <Field label={copy.addressLabel} required>
                <input
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                  autoComplete="street-address"
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
          <div className="mx-auto max-w-md">
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
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ booking }: { booking: CorrectionBookingView }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      {booking.requestNumber ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {copy.requestNumberLabel}
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-brand-700">
            {booking.requestNumber}
          </p>
        </>
      ) : null}
      <dl className={`space-y-3 text-sm ${booking.requestNumber ? "mt-4" : ""}`}>
        <Row label={copy.nameLabel} value={booking.customerName} />
        <Row label={copy.addressLabel} value={booking.address} />
        <Row label={copy.issueLabel} value={booking.issueType} />
        {booking.createdAt ? (
          <Row
            label={copy.portalSubmittedAt}
            value={new Date(booking.createdAt).toLocaleString("en-US")}
          />
        ) : null}
      </dl>
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
