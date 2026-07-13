"use client";

import { useEffect, useState } from "react";
import { VOICE_EMERGENCY_DEMO } from "@/lib/demo-scripts";

const CAPTIONS = VOICE_EMERGENCY_DEMO.filter((s) => s.role === "ai" || s.role === "caller");

export function DemoLiveCallScene() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const captionIdx = Math.min(
    Math.max(0, Math.floor((elapsed - 1) / 5)),
    CAPTIONS.length - 1,
  );
  const cap = CAPTIONS[captionIdx];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#0a0a0a] to-[#141210] text-white">
      <div className="flex items-center justify-between px-8 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#b59b78]">Live product</p>
          <h1 className="text-xl font-bold">Retell AI · Active call</h1>
        </div>
        <img src="/logo-mark.png" alt="" className="h-9 w-9 opacity-90" />
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-[2.5rem] border-4 border-slate-700 bg-black shadow-2xl">
            <div className="bg-gradient-to-b from-slate-900 to-black px-6 pb-8 pt-12 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#9a7f5e]/30 ring-2 ring-[#9a7f5e]/50">
                <span className="text-2xl font-bold text-[#f5f0e8]">AI</span>
              </div>
              <p className="text-lg font-semibold">Effiroad Intake</p>
              <p className="text-sm text-white/50">Ridgeline Restoration</p>
              <p className="mt-2 font-mono text-sm text-emerald-400">
                {mm}:{ss}
              </p>

              <div className="mt-6 flex h-10 items-end justify-center gap-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-emerald-400/80"
                    style={{
                      height: `${12 + Math.sin((elapsed * 3 + i) * 0.5) * 10 + 8}px`,
                      animation: "pulse 0.8s ease-in-out infinite",
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="mt-6 min-h-[72px] rounded-2xl bg-white/5 px-4 py-3 text-left">
                {cap && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#b59b78]">
                      {cap.role === "ai" ? "Effiroad AI" : "Caller"}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/90">{cap.text}</p>
                  </>
                )}
              </div>

              <div className="mt-8 flex justify-center gap-10">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/90 text-xs font-bold">
                  End
                </span>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg">
                  🔇
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-white/40">
            Production Retell agent · SIP bridge from Twilio
          </p>
        </div>
      </div>
    </div>
  );
}
