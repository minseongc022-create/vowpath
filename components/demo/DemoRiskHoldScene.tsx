"use client";

import { useCallback, useState, type RefObject } from "react";
import {
  getGasHoldAudioPrefix,
  HVAC_GAS_HOLD_TIMELINE,
  type PhoneDemoPhase,
} from "@/lib/demo-phone-script";
import { useDemoPhoneTimeline } from "@/lib/hooks/use-demo-phone-timeline";

const STEPS = ["Ring", "Screen", "Hold", "Owner", "Done"] as const;

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-end justify-center gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-amber-400 transition-all ${active ? "animate-pulse" : "opacity-25"}`}
          style={{ height: active ? `${12 + (i % 3) * 10}px` : "8px", animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

function stepIdxForGasHold(phase: PhoneDemoPhase): number | null {
  if (phase.kind === "system") {
    if (phase.text.includes("Incoming")) return 0;
    if (phase.text.includes("Owner replied")) return 3;
    if (phase.text.includes("Safety intake")) return 4;
  }
  if (phase.kind === "customer-text") return 1;
  if (phase.kind === "sms") return 2;
  return null;
}

function CustomerChatPanel({
  customerLines,
  typing,
  customerScrollRef,
}: {
  customerLines: string[];
  typing: boolean;
  customerScrollRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">
        Customer chat — text only
      </p>
      <div
        ref={customerScrollRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto rounded-xl border-2 border-sky-400/45 bg-sky-950/35 p-3 ring-2 ring-sky-400/20"
      >
        {customerLines.length === 0 && !typing ? (
          <p className="text-xs text-sky-100/50">Customer types here — no caller voice in demo</p>
        ) : (
          customerLines.map((line, i) => (
            <div
              key={`${line}-${i}`}
              className="ml-auto max-w-[98%] rounded-2xl rounded-tr-sm bg-sky-500/30 px-3 py-2.5 text-xs leading-relaxed text-white ring-1 ring-sky-300/40 sm:text-sm"
            >
              {line}
            </div>
          ))
        )}
        {typing ? (
          <div className="ml-auto flex max-w-[45%] items-center gap-1 rounded-2xl bg-white/10 px-3 py-2">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-200/80" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-200/80" style={{ animationDelay: "120ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-200/80" style={{ animationDelay: "240ms" }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type DemoRiskHoldSceneProps = {
  recordMode?: boolean;
  embedded?: boolean;
  enabled?: boolean;
};

export function DemoRiskHoldScene({
  recordMode = false,
  embedded = false,
  enabled = true,
}: DemoRiskHoldSceneProps) {
  const timeline = HVAC_GAS_HOLD_TIMELINE;
  const audioPrefix = getGasHoldAudioPrefix();

  const stepIdxForPhase = useCallback((phase: PhoneDemoPhase) => stepIdxForGasHold(phase), []);

  const {
    customerLines,
    aiLine,
    systemLine,
    ownerSms,
    speaking,
    typing,
    stepIdx,
    customerScrollRef,
  } = useDemoPhoneTimeline({
    timeline,
    audioPrefix,
    recordMode,
    enabled,
    stepIdxForPhase,
  });

  const grid = (
    <div className={`grid min-h-0 flex-1 grid-cols-2 gap-3 ${embedded ? "p-3 sm:gap-4 sm:p-4" : "gap-5 p-5 md:gap-6 md:p-8"}`}>
      <div className="flex min-h-0 flex-col items-center justify-center">
        {!embedded ? (
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Safety screening · receptionist voice only
          </p>
        ) : null}
        <div className={`w-full overflow-hidden rounded-2xl border-4 border-amber-900/60 bg-black shadow-2xl ring-2 ring-amber-500/30 ${embedded ? "" : "max-w-xs"}`}>
          <div className={`bg-gradient-to-b from-amber-950/90 to-black text-center ${embedded ? "px-3 py-4" : "px-4 py-6"}`}>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Safety call</p>
            <p className={`font-semibold ${embedded ? "mt-0.5 text-base" : "mt-1 text-lg"}`}>Effiroad</p>
            <p className="text-[11px] text-amber-400">9:18 PM · Gas smell</p>
            <div className="mt-2">
              <Waveform active={speaking} />
            </div>
          </div>
          <div className={`bg-[#141210] px-3 py-3 ${embedded ? "min-h-[88px]" : "min-h-[150px] px-4 py-4"}`}>
            {aiLine ? (
              <div className="rounded-lg bg-amber-950/40 p-2.5 ring-1 ring-amber-500/40">
                <p className="text-[9px] font-bold uppercase text-amber-300">Receptionist</p>
                <p className="mt-1 text-xs leading-relaxed text-[#f5f0e8] sm:text-sm">{aiLine}</p>
              </div>
            ) : (
              <p className="pt-4 text-center text-[11px] text-white/30">Connecting caller…</p>
            )}
          </div>
        </div>
      </div>

      <CustomerChatPanel customerLines={customerLines} typing={typing} customerScrollRef={customerScrollRef} />
    </div>
  );

  if (embedded) {
    return (
      <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#141008] to-[#1a1408] text-white">
        {grid}
        <div className="shrink-0 space-y-2 px-3 pb-3 sm:px-4">
          {ownerSms ? (
            <div className="rounded-lg border border-amber-500/50 bg-amber-950/70 p-2 ring-1 ring-amber-400/30">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Owner SMS · 1 dispatch · 2 hold</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-50">{ownerSms}</p>
            </div>
          ) : null}
          {systemLine ? <p className="text-center text-[11px] font-semibold text-amber-200/90">{systemLine}</p> : null}
        </div>
      </div>
    );
  }

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

      {grid}

      <div className="px-5 pb-5 md:px-8">
        {ownerSms ? (
          <div className="mt-1 rounded-xl border border-amber-500/50 bg-amber-950/70 p-3 ring-1 ring-amber-400/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Owner SMS · 1 dispatch · 2 hold</p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-50">{ownerSms}</p>
          </div>
        ) : null}
        {systemLine ? (
          <p className="mt-4 text-center text-xs font-semibold text-amber-200/90">{systemLine}</p>
        ) : null}
      </div>
    </div>
  );
}
