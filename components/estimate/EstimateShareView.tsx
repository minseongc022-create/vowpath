"use client";

import { useEffect, useState } from "react";
import {
  categoryLabel,
  computeEstimateTotals,
  formatUsdFromCents,
  lineTotalCents,
  unitLabel,
  type EstimateDocument,
} from "@/lib/estimate-document";

type Totals = ReturnType<typeof computeEstimateTotals>;

export function EstimateShareView({ token }: { token: string }) {
  const [estimate, setEstimate] = useState<EstimateDocument | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/estimate-share/${encodeURIComponent(token)}`);
        const data = (await res.json()) as {
          estimate?: EstimateDocument;
          totals?: Totals;
          error?: string;
        };
        if (!res.ok || !data.estimate || !data.totals) {
          if (!cancelled) setError(data.error ?? "Estimate not found.");
          return;
        }
        if (!cancelled) {
          setEstimate(data.estimate);
          setTotals(data.totals);
        }
      } catch {
        if (!cancelled) setError("Could not load estimate.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <p className="text-sm text-stone-600">{error}</p>
      </main>
    );
  }

  if (!estimate || !totals) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
        <p className="text-sm text-stone-500">Loading estimate…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-stone-100 px-3 py-6 print:bg-white print:px-0">
      <div className="mb-3 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white"
        >
          Print / Save PDF
        </button>
      </div>

      <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-stone-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Estimate {estimate.number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">{estimate.shop.shopName}</h1>
          <div className="mt-2 space-y-0.5 text-sm text-stone-600">
            {estimate.shop.businessAddress ? <p>{estimate.shop.businessAddress}</p> : null}
            {estimate.shop.phone ? <p>{estimate.shop.phone}</p> : null}
            {estimate.shop.email ? <p>{estimate.shop.email}</p> : null}
            {estimate.shop.licenseNumber ? <p>License #: {estimate.shop.licenseNumber}</p> : null}
            {estimate.shop.iicrcFirmNumber ? (
              <p>IICRC firm #: {estimate.shop.iicrcFirmNumber}</p>
            ) : null}
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Bill to / job site
            </p>
            <p className="mt-1 font-medium text-stone-900">{estimate.customerName}</p>
            {estimate.customerAddress ? (
              <p className="text-sm text-stone-600">{estimate.customerAddress}</p>
            ) : null}
            {estimate.customerPhone ? (
              <p className="text-sm text-stone-600">{estimate.customerPhone}</p>
            ) : null}
          </div>
          <div className="text-sm text-stone-600">
            <p>
              Issued:{" "}
              <span className="text-stone-900">
                {new Date(estimate.issuedAt).toLocaleDateString()}
              </span>
            </p>
            <p>
              Valid through:{" "}
              <span className="text-stone-900">
                {new Date(estimate.validUntil).toLocaleDateString()}
              </span>
            </p>
            {estimate.insuranceCarrier ? <p>Carrier: {estimate.insuranceCarrier}</p> : null}
            {estimate.claimNumber ? <p>Claim #: {estimate.claimNumber}</p> : null}
            {estimate.adjusterName ? <p>Adjuster: {estimate.adjusterName}</p> : null}
          </div>
        </section>

        {estimate.scopeSummary ? (
          <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {estimate.scopeSummary}
          </p>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Unit</th>
                <th className="py-2 pr-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {estimate.lineItems.map((line) => (
                <tr key={line.id} className="border-b border-stone-100">
                  <td className="py-2.5 pr-2">
                    <p className="font-medium text-stone-900">{line.description}</p>
                    <p className="text-[11px] text-stone-500">{categoryLabel(line.category)}</p>
                  </td>
                  <td className="py-2.5 pr-2 tabular-nums">{line.qty}</td>
                  <td className="py-2.5 pr-2">{unitLabel(line.unit)}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {formatUsdFromCents(line.unitPriceCents)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium">
                    {formatUsdFromCents(lineTotalCents(line))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatUsdFromCents(totals.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Tax ({totals.taxRatePercent}%)</span>
            <span className="tabular-nums">{formatUsdFromCents(totals.taxCents)}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold text-stone-900">
            <span>Total</span>
            <span className="tabular-nums">{formatUsdFromCents(totals.totalCents)}</span>
          </div>
        </div>

        {estimate.notes ? (
          <section className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{estimate.notes}</p>
          </section>
        ) : null}
        {estimate.exclusions ? (
          <section className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Exclusions
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{estimate.exclusions}</p>
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 border-t border-stone-200 pt-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Customer acceptance
            </p>
            <div className="mt-8 border-b border-stone-400" />
            <p className="mt-1 text-xs text-stone-500">Signature</p>
            <div className="mt-6 border-b border-stone-400" />
            <p className="mt-1 text-xs text-stone-500">Date</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Company representative
            </p>
            <div className="mt-8 border-b border-stone-400" />
            <p className="mt-1 text-xs text-stone-500">Signature</p>
            <div className="mt-6 border-b border-stone-400" />
            <p className="mt-1 text-xs text-stone-500">Date</p>
          </div>
        </section>
      </article>
    </main>
  );
}
