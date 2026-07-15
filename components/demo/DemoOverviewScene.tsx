"use client";

import { useEffect, useState } from "react";
import {
  DEMO_VERTICAL_CONFIG,
  OVERVIEW_INTRO,
  OVERVIEW_STEPS,
  type DemoVertical,
} from "@/lib/demo-vertical-config";

export function DemoOverviewScene({ vertical = "restoration" }: { vertical?: DemoVertical }) {
  const steps = OVERVIEW_STEPS[vertical];
  const intro = OVERVIEW_INTRO[vertical];
  const identity = DEMO_VERTICAL_CONFIG[vertical].identityLine;
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const timings = [4200, 5600, 5600, 6200, 6200, 5200];
    let i = -1;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i = (i + 1) % (steps.length + 2);
      setStep(i - 1);
      t = setTimeout(tick, timings[i] ?? 5400);
    };
    t = setTimeout(tick, 700);
    return () => clearTimeout(t);
  }, [steps.length]);

  const activeStep = Math.min(Math.max(step, 0), steps.length - 1);
  const isFinal = step >= steps.length;
  const progress = step < 0 ? 8 : isFinal ? 100 : ((activeStep + 1) / (steps.length + 1)) * 100;
  const verticalLabel = vertical === "hvac" ? "HVAC" : "Restoration";
  const decisionLabel = vertical === "hvac" ? "No-heat dispatch · Gas hold" : "P1 water dispatch · Risk hold";

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-[#0c0b0a] via-[#141210] to-[#1a1612] text-white">
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#9a7f5e]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-8 py-5 md:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">Effiroad</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{verticalLabel} calls, handled end-to-end</h1>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/35 px-4 py-2">
          <img src="/logo-mark.png" alt="" className="h-9 w-9 opacity-90" />
          <span className="text-xs font-semibold text-white/60">Nights · Weekends · Field missed calls</span>
        </div>
      </div>

      <div className="relative z-10 mx-8 mt-4 h-1 overflow-hidden rounded-full bg-white/10 md:mx-12">
        <div
          className="h-full rounded-full bg-[#9a7f5e] transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 py-7 md:gap-7 md:px-12">
        {step < 0 ? (
          <div className="max-w-2xl text-center">
            <p className="animate-pulse text-6xl md:text-7xl">{intro.emoji}</p>
            <p className="mt-5 text-2xl font-bold md:text-3xl">{intro.title}</p>
            <p className="mt-3 text-base text-white/55">{intro.subtitle}</p>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#b59b78]/90">{identity}</p>
          </div>
        ) : isFinal ? (
          <div className="grid w-full max-w-5xl grid-cols-3 gap-4">
            {[
              ["1", "Call answered", "Caller never hits voicemail"],
              ["2", "Decision made", decisionLabel],
              ["3", "Tech moving", "Crew SMS accepted · ETA sent"],
            ].map(([num, title, body]) => (
              <div key={title} className="rounded-2xl border border-emerald-500/30 bg-emerald-950/35 p-6 text-center shadow-2xl">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-black text-black">
                  {num}
                </span>
                <h2 className="mt-4 text-xl font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-emerald-50/75">{body}</p>
              </div>
            ))}
            <p className="col-span-3 mt-3 text-center text-lg font-semibold text-[#b59b78]">
              Effiroad is the answering + approval + dispatch layer for the calls you cannot take live.
            </p>
          </div>
        ) : (
          <>
            <div className="grid w-full max-w-5xl grid-cols-4 gap-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className={`rounded-xl border px-3 py-3 text-center transition-all duration-700 ${
                    i === activeStep
                      ? "scale-105 border-[#9a7f5e] bg-[#9a7f5e]/30 shadow-xl shadow-[#9a7f5e]/20"
                      : i < activeStep
                        ? "border-white/15 bg-white/8 opacity-70"
                        : "border-white/8 bg-white/3 opacity-30"
                  }`}
                >
                  <p className="text-xl md:text-2xl">{s.icon}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#b59b78] md:text-xs">
                    {i + 1}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid w-full max-w-5xl grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
              {[
                { label: "Caller", detail: activeStep === 0 ? "Unanswered main line" : "Name + address captured", icon: "📞" },
                { label: "Effiroad", detail: steps[activeStep].tag, icon: "🤖" },
                {
                  label: activeStep >= 2 ? "Owner / Crew" : "Schedule",
                  detail: activeStep >= 2 ? decisionLabel : "Only answers when you choose",
                  icon: activeStep >= 2 ? "🚚" : "📅",
                },
              ].flatMap((card, i, arr) => {
                const node = (
                  <div
                    key={card.label}
                    className={`rounded-2xl border p-5 text-center shadow-2xl transition-all duration-700 ${
                      i <= Math.min(activeStep, 2)
                        ? "border-[#9a7f5e]/50 bg-black/65"
                        : "border-white/10 bg-black/25 opacity-45"
                    }`}
                  >
                    <p className="text-4xl">{card.icon}</p>
                    <p className="mt-3 text-sm font-bold uppercase tracking-widest text-[#b59b78]">{card.label}</p>
                    <p className="mt-2 text-sm text-white/70">{card.detail}</p>
                  </div>
                );
                if (i === arr.length - 1) return [node];
                return [
                  node,
                  <div key={`arrow-${i}`} className="text-3xl text-[#b59b78] transition-transform duration-700">
                    →
                  </div>,
                ];
              })}
            </div>

            <div className="w-full max-w-3xl rounded-2xl border border-white/12 bg-black/65 px-6 py-6 text-center shadow-2xl md:px-10">
              <span className="inline-block rounded-full bg-[#9a7f5e]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#b59b78]">
                {steps[activeStep].tag}
              </span>
              <h2 className="mt-4 text-xl font-bold md:text-2xl">{steps[activeStep].title}</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
                {steps[activeStep].body}
              </p>
            </div>
          </>
        )}

        <p className="text-xs text-white/35">Set answer hours · Forward missed calls · Dispatch without voicemail</p>
      </div>
    </div>
  );
}
