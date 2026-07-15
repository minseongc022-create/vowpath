"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHONE_DEMO_TIMELINE, type PhoneDemoPhase } from "@/lib/demo-phone-script";

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

export function DemoAiPhoneScene() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [customerLines, setCustomerLines] = useState<string[]>([]);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [systemLine, setSystemLine] = useState<string | null>(null);
  const [smsLine, setSmsLine] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
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
    setTyping(false);

    let cursor = 400;
    PHONE_DEMO_TIMELINE.forEach((phase, idx) => {
      cursor += phase.delayMs;
      if (phase.kind === "customer-text") {
        timeouts.current.push(
          setTimeout(() => setTyping(true), cursor - 400),
        );
      }
      timeouts.current.push(
        setTimeout(() => {
          setVisibleCount(idx + 1);
          if (phase.kind === "system") setSystemLine(phase.text);
          if (phase.kind === "sms") setSmsLine(phase.text);
          if (phase.kind === "customer-text") {
            setTyping(false);
            setCustomerLines((prev) => [...prev, phase.text]);
          }
          if (phase.kind === "ai-voice") void playAi(phase);
        }, cursor),
      );
    });

    timeouts.current.push(
      setTimeout(() => run(), cursor + 3000),
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
            Only AI voice on the call — customer replies by text (no caller audio)
          </p>
        </div>
        <img src="/logo-mark.png" alt="" className="h-10 w-10 opacity-90" />
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
              {speaking ? (
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  AI speaking…
                </p>
              ) : null}
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
            <div className="flex items-center justify-center gap-3 border-t border-white/10 py-4">
              <span className="h-10 w-10 rounded-full bg-red-500/90" />
              <span className="h-12 w-12 rounded-full bg-emerald-500/90 ring-4 ring-emerald-500/30" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            Customer — text only (no voice)
          </p>
          <div className="min-h-[200px] space-y-3 rounded-2xl border border-white/10 bg-black/45 p-4">
            {customerLines.length === 0 && !typing ? (
              <p className="text-sm text-white/35">Customer messages appear here as they type…</p>
            ) : (
              customerLines.map((line, i) => (
                <div
                  key={`${line}-${i}`}
                  className="ml-auto max-w-[95%] animate-[fadeIn_0.35s_ease-out] rounded-2xl rounded-tr-sm bg-sky-500/20 px-4 py-3 text-sm leading-relaxed text-white ring-1 ring-sky-400/30"
                >
                  {line}
                </div>
              ))
            )}
            {typing ? (
              <div className="ml-auto flex max-w-[40%] items-center gap-1 rounded-2xl bg-white/10 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "120ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "240ms" }} />
              </div>
            ) : null}
          </div>

          {smsLine && visibleCount > 0 ? (
            <div className="mt-4 animate-[fadeIn_0.4s_ease-out] rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-4">
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
