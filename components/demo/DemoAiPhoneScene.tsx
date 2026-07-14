"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHONE_DEMO_TIMELINE, type PhoneDemoPhase } from "@/lib/demo-phone-script";

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-end justify-center gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-emerald-400 transition-all ${
            active ? "animate-pulse" : "opacity-30"
          }`}
          style={{ height: active ? `${12 + (i % 3) * 10}px` : "8px", animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function DemoAiPhoneScene() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [customerLines, setCustomerLines] = useState<string[]>([]);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [systemLine, setSystemLine] = useState<string | null>(null);
  const [smsLine, setSmsLine] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playAi = useCallback(async (phase: Extract<PhoneDemoPhase, { kind: "ai-voice" }>) => {
    setAiLine(phase.text);
    setSpeaking(true);
    const audio = new Audio(`/demo-audio/voice-ai-${phase.audioIndex}.mp3`);
    audioRef.current = audio;
    try {
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        setTimeout(resolve, Math.max(phase.text.length * 55, 2500));
      });
    } catch {
      await new Promise((r) => setTimeout(r, Math.max(phase.text.length * 55, 2500)));
    } finally {
      setSpeaking(false);
    }
  }, []);

  const run = useCallback(() => {
    for (const t of timeouts.current) clearTimeout(t);
    timeouts.current = [];
    setVisibleCount(0);
    setCustomerLines([]);
    setAiLine(null);
    setSystemLine(null);
    setSmsLine(null);
    setSpeaking(false);

    let cursor = 400;
    PHONE_DEMO_TIMELINE.forEach((phase, idx) => {
      cursor += phase.delayMs;
      timeouts.current.push(
        setTimeout(() => {
          setVisibleCount(idx + 1);
          if (phase.kind === "system") setSystemLine(phase.text);
          if (phase.kind === "sms") setSmsLine(phase.text);
          if (phase.kind === "customer-text") {
            setCustomerLines((prev) => [...prev, phase.text]);
          }
          if (phase.kind === "ai-voice") void playAi(phase);
        }, cursor),
      );
    });

    timeouts.current.push(
      setTimeout(() => run(), cursor + 3500),
    );
  }, [playAi]);

  useEffect(() => {
    run();
    return () => {
      for (const t of timeouts.current) clearTimeout(t);
      audioRef.current?.pause();
    };
  }, [run]);

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#12100e] to-[#1a1612] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">
            How Effiroad responds
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">AI speaks · customer types</h1>
          <p className="mt-1 text-sm text-white/50">
            Real AI voice on the call — customer replies by text (no recorded caller audio)
          </p>
        </div>
        <img src="/logo-mark.png" alt="" className="h-10 w-10 opacity-90" />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 p-6 md:grid-cols-2 md:p-10">
        {/* Phone — AI voice */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-xs overflow-hidden rounded-[2rem] border-4 border-slate-700 bg-black shadow-2xl">
            <div className="bg-gradient-to-b from-brand-900/80 to-black px-4 py-6 text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">On call</p>
              <p className="mt-1 text-lg font-semibold">Effiroad AI</p>
              <p className="text-xs text-emerald-400">2:14 AM · Recording</p>
              <div className="mt-4">
                <Waveform active={speaking} />
              </div>
            </div>
            <div className="min-h-[140px] bg-[#141210] px-4 py-4">
              {aiLine ? (
                <div className="rounded-xl bg-[#9a7f5e]/25 p-3 ring-1 ring-[#9a7f5e]/50">
                  <p className="text-[10px] font-bold uppercase text-[#b59b78]">AI (voice)</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#f5f0e8]">{aiLine}</p>
                </div>
              ) : (
                <p className="text-center text-xs text-white/30">Waiting for caller…</p>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 border-t border-white/10 py-4">
              <span className="h-10 w-10 rounded-full bg-red-500/90" />
              <span className="h-12 w-12 rounded-full bg-emerald-500/90 ring-4 ring-emerald-500/30" />
            </div>
          </div>
        </div>

        {/* Customer — text only */}
        <div className="flex flex-col justify-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
            Customer (text / keypad — no voice)
          </p>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            {customerLines.length === 0 ? (
              <p className="text-sm text-white/35">Customer messages appear here as they type…</p>
            ) : (
              customerLines.map((line) => (
                <div
                  key={line}
                  className="ml-auto max-w-[95%] rounded-2xl rounded-tr-sm bg-white/15 px-4 py-3 text-sm leading-relaxed text-white"
                >
                  {line}
                </div>
              ))
            )}
          </div>

          {smsLine && visibleCount > 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-4">
              <p className="text-[10px] font-bold text-emerald-400">Owner SMS</p>
              <p className="mt-2 text-xs leading-relaxed text-emerald-100">{smsLine}</p>
            </div>
          ) : null}

          {systemLine ? (
            <p className="mt-4 text-center text-xs font-medium text-[#b59b78]">{systemLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
