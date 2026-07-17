"use client";

import { useMemo, useState } from "react";
import { settingsPage } from "@/lib/content";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";
import {
  googleVoiceOverflowRisk,
  isQuizComplete,
  quizNeedsThirdQuestion,
  resolveQuizProvider,
  type ForwardingQuizAnswers,
  type QuizCellCarrier,
  type QuizCustomerLine,
  type QuizSetupGoal,
  type QuizVoipSystem,
} from "@/lib/forwarding-quiz";

type Props = {
  initialProvider?: ForwardingProviderId;
  onResolved: (provider: ForwardingProviderId, answers: ForwardingQuizAnswers) => void;
  onManualPick?: () => void;
};

function QuizOption({
  selected,
  title,
  hint,
  onClick,
  badge,
}: {
  selected: boolean;
  title: string;
  hint: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] sm:px-4 sm:py-3 ${
        selected
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
          : "border-slate-200 bg-white hover:border-brand-300"
      }`}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-slate-900 sm:text-base">{title}</span>
        {badge ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            {badge}
          </span>
        ) : null}
      </span>
      <p className="mt-1 text-xs leading-snug text-stone-600 sm:text-sm">{hint}</p>
    </button>
  );
}

function quizProgressStep(
  step: 1 | 2 | 3,
  customerLine: QuizCustomerLine | null,
): { current: number; total: number } {
  if (step === 1) return { current: 1, total: 3 };
  if (step === 2) return { current: 2, total: 3 };
  if (customerLine === "google_voice") return { current: 2, total: 3 };
  return { current: 3, total: 3 };
}

export function ForwardingPathQuiz({ initialProvider, onResolved, onManualPick }: Props) {
  const [answers, setAnswers] = useState<ForwardingQuizAnswers>(() => ({
    customerLine: initialProvider === "effiroad_main" ? "unsure" : null,
    cellCarrier: null,
    voipSystem: null,
    setupGoal: initialProvider === "effiroad_main" ? "effiroad_main" : null,
  }));
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const q = settingsPage.forwardingQuiz;

  const resolved = useMemo(() => resolveQuizProvider(answers), [answers]);
  const complete = isQuizComplete(answers);
  const gvOverflowRisk = googleVoiceOverflowRisk(answers);
  const progress = quizProgressStep(step, answers.customerLine);

  function pickLine(line: QuizCustomerLine) {
    const next: ForwardingQuizAnswers = {
      customerLine: line,
      cellCarrier: null,
      voipSystem: null,
      setupGoal: line === "unsure" ? "effiroad_main" : null,
    };
    setAnswers(next);
    if (line === "unsure") {
      onResolved("effiroad_main", next);
      return;
    }
    if (line === "shop_cell" || line === "business_voip") {
      setStep(2);
      return;
    }
    setStep(3);
  }

  function pickCarrier(carrier: QuizCellCarrier) {
    setAnswers((a) => ({ ...a, cellCarrier: carrier }));
    setStep(3);
  }

  function pickVoip(voip: QuizVoipSystem) {
    setAnswers((a) => ({ ...a, voipSystem: voip }));
    setStep(3);
  }

  function pickGoal(goal: QuizSetupGoal) {
    const next = { ...answers, setupGoal: goal };
    setAnswers(next);
    const provider = resolveQuizProvider(next);
    if (provider) onResolved(provider, next);
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-brand-300 bg-gradient-to-br from-brand-50/90 to-white p-3 sm:space-y-4 sm:p-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{q.badge}</p>
          <p className="text-xs font-semibold text-brand-800">{q.progress(progress.current, progress.total)}</p>
        </div>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${
                n <= progress.current ? "bg-brand-500" : "bg-brand-200"
              }`}
              aria-hidden
            />
          ))}
        </div>
        <p className="mt-2 text-base font-bold text-brand-950 sm:text-lg">{q.title}</p>
        <p className="mt-1 text-sm leading-snug text-slate-600">{q.subtitle}</p>
      </div>

      {step === 1 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">{q.q1Label}</p>
          <QuizOption
            selected={answers.customerLine === "shop_cell"}
            title={q.q1ShopCell}
            hint={q.q1ShopCellHint}
            onClick={() => pickLine("shop_cell")}
          />
          <QuizOption
            selected={answers.customerLine === "business_voip"}
            title={q.q1BusinessVoip}
            hint={q.q1BusinessVoipHint}
            onClick={() => pickLine("business_voip")}
          />
          <QuizOption
            selected={answers.customerLine === "google_voice"}
            title={q.q1GoogleVoice}
            hint={q.q1GoogleVoiceHint}
            onClick={() => pickLine("google_voice")}
          />
          <QuizOption
            selected={answers.customerLine === "unsure"}
            title={q.q1Unsure}
            hint={q.q1UnsureHint}
            onClick={() => pickLine("unsure")}
            badge={settingsPage.forwardingRecommendedProvider}
          />
        </div>
      ) : null}

      {step === 2 && answers.customerLine === "shop_cell" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">{q.q2CarrierLabel}</p>
          {(
            [
              ["att", q.q2Att, q.q2AttHint],
              ["tmobile", q.q2Tmobile, q.q2TmobileHint],
              ["verizon", q.q2Verizon, q.q2VerizonHint],
              ["xfinity", q.q2Xfinity, q.q2XfinityHint],
            ] as const
          ).map(([id, label, hint]) => (
            <QuizOption
              key={id}
              selected={answers.cellCarrier === id}
              title={label}
              hint={hint}
              onClick={() => pickCarrier(id)}
            />
          ))}
          <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-brand-700 underline">
            {q.back}
          </button>
        </div>
      ) : null}

      {step === 2 && answers.customerLine === "business_voip" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">{q.q2VoipLabel}</p>
          {(
            [
              ["dialpad", q.q2Dialpad, q.q2DialpadHint],
              ["ringcentral", q.q2Ringcentral, q.q2RingcentralHint],
              ["grasshopper", q.q2Grasshopper, q.q2GrasshopperHint],
            ] as const
          ).map(([id, label, hint]) => (
            <QuizOption
              key={id}
              selected={answers.voipSystem === id}
              title={label}
              hint={hint}
              onClick={() => pickVoip(id)}
            />
          ))}
          <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-brand-700 underline">
            {q.back}
          </button>
        </div>
      ) : null}

      {step === 3 && quizNeedsThirdQuestion(answers.customerLine) ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">{q.q3Label}</p>
          {gvOverflowRisk ? (
            <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2.5 text-sm leading-snug text-amber-950">
              {q.gvOverflowWarning}
            </p>
          ) : null}
          <QuizOption
            selected={answers.setupGoal === "overflow"}
            title={q.q3Overflow}
            hint={q.q3OverflowHint}
            onClick={() => pickGoal("overflow")}
          />
          <QuizOption
            selected={answers.setupGoal === "effiroad_main"}
            title={q.q3Dedicated}
            hint={q.q3DedicatedHint}
            onClick={() => pickGoal("effiroad_main")}
            badge={settingsPage.forwardingRecommendedProvider}
          />
          <button
            type="button"
            onClick={() =>
              setStep(
                answers.customerLine === "shop_cell" || answers.customerLine === "business_voip" ? 2 : 1,
              )
            }
            className="text-sm font-semibold text-brand-700 underline"
          >
            {q.back}
          </button>
        </div>
      ) : null}

      {complete && resolved && answers.setupGoal ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-emerald-900">{q.pathReady}</p>
        </div>
      ) : null}

      {onManualPick && step === 1 ? (
        <button
          type="button"
          onClick={onManualPick}
          className="w-full text-center text-sm font-semibold text-brand-700 underline"
        >
          {q.manualPickLink}
        </button>
      ) : null}
    </div>
  );
}
