"use client";

import { useMemo, useState } from "react";

export function ClosePingRevenueCalculator() {
  const [estimatesPerMonth, setEstimatesPerMonth] = useState(25);
  const [avgJob, setAvgJob] = useState(4500);
  const [closeRate, setCloseRate] = useState(15);

  const { monthlyLoss, recovered } = useMemo(() => {
    const opportunities = estimatesPerMonth * avgJob;
    const current = opportunities * (closeRate / 100);
    const withFollowUp = opportunities * Math.min(closeRate + 12, 55) / 100;
    const recoveredVal = withFollowUp - current;
    const loss = opportunities - current;
    return { monthlyLoss: loss, recovered: recoveredVal };
  }, [estimatesPerMonth, avgJob, closeRate]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="rounded-2xl border border-ping-200 bg-white p-6 shadow-card sm:p-8">
      <h3 className="text-lg font-bold text-ping-950">Estimate leak calculator</h3>
      <p className="mt-1 text-sm text-stone-600">
        Based on industry follow-up benchmarks (+12 pts close rate with structured chase).
      </p>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Estimates sent per month: {estimatesPerMonth}
          </span>
          <input
            type="range"
            min={5}
            max={100}
            value={estimatesPerMonth}
            onChange={(e) => setEstimatesPerMonth(Number(e.target.value))}
            className="mt-2 w-full accent-ping-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Average job size: {fmt(avgJob)}
          </span>
          <input
            type="range"
            min={1000}
            max={15000}
            step={500}
            value={avgJob}
            onChange={(e) => setAvgJob(Number(e.target.value))}
            className="mt-2 w-full accent-ping-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Current close rate: {closeRate}%
          </span>
          <input
            type="range"
            min={5}
            max={40}
            value={closeRate}
            onChange={(e) => setCloseRate(Number(e.target.value))}
            className="mt-2 w-full accent-ping-600"
          />
        </label>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Unclosed pipeline / month
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-800">{fmt(monthlyLoss)}</p>
        </div>
        <div className="rounded-xl bg-ping-50 p-4 ring-1 ring-ping-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-ping-700">
            Recoverable with chase
          </p>
          <p className="mt-1 text-2xl font-bold text-ping-800">{fmt(recovered)}</p>
          <p className="mt-1 text-xs text-ping-700">≈ {fmt(recovered * 12)}/year</p>
        </div>
      </div>
    </div>
  );
}
