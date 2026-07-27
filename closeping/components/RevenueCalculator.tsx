"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/quotes";

export function RevenueCalculator() {
  const [estimates, setEstimates] = useState(25);
  const [avg, setAvg] = useState(4500);
  const [rate, setRate] = useState(15);

  const { loss, recovered } = useMemo(() => {
    const opp = estimates * avg;
    const current = opp * (rate / 100);
    const better = opp * Math.min(rate + 12, 55) / 100;
    return { loss: opp - current, recovered: better - current };
  }, [estimates, avg, rate]);

  return (
    <div className="glass chrome-border relative overflow-hidden rounded-2xl p-6 sm:p-8 animate-rise">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px shimmer-bar" />
      <h3 className="font-display text-lg font-semibold text-white">Leak calculator</h3>
      <p className="mt-1 text-sm text-ink-400">Structured chase ≈ +12 pts close rate</p>

      <div className="mt-6 space-y-5">
        <Slider
          label={`Estimates / month: ${estimates}`}
          min={5}
          max={100}
          value={estimates}
          onChange={setEstimates}
        />
        <Slider
          label={`Avg job: ${formatUsd(avg * 100)}`}
          min={1000}
          max={15000}
          step={500}
          value={avg}
          onChange={setAvg}
        />
        <Slider
          label={`Close rate: ${rate}%`}
          min={5}
          max={40}
          value={rate}
          onChange={setRate}
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-black/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
            Unclosed / mo
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-200">
            {formatUsd(Math.round(loss) * 100)}
          </p>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/[0.06] p-4 shadow-glow">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-chrome">
            Recoverable
          </p>
          <p className="mt-1 font-display text-2xl font-bold chrome-text">
            {formatUsd(Math.round(recovered) * 100)}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            ≈ {formatUsd(Math.round(recovered * 12) * 100)} / year
          </p>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-ink-300">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-white"
      />
    </label>
  );
}
