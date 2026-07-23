"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    title: "Create your account",
    body: "Shop name, +1 mobile, on-call hours. About 2 minutes.",
    detail: "effiroad.com/signup",
  },
  {
    title: "Forward your main line",
    body: "Keep your Google & truck number. Forward unanswered calls to Effiroad.",
    detail: "Carrier guide built in · No new number",
  },
  {
    title: "Run one test call",
    body: "Hear the menu: press 1 = service AI, press 2 = estimate AI. Or say “text link” for an SMS form.",
    detail: "Dashboard shows every call & recording",
  },
] as const;

export function DemoOnboardingScene() {
  const [active, setActive] = useState(0);
  const [checkmarks, setCheckmarks] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setActive((a) => {
        const next = (a + 1) % STEPS.length;
        setCheckmarks((c) => Math.min(c + 1, STEPS.length));
        if (next === 0) setCheckmarks(0);
        return next;
      });
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-[#faf8f5] text-[#3d3228]">
      <div className="flex items-center justify-between border-b border-[#ebe3d6] bg-white px-10 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7f5e]">Getting started</p>
          <h1 className="text-2xl font-bold">Go live in ~10 minutes</h1>
        </div>
        <img src="/logo-horizontal.png" alt="Effiroad" className="h-7" />
      </div>

      <div className="flex flex-1 items-center justify-center p-10">
        <div className="w-full max-w-xl space-y-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`rounded-2xl border p-6 transition-all duration-500 ${
                i === active
                  ? "border-[#9a7f5e] bg-white shadow-lg shadow-[#9a7f5e]/10"
                  : i < checkmarks
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-[#ebe3d6] bg-white/60 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    i < checkmarks
                      ? "bg-emerald-600 text-white"
                      : i === active
                        ? "bg-[#9a7f5e] text-white"
                        : "bg-[#f5f0e8] text-[#9a7f5e]"
                  }`}
                >
                  {i < checkmarks ? "✓" : i + 1}
                </span>
                <div>
                  <h2 className="text-lg font-bold">{step.title}</h2>
                  <p className="mt-1 text-sm text-stone-600">{step.body}</p>
                  <p className="mt-2 text-xs font-medium text-[#9a7f5e]">{step.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
