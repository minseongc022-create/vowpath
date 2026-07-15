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
};

function optionClass(selected: boolean): string {
  return `w-full rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${
    selected
      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
      : "border-slate-200 bg-white hover:border-slate-300"
  }`;
}

export function ForwardingPathQuiz({ initialProvider, onResolved }: Props) {
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
    <div className="space-y-4 rounded-xl border-2 border-brand-200 bg-gradient-to-br from-brand-50/80 to-white p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{q.badge}</p>
        <p className="mt-1 text-lg font-bold text-brand-950">{q.title}</p>
        <p className="mt-1 text-sm text-slate-600">{q.subtitle}</p>
      </div>

      {step === 1 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">{q.q1Label}</p>
          {(
            [
              ["shop_cell", q.q1ShopCell],
              ["business_voip", q.q1BusinessVoip],
              ["google_voice", q.q1GoogleVoice],
              ["unsure", q.q1Unsure],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => pickLine(id)}
              className={optionClass(answers.customerLine === id)}
            >
              <span className="text-base font-semibold text-slate-900">{label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 && answers.customerLine === "shop_cell" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">{q.q2CarrierLabel}</p>
          {(
            [
              ["att", q.q2Att],
              ["tmobile", q.q2Tmobile],
              ["verizon", q.q2Verizon],
              ["xfinity", q.q2Xfinity],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => pickCarrier(id)}
              className={optionClass(answers.cellCarrier === id)}
            >
              <span className="text-base font-semibold text-slate-900">{label}</span>
            </button>
          ))}
          <button type="button" onClick={() => setStep(1)} className="text-sm text-brand-700 underline">
            {q.back}
          </button>
        </div>
      ) : null}

      {step === 2 && answers.customerLine === "business_voip" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">{q.q2VoipLabel}</p>
          {(
            [
              ["dialpad", q.q2Dialpad],
              ["ringcentral", q.q2Ringcentral],
              ["grasshopper", q.q2Grasshopper],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => pickVoip(id)}
              className={optionClass(answers.voipSystem === id)}
            >
              <span className="text-base font-semibold text-slate-900">{label}</span>
            </button>
          ))}
          <button type="button" onClick={() => setStep(1)} className="text-sm text-brand-700 underline">
            {q.back}
          </button>
        </div>
      ) : null}

      {step === 3 && quizNeedsThirdQuestion(answers.customerLine) ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">{q.q3Label}</p>
          {gvOverflowRisk ? (
            <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
              {q.gvOverflowWarning}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => pickGoal("overflow")}
            className={optionClass(answers.setupGoal === "overflow")}
          >
            <span className="text-base font-semibold text-slate-900">{q.q3Overflow}</span>
            <p className="mt-1 text-sm text-stone-600">{q.q3OverflowHint}</p>
          </button>
          <button
            type="button"
            onClick={() => pickGoal("effiroad_main")}
            className={optionClass(answers.setupGoal === "effiroad_main")}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-slate-900">{q.q3Dedicated}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-800">
                {settingsPage.forwardingRecommendedProvider}
              </span>
            </span>
            <p className="mt-1 text-sm text-stone-600">{q.q3DedicatedHint}</p>
          </button>
          <button
            type="button"
            onClick={() =>
              setStep(
                answers.customerLine === "shop_cell" || answers.customerLine === "business_voip" ? 2 : 1,
              )
            }
            className="text-sm text-brand-700 underline"
          >
            {q.back}
          </button>
        </div>
      ) : null}

      {complete && resolved && answers.setupGoal ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-900">{q.pathReady}</p>
        </div>
      ) : null}
    </div>
  );
}
