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
    const timings = [1400, 2800, 2800, 2800, 3200];
    let i = -1;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i = (i + 1) % (steps.length + 1);
      setStep(i - 1);
      t = setTimeout(tick, timings[i] ?? 2800);
    };
    t = setTimeout(tick, 500);
    return () => clearTimeout(t);
  }, [steps.length]);

  const progress = step < 0 ? 0 : ((step + 1) / steps.length) * 100;

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#141210] to-[#1a1612] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-8 py-5 md:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">Effiroad</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">What we do — in 60 seconds</h1>
        </div>
        <img src="/logo-mark.png" alt="" className="h-12 w-12 opacity-90" />
      </div>

      <div className="mx-8 mt-4 h-1 overflow-hidden rounded-full bg-white/10 md:mx-12">
        <div
          className="h-full rounded-full bg-[#9a7f5e] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 md:gap-8 md:px-12">
        {step < 0 ? (
          <div className="max-w-2xl text-center">
            <p className="text-6xl md:text-7xl">{intro.emoji}</p>
            <p className="mt-5 text-2xl font-bold md:text-3xl">{intro.title}</p>
            <p className="mt-3 text-base text-white/55">{intro.subtitle}</p>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#b59b78]/90">{identity}</p>
          </div>
        ) : (
          <>
            <div className="grid w-full max-w-4xl grid-cols-4 gap-2 md:gap-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className={`rounded-xl border px-2 py-3 text-center transition-all duration-500 md:px-3 md:py-4 ${
                    i === step
                      ? "scale-105 border-[#9a7f5e] bg-[#9a7f5e]/30 shadow-lg shadow-[#9a7f5e]/20"
                      : i < step
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

            <div className="w-full max-w-2xl rounded-2xl border border-white/12 bg-black/55 px-6 py-8 text-center shadow-2xl md:px-10 md:py-9">
              <span className="inline-block rounded-full bg-[#9a7f5e]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#b59b78]">
                {steps[step].tag}
              </span>
              <h2 className="mt-4 text-xl font-bold md:text-2xl">{steps[step].title}</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/75 md:text-base">
                {steps[step].body}
              </p>
            </div>
          </>
        )}

        <p className="text-xs text-white/35">14-day free trial · Go live in ~10 minutes</p>
      </div>
    </div>
  );
}
