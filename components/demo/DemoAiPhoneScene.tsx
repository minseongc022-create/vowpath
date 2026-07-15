"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHONE_DEMO_TIMELINE, type PhoneDemoPhase } from "@/lib/demo-phone-script";

const STEPS = ["Ring", "Answer", "Intake", "Dispatch", "Done"] as const;

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-10 items-end justify-center gap-1.5" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-emerald-400 transition-all ${
            active ? "animate-pulse" : "opacity-25"
          }`}
          style={{ height: active ? `${14 + (i % 3) * 12}px` : "10px", animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

export function DemoAiPhoneScene({ recordMode = false }: { recordMode?: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [customerLines, setCustomerLines] = useState<string[]>([]);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [systemLine, setSystemLine] = useState<string | null>(null);
  const [smsLine, setSmsLine] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
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
        setTimeout(resolve, Math.max(phase.text.length * 60, 3000));
      });
    } catch {
      await new Promise((r) => setTimeout(r, Math.max(phase.text.length * 60, 3000)));
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
    setTyping(false);
    setStepIdx(0);

    let cursor = 400;
    PHONE_DEMO_TIMELINE.forEach((phase, idx) => {
      cursor += phase.delayMs;
      if (phase.kind === "customer-text") {
        timeouts.current.push(setTimeout(() => setTyping(true), cursor - 500));
      }
      timeouts.current.push(
        setTimeout(() => {
          setVisibleCount(idx + 1);
          if (phase.kind === "system") {
            setSystemLine(phase.text);
            if (phase.text.includes("Incoming")) setStepIdx(0);
            if (phase.text.includes("Owner replied")) setStepIdx(3);
            if (phase.text.includes("Intake saved")) setStepIdx(4);
          }
          if (phase.kind === "sms") {
            setSmsLine(phase.text);
            setStepIdx(3);
          }
          if (phase.kind === "customer-text") {
            setTyping(false);
            setCustomerLines((prev) => [...prev, phase.text]);
            setStepIdx(2);
          }
          if (phase.kind === "ai-voice") {
            setStepIdx((s) => (s < 1 ? 1 : s));
            void playAi(phase);
          }
        }, cursor),
      );
    });

    if (!recordMode) {
      timeouts.current.push(setTimeout(() => run(), cursor + 5000));
    }
  }, [playAi, recordMode]);

  useEffect(() => {
    run();
    return () => {
      for (const t of timeouts.current) clearTimeout(t);
      audioRef.current?.pause();
    };
  }, [run]);

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#12100e] to-[#1a1612] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-8 md:py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">
            Full call — start to finish
          </p>
          <h1 className="text-lg font-bold md:text-2xl">AI answers · intake · dispatch</h1>
        </div>
        <div className="hidden gap-1 sm:flex">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                i === stepIdx
                  ? "bg-[#9a7f5e] text-white"
                  : i < stepIdx
                    ? "bg-white/15 text-white/70"
                    : "bg-white/5 text-white/35"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 p-5 md:grid-cols-2 md:gap-6 md:p-8">
        <div className="flex flex-col items-center justify-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            On the call — AI voice only
          </p>
          <div className="w-full max-w-xs overflow-hidden rounded-[2rem] border-4 border-slate-700 bg-black shadow-2xl">
            <div className="bg-gradient-to-b from-brand-900/90 to-black px-4 py-6 text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Active call</p>
              <p className="mt-1 text-lg font-semibold">Effiroad AI</p>
              <p className="text-xs text-emerald-400">2:14 AM · Recording</p>
              <div className="mt-4">
                <Waveform active={speaking} />
              </div>
            </div>
            <div className="min-h-[150px] bg-[#141210] px-4 py-4">
              {aiLine ? (
                <div className="rounded-xl bg-[#9a7f5e]/25 p-3 ring-1 ring-[#9a7f5e]/50">
                  <p className="text-[10px] font-bold uppercase text-[#b59b78]">AI (voice)</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#f5f0e8]">{aiLine}</p>
                </div>
              ) : (
                <p className="pt-6 text-center text-xs text-white/30">Connecting caller…</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            Customer — text only
          </p>
          <div className="min-h-[200px] space-y-3 rounded-2xl border border-white/10 bg-black/45 p-4">
            {customerLines.length === 0 && !typing ? (
              <p className="text-sm text-white/35">Customer messages appear here…</p>
            ) : (
              customerLines.map((line, i) => (
                <div
                  key={`${line}-${i}`}
                  className="ml-auto max-w-[95%] rounded-2xl rounded-tr-sm bg-sky-500/20 px-4 py-3 text-sm leading-relaxed text-white ring-1 ring-sky-400/30"
                >
                  {line}
                </div>
              ))
            )}
            {typing ? (
              <div className="ml-auto flex max-w-[40%] items-center gap-1 rounded-2xl bg-white/10 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "120ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "240ms" }} />
              </div>
            ) : null}
          </div>

          {smsLine ? (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Owner SMS</p>
              <p className="mt-2 text-xs leading-relaxed text-emerald-100">{smsLine}</p>
            </div>
          ) : null}

          {systemLine ? (
            <p className="mt-4 text-center text-xs font-semibold text-[#b59b78]">{systemLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
