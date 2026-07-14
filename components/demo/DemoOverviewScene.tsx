"use client";

import { useEffect, useState } from "react";

type Phase = "intro" | "step1" | "step2" | "step3" | "step4";

const STEPS = [
  { title: "Your number stays the same", body: "Forward unanswered calls to Effiroad — Google & truck decals unchanged." },
  { title: "AI answers 24/7", body: "English phone menu · voice intake or press 2 for a text link." },
  { title: "Jobs captured & triaged", body: "Address, loss type, urgency — P1 water can auto-dispatch." },
  { title: "You approve exceptions", body: "Fire, mold, or unclear jobs → SMS you 1 / 2 before dispatch." },
] as const;

export function DemoOverviewScene() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const seq: { p: Phase; a: number; ms: number }[] = [
      { p: "intro", a: 0, ms: 2200 },
      { p: "step1", a: 0, ms: 3500 },
      { p: "step2", a: 1, ms: 3500 },
      { p: "step3", a: 2, ms: 3500 },
      { p: "step4", a: 3, ms: 3500 },
    ];
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const s = seq[i];
      setPhase(s.p);
      setActive(s.a);
      i = (i + 1) % seq.length;
      t = setTimeout(tick, s.ms);
    };
    t = setTimeout(tick, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#141210] to-[#1a1612] text-white">
      <div className="flex items-center justify-between px-8 py-6 md:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">Effiroad</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-4xl">What we do — in 60 seconds</h1>
          <p className="mt-2 max-w-xl text-sm text-white/55 md:text-base">
            AI answering for independent restoration &amp; HVAC shops · 1–15 crew · no CRM required
          </p>
        </div>
        <img src="/logo-mark.png" alt="" className="hidden h-14 w-14 opacity-90 sm:block" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-10 md:px-12">
        {phase === "intro" ? (
          <div className="max-w-2xl animate-pulse text-center">
            <p className="text-5xl md:text-6xl">📞</p>
            <p className="mt-6 text-xl font-semibold md:text-2xl">Never miss a 2 AM emergency call again</p>
            <p className="mt-3 text-sm text-white/50">Same line · AI intake · crew dispatch · you stay in control</p>
          </div>
        ) : (
          <>
            <div className="grid w-full max-w-3xl grid-cols-4 gap-2 md:gap-4">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className={`rounded-xl border px-2 py-3 text-center transition-all duration-700 md:px-4 md:py-5 ${
                    i === active
                      ? "scale-105 border-[#9a7f5e] bg-[#9a7f5e]/25 shadow-lg shadow-[#9a7f5e]/25"
                      : "border-white/10 bg-white/5 opacity-40"
                  }`}
                >
                  <p className="text-lg font-bold text-[#b59b78] md:text-2xl">{i + 1}</p>
                </div>
              ))}
            </div>
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/50 px-6 py-8 text-center shadow-2xl md:px-10 md:py-10">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#b59b78]">
                Step {active + 1} of 4
              </p>
              <h2 className="mt-4 text-xl font-bold md:text-3xl">{STEPS[active].title}</h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/70 md:text-lg">
                {STEPS[active].body}
              </p>
            </div>
          </>
        )}
        <p className="text-xs text-white/35">14-day free trial · Go live in ~10 minutes</p>
      </div>
    </div>
  );
}
