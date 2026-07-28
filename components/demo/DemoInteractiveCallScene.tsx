"use client";

import { useMemo } from "react";
import type { DemoVertical } from "@/lib/demo-vertical-config";
import {
  getGasHoldInteractiveSteps,
  getInteractiveDemoSteps,
  type DemoTransition,
  type InteractiveStep,
} from "@/lib/demo-interactive-script";
import {
  getGasHoldAudioPrefix,
  getVoiceAudioPrefix,
} from "@/lib/demo-phone-script";
import { useDemoInteractiveTimeline } from "@/lib/hooks/use-demo-interactive-timeline";
import { unlockDemoAudio } from "@/lib/demo-audio-unlock";

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-end justify-center gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-emerald-400 transition-all ${active ? "animate-pulse" : "opacity-25"}`}
          style={{ height: active ? `${12 + (i % 3) * 10}px` : "8px", animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

type DemoInteractiveCallSceneProps = {
  embedded?: boolean;
  enabled?: boolean;
  vertical?: DemoVertical;
  variant?: "default" | "gas-hold";
};

function ActionPanel({
  step,
  onMenuChoice,
  onCustomerAction,
  onOwnerAction,
}: {
  step: InteractiveStep | null;
  onMenuChoice: (opt: {
    customerText?: string;
    jumpTo?: number;
    transition?: DemoTransition;
  }) => void;
  onCustomerAction: (text: string, transition?: DemoTransition) => void;
  onOwnerAction: (text: string, transition?: DemoTransition) => void;
}) {
  if (!step) return null;

  const tapHint = (
    <span className="mb-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200 sm:text-[11px]">
      <span className="inline-block animate-bounce" aria-hidden>
        👇
      </span>
      Tap to continue
      <span className="inline-block animate-bounce" aria-hidden>
        👇
      </span>
    </span>
  );

  if (step.kind === "menu") {
    return (
      <div className="mt-2 min-w-0 space-y-2 sm:mt-3 sm:space-y-2.5">
        {tapHint}
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-sky-200 sm:text-[11px] sm:tracking-wider">
          {step.prompt}
        </p>
        {step.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              unlockDemoAudio();
              onMenuChoice(opt);
            }}
            className="demo-tap-cta block w-full min-w-0 rounded-xl border-2 border-sky-200/80 bg-gradient-to-r from-sky-400 to-sky-500 px-3 py-3.5 text-left text-xs font-bold leading-snug text-white ring-4 ring-sky-300/50 transition hover:from-sky-300 hover:to-sky-400 active:scale-[0.98] sm:rounded-2xl sm:px-4 sm:py-4 sm:text-sm"
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (step.kind === "customer-action") {
    const isPortal = step.customerText.includes("\n");
    return (
      <div className="mt-2 min-w-0 sm:mt-3">
        {tapHint}
        <button
          type="button"
          onClick={() => {
            unlockDemoAudio();
            onCustomerAction(step.customerText, step.transition ?? "soft");
          }}
          className="demo-tap-cta block w-full min-w-0 rounded-xl border-2 border-sky-100/90 bg-gradient-to-r from-sky-400 to-cyan-400 px-3 py-3.5 text-left text-xs font-bold leading-snug text-white ring-4 ring-sky-200/60 transition hover:from-sky-300 hover:to-cyan-300 active:scale-[0.98] sm:rounded-2xl sm:px-4 sm:py-4 sm:text-sm"
        >
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-sky-950/80">
            {isPortal ? "On the booking link" : "Caller says"}
          </span>
          <span className="mt-1 block">{step.label}</span>
        </button>
      </div>
    );
  }

  if (step.kind === "owner-action") {
    const isTech = step.role === "tech";
    return (
      <div className="mt-2 min-w-0 sm:mt-3">
        {tapHint}
        <button
          type="button"
          onClick={() => {
            unlockDemoAudio();
            onOwnerAction(step.systemText, step.transition ?? "sms");
          }}
          className={`demo-tap-cta block w-full min-w-0 rounded-xl border-2 px-3 py-3.5 text-left text-xs font-bold leading-snug ring-4 transition active:scale-[0.98] sm:rounded-2xl sm:px-4 sm:py-4 sm:text-sm ${
            isTech
              ? "demo-tap-cta-tech border-amber-100/90 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 ring-amber-200/60 hover:from-amber-300 hover:to-orange-300"
              : "demo-tap-cta-owner border-emerald-100/90 bg-gradient-to-r from-emerald-400 to-teal-400 text-emerald-950 ring-emerald-200/60 hover:from-emerald-300 hover:to-teal-300"
          }`}
        >
          <span className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80">
            {isTech ? "Crew texts back" : "Shop owner replies"}
          </span>
          <span className="mt-1 block text-white drop-shadow-sm">{step.label}</span>
        </button>
      </div>
    );
  }

  return null;
}

export function DemoInteractiveCallScene({
  embedded = false,
  enabled = true,
  vertical = "restoration",
  variant = "default",
}: DemoInteractiveCallSceneProps) {
  const steps = useMemo(
    () => (variant === "gas-hold" ? getGasHoldInteractiveSteps() : getInteractiveDemoSteps(vertical)),
    [vertical, variant],
  );
  const audioPrefix =
    variant === "gas-hold" ? getGasHoldAudioPrefix() : getVoiceAudioPrefix(vertical);

  const {
    customerLines,
    aiLine,
    systemLine,
    ownerSms,
    crewSms,
    fyiSms,
    customerSms,
    customerSmsSending,
    smsSendingLabel,
    speaking,
    transferring,
    transitionKind,
    transitionLabel,
    waitingForClick,
    done,
    currentStep,
    customerScrollRef,
    advanceWithCustomer,
    handleMenuChoice,
    handleOwnerAction,
    unlockAudio,
    audioUnlocked,
    reset,
  } = useDemoInteractiveTimeline({ steps, audioPrefix, enabled });

  const showSoundPrompt = enabled && !audioUnlocked;
  const statusTone =
    transitionKind === "retell-connect"
      ? "animate-pulse text-amber-300"
      : transitionKind === "sms"
        ? "animate-pulse text-violet-300"
        : transferring
          ? "animate-pulse text-sky-300"
          : "text-emerald-400";

  const isPortalLine = (line: string) =>
    /Today \d/.test(line) || line.includes(" TX") || line.includes("Round Rock");

  const grid = (
    <div className="relative min-h-0 flex-1">
      {showSoundPrompt ? (
        <button
          type="button"
          onClick={unlockAudio}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/70 px-4 text-center backdrop-blur-sm transition hover:bg-black/75"
        >
          <span className="text-2xl" aria-hidden>
            🔊
          </span>
          <span className="text-sm font-semibold text-white">Tap to enable sound</span>
          <span className="max-w-xs text-xs text-white/60">Browser requires a tap before AI voice can play</span>
        </button>
      ) : null}
      <div
        className={`grid h-full min-h-0 gap-3 ${
          embedded
            ? "grid-cols-1 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4"
            : "grid-cols-1 gap-5 p-5 md:grid-cols-2 md:gap-6 md:p-8"
        }`}
      >
      <div className="flex min-h-0 flex-col items-center justify-center">
        <div className={`w-full overflow-hidden rounded-2xl border-4 border-slate-700 bg-black shadow-2xl ${embedded ? "max-w-none" : "max-w-xs"}`}>
          <div className={`bg-gradient-to-b from-brand-900/90 to-black text-center ${embedded ? "px-3 py-4" : "px-4 py-6"}`}>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Active call</p>
            <p className={`font-semibold ${embedded ? "mt-0.5 text-base" : "mt-1 text-lg"}`}>Effiroad</p>
            <p className={`text-[11px] ${statusTone}`}>
              {transferring
                ? transitionLabel ?? "Working…"
                : "Interactive · Matches live product"}
            </p>
            <div className="mt-2">
              <Waveform active={speaking || transferring} />
            </div>
          </div>
          <div className={`bg-[#141210] px-3 py-3 ${embedded ? "min-h-[88px]" : "min-h-[150px] px-4 py-4"}`}>
            {customerSmsSending ? (
              <div className="animate-pulse rounded-lg bg-violet-500/15 p-2.5 ring-1 ring-violet-400/40">
                <p className="text-[9px] font-bold uppercase text-violet-200/90">SMS</p>
                <p className="mt-1 text-xs leading-relaxed text-violet-50/90 sm:text-sm">
                  {smsSendingLabel ?? "Sending secure link by text…"}
                </p>
              </div>
            ) : transferring && transitionKind === "retell-connect" ? (
              <div className="rounded-lg bg-amber-500/15 p-2.5 ring-1 ring-amber-400/40">
                <p className="text-[9px] font-bold uppercase text-amber-200/90">Connect</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-50/90 sm:text-sm">
                  Ringing into the AI receptionist…
                </p>
              </div>
            ) : transferring && transitionKind === "sms" ? (
              <div className="rounded-lg bg-violet-500/15 p-2.5 ring-1 ring-violet-400/40">
                <p className="text-[9px] font-bold uppercase text-violet-200/90">SMS</p>
                <p className="mt-1 text-xs leading-relaxed text-violet-50/90 sm:text-sm">
                  Secure text on the way…
                </p>
              </div>
            ) : transferring ? (
              <div className="rounded-lg bg-sky-500/15 p-2.5 ring-1 ring-sky-400/40">
                <p className="text-[9px] font-bold uppercase text-sky-200/90">Listening</p>
                <p className="mt-1 text-xs leading-relaxed text-sky-50/90 sm:text-sm">
                  AI heard you — responding…
                </p>
              </div>
            ) : aiLine ? (
              <div className="rounded-lg bg-[#9a7f5e]/25 p-2.5 ring-1 ring-[#9a7f5e]/50">
                <p className="text-[9px] font-bold uppercase text-[#b59b78]">Receptionist</p>
                <p className="mt-1 text-xs leading-relaxed text-[#f5f0e8] sm:text-sm">{aiLine}</p>
              </div>
            ) : (
              <p className="pt-4 text-center text-[11px] text-white/30">Connecting caller…</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-sky-300 sm:mb-2 sm:text-[10px] sm:tracking-[0.18em]">
          Customer chat — tap to send
        </p>
        <div
          ref={customerScrollRef}
          className="min-h-[72px] min-w-0 flex-1 space-y-2 overflow-y-auto rounded-lg border-2 border-sky-400/45 bg-sky-950/35 p-2 ring-2 ring-sky-400/20 sm:min-h-0 sm:space-y-2.5 sm:rounded-xl sm:p-3"
        >
          {customerLines.length === 0 ? (
            <p className="text-xs text-sky-100/50">Tap buttons below to play the caller&apos;s side</p>
          ) : (
            customerLines.map((line, i) => (
              <div
                key={`${line}-${i}`}
                className={`ml-auto max-w-[98%] rounded-2xl rounded-tr-sm px-3 py-2.5 text-xs leading-relaxed text-white sm:text-sm ${
                  isPortalLine(line)
                    ? "demo-portal-bubble border-2 font-semibold"
                    : "bg-sky-500/30 ring-1 ring-sky-300/40"
                }`}
              >
                {isPortalLine(line) ? (
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-emerald-100/90">
                    {/Today \d/.test(line) ? "Visit time" : "Address on link"}
                  </span>
                ) : null}
                {line}
              </div>
            ))
          )}
        </div>
        {waitingForClick && !transferring ? (
          <div className="min-w-0 shrink-0">
            <ActionPanel
              step={currentStep}
              onMenuChoice={handleMenuChoice}
              onCustomerAction={advanceWithCustomer}
              onOwnerAction={handleOwnerAction}
            />
          </div>
        ) : null}
        {transferring && transitionLabel ? (
          <p className="mt-2 animate-pulse text-center text-[11px] font-medium text-white/70">
            {transitionLabel}
          </p>
        ) : null}
        {done ? (
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-full bg-[#9a7f5e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b59b78]"
          >
            Restart demo
          </button>
        ) : null}
      </div>
    </div>
    </div>
  );

  const smsFooter = (
    <div className="shrink-0 space-y-2 px-3 pb-3 sm:px-4">
      {ownerSms ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Owner SMS</p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-100">{ownerSms}</p>
        </div>
      ) : null}
      {fyiSms ? (
        <div className="rounded-lg border border-sky-500/35 bg-sky-950/50 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-sky-300">Owner FYI</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sky-100">{fyiSms}</p>
        </div>
      ) : null}
      {customerSmsSending ? (
        <div className="animate-pulse rounded-lg border border-violet-500/50 bg-violet-950/40 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-violet-300">Customer SMS</p>
          <p className="mt-1 text-[11px] font-medium text-violet-100">
            {smsSendingLabel ?? "Sending secure link by text…"}
          </p>
        </div>
      ) : null}
      {customerSms ? (
        <div className="rounded-lg border border-violet-500/40 bg-violet-950/50 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-violet-300">Customer SMS</p>
          <p className="mt-1 text-[11px] leading-relaxed text-violet-100">{customerSms}</p>
        </div>
      ) : null}
      {crewSms ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/50 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Crew SMS</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100">{crewSms}</p>
        </div>
      ) : null}
      {systemLine ? <p className="text-center text-[11px] font-semibold text-[#b59b78]">{systemLine}</p> : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#12100e] to-[#1a1612] text-white">
        {grid}
        {smsFooter}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#0c0b0a] via-[#12100e] to-[#1a1612] text-white">
      <div className="border-b border-white/10 px-6 py-4 md:px-8 md:py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">Interactive demo</p>
        <h1 className="text-lg font-bold md:text-2xl">
          Tap through the live flow — menu → pick-time → crew → map
        </h1>
      </div>
      {grid}
      <div className="px-5 pb-5 md:px-8">{smsFooter}</div>
    </div>
  );
}
