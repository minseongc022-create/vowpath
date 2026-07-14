"use client";

import { useEffect, useState } from "react";

type Phase = "call" | "menu" | "sms" | "form" | "done";

const CYCLE_MS = 16_000;

export function DemoLinkIntakeScene() {
  const [phase, setPhase] = useState<Phase>("call");

  useEffect(() => {
    function runCycle() {
      setPhase("call");
      const t1 = setTimeout(() => setPhase("menu"), 2200);
      const t2 = setTimeout(() => setPhase("sms"), 4800);
      const t3 = setTimeout(() => setPhase("form"), 8200);
      const t4 = setTimeout(() => setPhase("done"), 12000);
      return [t1, t2, t3, t4];
    }
    let timers = runCycle();
    const loop = setInterval(() => {
      timers.forEach(clearTimeout);
      timers = runCycle();
    }, CYCLE_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-[#0c0b0a] text-white">
      <div className="border-b border-white/10 px-8 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#b59b78]">Text link intake</p>
        <h1 className="text-xl font-bold">Press 2 → SMS form → done in ~1 minute</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="w-full max-w-sm rounded-[2rem] border-4 border-slate-700 bg-black p-5">
          <p className="text-center text-[10px] text-white/40">Customer phone</p>
          <p className="mt-1 text-center text-base font-semibold">Ridgeline Restoration</p>
          {phase === "call" && (
            <p className="mt-8 text-center text-sm text-emerald-400 animate-pulse">Incoming call…</p>
          )}
          {phase === "menu" && (
            <div className="mt-6 space-y-2 text-sm leading-relaxed">
              <p className="text-white/70">Press 1 — book service</p>
              <p className="rounded-xl bg-[#9a7f5e]/40 px-4 py-3 font-semibold text-[#f5f0e8] ring-2 ring-[#9a7f5e]">
                Press 2 — text me a link ✓
              </p>
            </div>
          )}
          {(phase === "sms" || phase === "form" || phase === "done") && (
            <p className="mt-6 text-center text-xs text-white/50">Call ended · Link sent</p>
          )}
        </div>

        <div
          className={`w-full max-w-md transition-all duration-500 ${
            phase === "sms" || phase === "form" || phase === "done" ? "opacity-100" : "opacity-25"
          }`}
        >
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/50 p-4">
            <p className="text-xs font-bold text-emerald-400">SMS to customer</p>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50">
              Ridgeline: Finish your request here (~1 min):
              <span className="mt-1 block text-emerald-300 underline">effiroad.com/r/…</span>
            </p>
          </div>
        </div>

        <div
          className={`w-full max-w-md rounded-2xl border border-white/10 bg-[#faf8f5] p-5 text-[#3d3228] shadow-xl transition-all duration-500 ${
            phase === "form" || phase === "done" ? "opacity-100 scale-100" : "opacity-30 scale-95"
          }`}
        >
          <p className="text-sm font-bold text-[#9a7f5e]">Self-service form</p>
          <div className="mt-3 space-y-2">
            {["Mike Wilson", "4821 Oak Dr, Austin TX", "Basement flooding"].map((v, i) => (
              <div
                key={v}
                className={`rounded-lg border border-[#ebe3d6] bg-white px-3 py-2.5 text-sm ${
                  phase === "form" && i <= 1 ? "ring-2 ring-[#9a7f5e]/50" : ""
                } ${phase === "done" ? "opacity-100" : ""}`}
              >
                {v}
              </div>
            ))}
          </div>
          {phase === "done" && (
            <p className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
              ✓ Request sent · Owner notified
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
