"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGasHoldAudioPrefix,
  HVAC_GAS_HOLD_TIMELINE,
  type PhoneDemoPhase,
} from "@/lib/demo-phone-script";

const STEPS = ["Ring", "Screen", "Hold", "Owner", "Done"] as const;

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-10 items-end justify-center gap-1.5" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-amber-400 transition-all ${active ? "animate-pulse" : "opacity-25"}`}
          style={{ height: active ? `${14 + (i % 3) * 12}px` : "10px", animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

export function DemoRiskHoldScene({ recordMode = false }: { recordMode?: boolean }) {
  const timeline = HVAC_GAS_HOLD_TIMELINE;
  const audioPrefix = getGasHoldAudioPrefix();
  const [customerLines, setCustomerLines] = useState<string[]>([]);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [systemLine, setSystemLine] = useState<string | null>(null);
  const [ownerSms, setOwnerSms] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [typing, setTyping] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  const playAi = useCallback(
    async (phase: Extract<PhoneDemoPhase, { kind: "ai-voice" }>) => {
      setAiLine(phase.text);
      setSpeaking(true);
      const audio = new Audio(`/demo-audio/${audioPrefix}-${phase.audioIndex}.mp3`);
      audioRef.current = audio;
      try {
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          setTimeout(resolve, Math.max(phase.text.length * 78, 3800));
        });
      } catch {
        await new Promise((r) => setTimeout(r, Math.max(phase.text.length * 78, 3800)));
      } finally {
        setSpeaking(false);
      }
    },
    [audioPrefix],
  );

  const run = useCallback(() => {
    cancelledRef.current = true;
    audioRef.current?.pause();
    cancelledRef.current = false;
    setCustomerLines([]);
    setAiLine(null);
    setSystemLine(null);
    setOwnerSms(null);
    setSpeaking(false);
    setTyping(false);
    setStepIdx(0);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const applyPhase = async (phase: PhoneDemoPhase) => {
      await sleep(phase.delayMs);
      if (cancelledRef.current) return;

      if (phase.kind === "system") {
        setSystemLine(phase.text);
        if (phase.text.includes("Incoming")) setStepIdx(0);
        if (phase.text.includes("Owner replied")) setStepIdx(3);
        if (phase.text.includes("Safety intake")) setStepIdx(4);
      }
      if (phase.kind === "sms") {
        setOwnerSms(phase.text);
        setStepIdx(2);
      }
      if (phase.kind === "customer-text") {
        setTyping(true);
        await sleep(650);
        if (cancelledRef.current) return;
        setTyping(false);
        setCustomerLines((prev) => [...prev, phase.text]);
        setStepIdx(1);
      }
      if (phase.kind === "ai-voice") {
        setStepIdx((s) => (s < 1 ? 1 : s));
        await playAi(phase);
        await sleep(650);
      }
    };

    void (async () => {
      for (const phase of timeline) {
        await applyPhase(phase);
        if (cancelledRef.current) return;
      }
      if (!recordMode) {
        await sleep(5000);
        if (!cancelledRef.current) run();
      }
    })();
  }, [playAi, recordMode, timeline]);

  useEffect(() => {
    run();
    return () => {
      cancelledRef.current = true;
      audioRef.current?.pause();
    };
  }, [run]);

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#141008] to-[#1a1408] text-white">
      <div className="flex items-center justify-between border-b border-amber-500/20 px-6 py-4 md:px-8 md:py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            Gas smell safety hold — full flow
          </p>
          <h1 className="text-lg font-bold md:text-2xl">Never auto-dispatch a safety call</h1>
        </div>
        <div className="hidden gap-1 sm:flex">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                i === stepIdx
                  ? "bg-amber-600 text-white"
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
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Safety screening · no crew until you approve
          </p>
          <div className="w-full max-w-xs overflow-hidden rounded-[2rem] border-4 border-amber-900/60 bg-black shadow-2xl ring-2 ring-amber-500/30">
            <div className="bg-gradient-to-b from-amber-950/90 to-black px-4 py-6 text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Safety call</p>
              <p className="mt-1 text-lg font-semibold">Effiroad</p>
              <p className="text-xs text-amber-400">9:18 PM · Gas smell</p>
              <div className="mt-4">
                <Waveform active={speaking} />
              </div>
            </div>
            <div className="min-h-[150px] bg-[#141210] px-4 py-4">
              {aiLine ? (
                <div className="rounded-xl bg-amber-950/40 p-3 ring-1 ring-amber-500/40">
                  <p className="text-[10px] font-bold uppercase text-amber-300">Receptionist</p>
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
          <div className="min-h-[160px] space-y-3 rounded-2xl border border-white/10 bg-black/45 p-4">
            {customerLines.map((line, i) => (
              <div
                key={`${line}-${i}`}
                className="ml-auto max-w-[95%] rounded-2xl rounded-tr-sm bg-sky-500/20 px-4 py-3 text-sm leading-relaxed text-white ring-1 ring-sky-400/30"
              >
                {line}
              </div>
            ))}
            {typing ? (
              <div className="ml-auto flex max-w-[40%] items-center gap-1 rounded-2xl bg-white/10 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "120ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "240ms" }} />
              </div>
            ) : null}
          </div>

          {ownerSms ? (
            <div className="mt-3 rounded-xl border border-amber-500/50 bg-amber-950/70 p-3 ring-1 ring-amber-400/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Owner SMS · 1 dispatch · 2 hold</p>
              <p className="mt-1.5 text-xs leading-relaxed text-amber-50">{ownerSms}</p>
            </div>
          ) : null}

          {systemLine ? (
            <p className="mt-4 text-center text-xs font-semibold text-amber-200/90">{systemLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
