"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    num: "1",
    title: "Customer calls your number",
    body: "Same line on Google and your trucks. You forward unanswered calls to Effiroad.",
    icon: "📞",
  },
  {
    num: "2",
    title: "Effiroad answers 24/7",
    body: "Talk on the phone with AI, or press 2 to get a text link (~1 min form).",
    icon: "🤖",
  },
  {
    num: "3",
    title: "Intake is captured",
    body: "Name, address, loss type, and urgency — ready for dispatch.",
    icon: "📋",
  },
  {
    num: "4",
    title: "You stay in control",
    body: "Clear emergencies → crew notified. Fire, mold, or unclear jobs → you approve by text.",
    icon: "✓",
  },
] as const;

export function DemoOverviewScene() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 3200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#141210] to-[#1a1612] text-white">
      <div className="flex items-center justify-between px-10 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">How it works</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Effiroad in 4 steps</h1>
          <p className="mt-1 text-sm text-white/50">
            AI phone intake for independent restoration &amp; HVAC shops
          </p>
        </div>
        <img src="/logo-mark.png" alt="" className="h-11 w-11 opacity-90" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-10">
        <div className="grid w-full max-w-3xl grid-cols-4 gap-3">
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              className={`rounded-xl border px-3 py-4 text-center transition-all duration-500 ${
                i === active
                  ? "border-[#9a7f5e] bg-[#9a7f5e]/20 shadow-lg shadow-[#9a7f5e]/20"
                  : "border-white/10 bg-white/5 opacity-50"
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#b59b78]">
                Step {s.num}
              </p>
            </div>
          ))}
        </div>

        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/40 px-8 py-8 text-center shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#b59b78]">
            Step {STEPS[active].num}
          </p>
          <h2 className="mt-3 text-xl font-bold sm:text-2xl">{STEPS[active].title}</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
            {STEPS[active].body}
          </p>
        </div>

        <p className="text-xs text-white/35">
          No new phone number · No CRM swap · Go live in ~10 minutes
        </p>
      </div>
    </div>
  );
}
