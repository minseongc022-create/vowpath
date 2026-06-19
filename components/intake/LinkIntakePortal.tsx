"use client";

import { useState } from "react";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import { isEnglishUi } from "@/lib/locale";
import type { LinkIntakeBookingView } from "@/lib/link-intake-portal";
import { LinkIntakeSubmissionPanel } from "@/components/intake/LinkIntakeSubmissionPanel";

type LinkIntakePortalProps = {
  token: string;
  shopName: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-700/50 focus:ring-2 focus:ring-brand-500/12";

export function LinkIntakePortal({ token, shopName }: LinkIntakePortalProps) {
  const [booking, setBooking] = useState<LinkIntakeBookingView | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/intake-link/${token}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, phone }),
      });
      const data = (await res.json()) as {
        error?: string;
        booking?: LinkIntakeBookingView;
      };
      if (!res.ok || !data.booking) {
        setError(data.error ?? copy.portalLookupFailed);
        return;
      }
      setBooking(data.booking);
    } catch {
      setError(
        isEnglishUi() ? "Network error. Please try again." : "네트워크 오류입니다. 다시 시도해 주세요.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (booking) {
    return (
      <LinkIntakeSubmissionPanel
        token={token}
        shopName={shopName}
        initialBooking={booking}
        defaultPhone={phone}
        defaultCustomerName={customerName}
        onBackToLookup={() => {
          setBooking(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-brand-50">
      <header className="border-b border-slate-200/80 bg-white px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="truncate text-sm font-bold text-brand-700">{shopName}</p>
          <p className="text-xs text-slate-500">{copy.portalGateTitle}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <form onSubmit={handleLookup} className="mx-auto max-w-md space-y-5">
          <p className="text-[15px] leading-relaxed text-slate-600">
            {copy.portalGateDescription}
          </p>

          <Field label={copy.nameLabel} required>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputClass}
              autoComplete="name"
              placeholder={copy.namePlaceholder}
            />
          </Field>

          <Field label={copy.portalPhoneLabel} required>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              autoComplete="tel"
              placeholder={copy.portalPhonePlaceholder}
            />
          </Field>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand-700 py-4 text-lg font-bold text-white disabled:opacity-50"
          >
            {loading ? copy.portalLooking : copy.portalLookup}
          </button>
        </form>
      </div>
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
