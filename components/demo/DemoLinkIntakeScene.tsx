"use client";

import { useEffect, useState } from "react";

type Phase = "call" | "menu" | "sms" | "form" | "done";

const CYCLE_MS = 17_000;

export function DemoLinkIntakeScene() {
  const [phase, setPhase] = useState<Phase>("call");

  useEffect(() => {
    function runCycle() {
      setPhase("call");
      const t1 = setTimeout(() => setPhase("menu"), 2500);
      const t2 = setTimeout(() => setPhase("sms"), 5500);
      const t3 = setTimeout(() => setPhase("form"), 9000);
      const t4 = setTimeout(() => setPhase("done"), 13500);
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
      <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#b59b78]">Text link intake</p>
          <h1 className="text-xl font-bold">Customer self-service in ~1 minute</h1>
        </div>
        <img src="/logo-mark.png" alt="" className="h-9 w-9" />
      </div>

      <div className="flex flex-1 items-center justify-center gap-8 p-8">
        <div
          className={`w-56 shrink-0 rounded-[2rem] border-4 border-slate-700 bg-black p-4 transition-opacity ${
            phase === "form" || phase === "done" ? "opacity-40" : "opacity-100"
          }`}
        >
          <p className="text-center text-[10px] text-white/40">Incoming call</p>
          <p className="mt-2 text-center text-sm font-semibold">Ridgeline Restoration</p>
          {phase === "call" && (
            <p className="mt-6 text-center text-xs text-emerald-400 animate-pulse">Ringing…</p>
          )}
          {phase === "menu" && (
            <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-white/80">
              <p>Press 1 to book service</p>
              <p className="rounded-lg bg-[#9a7f5e]/30 px-2 py-1 font-semibold text-[#f5f0e8]">
                Press 2 → text me a link
              </p>
            </div>
          )}
          {(phase === "sms" || phase === "form" || phase === "done") && (
            <p className="mt-4 text-center text-[11px] text-white/50">Call ended · Link sent</p>
          )}
        </div>

        <div
          className={`w-64 transition-all ${
            phase === "sms" || phase === "form" || phase === "done"
              ? "scale-100 opacity-100"
              : "scale-95 opacity-30"
          }`}
        >
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/50 p-4">
            <p className="text-[10px] font-bold text-emerald-400">SMS</p>
            <p className="mt-2 text-[11px] leading-relaxed text-emerald-50">
              Ridgeline: Hi! Thanks for calling! Finish here (~1 min):
              <br />
              <span className="text-emerald-300 underline">effiroad.com/r/…</span>
            </p>
          </div>
        </div>

        <div
          className={`w-72 rounded-2xl border border-white/10 bg-[#faf8f5] p-4 text-[#3d3228] shadow-xl transition-all ${
            phase === "form" || phase === "done"
              ? "scale-100 opacity-100"
              : "scale-95 opacity-30"
          }`}
        >
          <p className="text-xs font-bold text-[#9a7f5e]">Report your loss</p>
          <div className="mt-3 space-y-2">
            {["Mike Wilson", "4821 Oak Dr, Austin TX", "Basement flooding"].map((v, i) => (
              <div
                key={v}
                className={`rounded-lg border border-[#ebe3d6] bg-white px-3 py-2 text-[11px] ${
                  phase === "form" && i <= 1 ? "ring-2 ring-[#9a7f5e]/40" : ""
                }`}
              >
                {v}
              </div>
            ))}
          </div>
          {phase === "done" && (
            <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-center text-[11px] font-semibold text-emerald-800">
              Request sent · Owner notified
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
