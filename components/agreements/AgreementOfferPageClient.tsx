"use client";

import { useEffect, useState } from "react";

type OfferData = {
  shopName?: string;
  customerName: string;
  planName: string;
  annualPrice: string;
  visitsPerYear: number;
  serviceAddress: string;
  used: boolean;
};

export function AgreementOfferPageClient({ token }: { token: string }) {
  const [data, setData] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agreement-offer/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("expired");
        return r.json() as Promise<OfferData>;
      })
      .then(setData)
      .catch(() => setError("expired"))
      .finally(() => setLoading(false));
  }, [token]);

  async function accept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agreement-offer/${token}`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "failed");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <p className="text-stone-600">Loading…</p>
      </div>
    );
  }

  if (error === "expired" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-stone-900">Link expired</h1>
          <p className="mt-2 text-sm text-stone-600">
            This maintenance plan offer is no longer available. Please call your service company to
            enroll.
          </p>
        </div>
      </div>
    );
  }

  const shopLabel = data.shopName?.trim() || "Your service team";

  if (data.used || done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
        <div className="max-w-md rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-emerald-900">You&apos;re enrolled</h1>
          <p className="mt-2 text-sm text-stone-600">
            {shopLabel} will reach out before your scheduled visits. Check your texts for
            confirmation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-brand-200/80 bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          {data.shopName?.trim() || "Maintenance plan"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-brand-950">
          Keep your system running year-round
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Hi {data.customerName} — enroll in <strong>{data.planName}</strong> for{" "}
          <strong>{data.annualPrice}/year</strong> ({data.visitsPerYear} visits).
        </p>

        <ul className="mt-6 space-y-2 text-sm text-stone-700">
          <li className="flex gap-2">
            <span className="text-brand-600">✓</span>
            Priority scheduling for maintenance visits
          </li>
          <li className="flex gap-2">
            <span className="text-brand-600">✓</span>
            Fewer surprise breakdowns
          </li>
          <li className="flex gap-2">
            <span className="text-brand-600">✓</span>
            Service address: {data.serviceAddress}
          </li>
        </ul>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void accept()}
          disabled={accepting}
          className="mt-8 w-full rounded-xl bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
        >
          {accepting ? "Enrolling…" : `Enroll — ${data.annualPrice}/yr`}
        </button>
        <p className="mt-4 text-center text-xs text-stone-500">
          By enrolling you agree to annual maintenance visits. {shopLabel} may contact you to
          schedule.
        </p>
      </div>
    </div>
  );
}
