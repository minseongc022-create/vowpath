"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSettingsPage } from "@/components/providers/LocaleProvider";

export type GoLiveWizardStep = {
  id: string;
  label: string;
  stepLabel: string;
  title: string;
  description: string;
  quickTip?: string;
  icon?: string;
  optional?: boolean;
  done: boolean;
  canContinue: boolean;
  continueHint?: string;
  content: ReactNode;
};

type GoLiveWizardProps = {
  steps: GoLiveWizardStep[];
  initialStepId?: string;
  onStepChange?: (stepId: string) => void;
  onBeforeContinue?: (stepId: string) => Promise<boolean>;
};

export function GoLiveWizard({
  steps,
  initialStepId,
  onStepChange,
  onBeforeContinue,
}: GoLiveWizardProps) {
  const copy = useSettingsPage();
  const [index, setIndex] = useState(() => {
    if (!initialStepId) return 0;
    const i = steps.findIndex((s) => s.id === initialStepId);
    return i >= 0 ? i : 0;
  });
  const [continuing, setContinuing] = useState(false);

  const step = steps[index];
  const total = steps.length;

  useEffect(() => {
    if (!initialStepId) return;
    const i = steps.findIndex((s) => s.id === initialStepId);
    if (i >= 0) setIndex(i);
  }, [initialStepId, steps]);

  useEffect(() => {
    onStepChange?.(step.id);
    const el = document.getElementById(step.id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index, onStepChange, step.id]);

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(steps.length - 1, next)));
    },
    [steps.length],
  );

  async function handleContinue() {
    if (!step.canContinue || continuing) return;
    setContinuing(true);
    try {
      const ok = onBeforeContinue ? await onBeforeContinue(step.id) : true;
      if (ok && index < steps.length - 1) goTo(index + 1);
    } finally {
      setContinuing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-brand-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
            {copy.wizardStepOf.replace("{current}", String(index + 1)).replace("{total}", String(total))}
          </p>
          <p className="text-xs font-semibold text-stone-500">{step.label}</p>
        </div>
        <div className="mt-2 flex gap-1">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.label}
              aria-current={i === index ? "step" : undefined}
              onClick={() => goTo(i)}
              className={`h-1.5 flex-1 rounded-full transition ${
                i < index || s.done
                  ? "bg-emerald-500"
                  : i === index
                    ? "bg-brand-500"
                    : "bg-brand-100"
              }`}
            />
          ))}
        </div>
      </div>

      <section
        id={step.id}
        className="scroll-mt-24 rounded-xl border border-brand-200/80 bg-white shadow-sm sm:rounded-2xl"
      >
        <div className="border-b border-brand-100 bg-brand-50/40 px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex gap-2.5 sm:gap-4">
            {step.icon ? (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg ring-1 ring-brand-200/80 sm:h-12 sm:w-12"
                aria-hidden
              >
                {step.icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{step.stepLabel}</p>
              <h3 className="mt-0.5 text-base font-bold text-brand-950 sm:text-xl">{step.title}</h3>
              <p className="mt-1 text-sm leading-snug text-stone-600">{step.description}</p>
            </div>
          </div>
          {step.quickTip ? (
            <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-2 text-sm leading-snug text-sky-950">
              {step.quickTip}
            </p>
          ) : null}
        </div>

        <div className="vow-settings-wizard-body px-3 py-3 sm:px-5 sm:py-4">{step.content}</div>

        <div className="flex flex-col gap-2 border-t border-brand-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="min-h-10 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-40 sm:min-h-11"
          >
            {copy.wizardBack}
          </button>

          <div className="min-w-0 flex-1 text-center sm:px-3">
            {!step.canContinue && step.continueHint ? (
              <p className="text-xs font-medium text-amber-800 sm:text-sm">{step.continueHint}</p>
            ) : step.done ? (
              <p className="text-xs font-medium text-emerald-700 sm:text-sm">{copy.wizardStepComplete}</p>
            ) : null}
          </div>

          {index < steps.length - 1 ? (
            <button
              type="button"
              disabled={!step.canContinue || continuing}
              onClick={() => void handleContinue()}
              className="min-h-10 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11"
            >
              {continuing ? copy.saveAllSaving : copy.wizardContinue}
            </button>
          ) : (
            <p className="text-center text-xs text-stone-500 sm:text-right sm:text-sm">{copy.saveAllHint}</p>
          )}
        </div>
      </section>
    </div>
  );
}
