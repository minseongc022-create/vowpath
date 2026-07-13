"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoStep } from "@/lib/demo-scripts";

const TYPING_MS = 750;

function Bubble({ step, typing }: { step: DemoStep; typing?: boolean }) {
  if (step.role === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/60">
          {typing ? "…" : step.text}
        </span>
      </div>
    );
  }

  if (step.role === "sms") {
    return (
      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
          SMS
        </span>
        <div className="max-w-[88%] rounded-xl rounded-tl-sm border border-emerald-500/30 bg-emerald-950/80 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-emerald-100">{typing ? "…" : step.text}</p>
        </div>
      </div>
    );
  }

  if (step.role === "caller") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-white/15 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-white">{typing ? "…" : step.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#9a7f5e] text-[9px] font-bold text-white">
        AI
      </span>
      <div className="max-w-[88%] rounded-xl rounded-tl-sm bg-[#9a7f5e]/20 px-3 py-2 ring-1 ring-[#9a7f5e]/40">
        <p className="text-[11px] leading-relaxed text-[#f5f0e8]">{typing ? "…" : step.text}</p>
      </div>
    </div>
  );
}

export function DemoScenePlayer({
  steps,
  statusTime,
  title,
  subtitle,
  autoPlay = true,
  loop = true,
  loopDelayMs = 2500,
  onComplete,
}: {
  steps: DemoStep[];
  statusTime: string;
  title: string;
  subtitle: string;
  autoPlay?: boolean;
  loop?: boolean;
  loopDelayMs?: number;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState<number[]>([]);
  const [typing, setTyping] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = useCallback(() => {
    for (const t of timeouts.current) clearTimeout(t);
    timeouts.current = [];
  }, []);

  const play = useCallback(() => {
    clearAll();
    setVisible([]);
    setTyping(null);

    let cursor = 800;
    steps.forEach((step, idx) => {
      cursor += step.delay;
      const showTypingAt = cursor;
      const showBubbleAt = cursor + TYPING_MS;

      timeouts.current.push(
        setTimeout(() => setTyping(idx), showTypingAt),
        setTimeout(() => {
          setTyping((prev) => (prev === idx ? null : prev));
          setVisible((prev) => [...prev, idx]);
          if (idx === steps.length - 1) {
            onComplete?.();
            if (loop) {
              timeouts.current.push(setTimeout(() => play(), loopDelayMs));
            }
          }
        }, showBubbleAt),
      );
      cursor = showBubbleAt;
    });
  }, [clearAll, loop, loopDelayMs, onComplete, steps]);

  useEffect(() => {
    if (autoPlay) play();
    return clearAll;
  }, [autoPlay, play, clearAll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible, typing]);

  return (
    <div className="flex h-full w-full flex-col bg-[#0c0b0a] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#b59b78]">Effiroad</p>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
        <img src="/logo-mark.png" alt="" className="h-10 w-10 opacity-90" />
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#141210] shadow-2xl">
          <div className="flex items-center justify-between bg-black/60 px-4 py-2 text-[10px] text-white/50">
            <span>{statusTime}</span>
            <span className="text-emerald-400">● Live</span>
            <span>Effiroad AI</span>
          </div>
          <div
            ref={scrollRef}
            className="flex h-[340px] flex-col gap-2.5 overflow-y-auto px-3 py-4"
          >
            {steps.map((step, idx) =>
              visible.includes(idx) ? <Bubble key={idx} step={step} /> : null,
            )}
            {typing !== null && !visible.includes(typing) && (
              <Bubble key={`t-${typing}`} step={steps[typing]} typing />
            )}
          </div>
          <div className="flex items-center justify-center gap-2 bg-black/50 py-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] text-white/40">On call · Recording</span>
          </div>
        </div>
      </div>
    </div>
  );
}
