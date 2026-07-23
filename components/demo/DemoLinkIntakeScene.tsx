"use client";

import { useEffect, useState } from "react";
import { LINK_INTAKE_CONFIG, type DemoVertical } from "@/lib/demo-vertical-config";

type Phase = "call" | "menu" | "purpose" | "sms" | "form" | "next";

const PHASE_LABELS: Record<Phase, string> = {
  call: "Incoming call — you're on a job",
  menu: "Caller chooses the text link",
  purpose: "Link covers booking, estimate, or callback",
  sms: "Secure link sent by SMS",
  form: "Customer fills request details",
  next: "Owner notified — next action is clear",
};

const PHASES: Phase[] = ["call", "menu", "purpose", "sms", "form", "next"];
const CYCLE_MS = 28_000;

export function DemoLinkIntakeScene({ vertical = "restoration" }: { vertical?: DemoVertical }) {
  const cfg = LINK_INTAKE_CONFIG[vertical];
  const formFields = [
    { label: "Request type", value: vertical === "hvac" ? "Book service · No heat" : "Emergency service · Water loss" },
    { label: "Name", value: cfg.customerName },
    { label: "Address", value: cfg.address },
    { label: "Issue", value: cfg.issue },
    { label: "Best time", value: "ASAP · Text updates OK" },
  ] as const;

  const [phase, setPhase] = useState<Phase>("call");
  const [filledFields, setFilledFields] = useState(0);

  useEffect(() => {
    function runCycle() {
      setPhase("call");
      setFilledFields(0);
      const t1 = setTimeout(() => setPhase("menu"), 3600);
      const t2 = setTimeout(() => setPhase("purpose"), 7600);
      const t3 = setTimeout(() => setPhase("sms"), 11800);
      const t4 = setTimeout(() => {
        setPhase("form");
        setFilledFields(1);
      }, 15400);
      const t5 = setTimeout(() => setFilledFields(2), 16800);
      const t6 = setTimeout(() => setFilledFields(3), 18200);
      const t7 = setTimeout(() => setFilledFields(4), 19600);
      const t8 = setTimeout(() => setFilledFields(5), 21000);
      const t9 = setTimeout(() => setPhase("next"), 22800);
      return [t1, t2, t3, t4, t5, t6, t7, t8, t9];
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

  const phaseIndex = PHASES.indexOf(phase);

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#12100e] to-[#1a1612] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">Text link intake</p>
          <h1 className="text-xl font-bold md:text-2xl">Press 2 → choose purpose → send booking or estimate details</h1>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#b59b78]">
          Step {phaseIndex + 1} / {PHASES.length}
        </div>
      </div>

      <div className="mx-8 mt-3 flex gap-1 md:mx-10">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= phaseIndex ? "bg-[#9a7f5e]" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <p className="mt-3 px-8 text-center text-xs font-medium text-white/45 md:px-10">{PHASE_LABELS[phase]}</p>

      <div className="grid flex-1 grid-cols-1 items-center gap-5 p-6 md:grid-cols-2 md:gap-8 md:p-10">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-xs rounded-[2rem] border-4 border-slate-700 bg-black p-5 shadow-2xl">
            <p className="text-center text-[10px] uppercase tracking-widest text-white/40">Customer phone</p>
            <p className="mt-1 text-center text-lg font-semibold">{cfg.shopName}</p>

            {phase === "call" && (
              <div className="mt-8 text-center">
                <p className="animate-pulse text-sm font-semibold text-emerald-400">Incoming call…</p>
                <p className="mt-2 text-xs text-white/40">{vertical === "hvac" ? "7:12 PM" : "2:47 AM"}</p>
              </div>
            )}

            {phase === "menu" && (
              <div className="mt-6 space-y-2 text-sm">
                <p className="rounded-lg bg-white/5 px-3 py-2 text-white/50">Press 1 — service / emergency (AI on this call)</p>
                <p className="rounded-lg bg-white/5 px-3 py-2 text-white/50">Press 2 — free estimate (AI on this call)</p>
                <p className="animate-pulse rounded-xl bg-[#9a7f5e]/45 px-4 py-3 font-semibold text-[#f5f0e8] ring-2 ring-[#9a7f5e]">
                  Say “text link” — SMS form ✓
                </p>
              </div>
            )}

            {phase === "purpose" && (
              <div className="mt-6 space-y-2 text-sm">
                {["Emergency / booking", "Free estimate", "Schedule callback"].map((label, i) => (
                  <p
                    key={label}
                    className={`rounded-xl px-4 py-3 font-semibold ${
                      i === 0 ? "bg-[#9a7f5e]/45 text-[#f5f0e8] ring-2 ring-[#9a7f5e]" : "bg-white/5 text-white/55"
                    }`}
                  >
                    {label}
                  </p>
                ))}
              </div>
            )}

            {(phase === "sms" || phase === "form" || phase === "next") && (
              <p className="mt-8 text-center text-sm text-emerald-400">✓ Call ended · Link sent</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className={`rounded-2xl border border-emerald-500/40 bg-emerald-950/55 p-4 transition-all duration-500 ${
              phase === "sms" || phase === "form" || phase === "next" ? "opacity-100" : "opacity-25"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">SMS to customer</p>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50">
              {cfg.smsBrand}: Finish your request here. Choose booking, estimate, or callback:
              <span className="mt-1 block font-medium text-emerald-300 underline">effiroad.com/r/abc123</span>
            </p>
          </div>

          <div
            className={`rounded-2xl border border-white/10 bg-[#faf8f5] p-5 text-[#3d3228] shadow-xl transition-all duration-500 ${
              phase === "form" || phase === "next" ? "scale-100 opacity-100" : "scale-95 opacity-30"
            }`}
          >
            <p className="text-sm font-bold text-[#9a7f5e]">Mobile request form · booking / estimate / callback</p>
            <div className="mt-3 space-y-2">
              {formFields.map((field, i) => (
                <div key={field.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a7f5e]/80">
                    {field.label}
                  </p>
                  <div
                    className={`mt-0.5 rounded-lg border border-[#ebe3d6] bg-white px-3 py-2.5 text-sm transition-all duration-300 ${
                      filledFields > i ? "ring-2 ring-[#9a7f5e]/50" : "text-transparent"
                    }`}
                  >
                    {filledFields > i ? field.value : "…"}
                  </div>
                </div>
              ))}
            </div>
            {phase === "next" && (
              <p className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
                ✓ Saved to dashboard · Owner notified · Ready for approval or scheduling
              </p>
            )}
          </div>

          <div
            className={`rounded-2xl border border-[#9a7f5e]/40 bg-black/55 p-4 transition-all duration-500 ${
              phase === "next" ? "scale-100 opacity-100" : "scale-95 opacity-25"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#b59b78]">What happens next</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <span className="rounded-xl bg-white/10 px-2 py-3">Owner SMS</span>
              <span className="rounded-xl bg-white/10 px-2 py-3">Dashboard card</span>
              <span className="rounded-xl bg-white/10 px-2 py-3">Dispatch / callback</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
