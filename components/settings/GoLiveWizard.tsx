"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  const prevIndexRef = useRef(index);
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  const step = steps[index];
  const total = steps.length;

  useEffect(() => {
    if (!initialStepId) return;
    const i = steps.findIndex((s) => s.id === initialStepId);
    if (i >= 0) setIndex(i);
  }, [initialStepId]);

  useEffect(() => {
    onStepChangeRef.current?.(step.id);
  }, [step.id]);

  useEffect(() => {
    if (prevIndexRef.current === index) return;
    prevIndexRef.current = index;
    window.requestAnimationFrame(() => {
      document.getElementById("go-live-wizard-top")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [index]);

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
    <div id="go-live-wizard-top" className="scroll-mt-20 space-y-3">
      <nav
        aria-label="Setup steps"
        className="vow-settings-step-nav grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {steps.map((s, i) => {
          const active = i === index;
          const complete = s.done || i < index;
          return (
            <button
              key={s.id}
              type="button"
              aria-current={active ? "step" : undefined}
              onClick={() => goTo(i)}
              className={`vow-settings-step-tab rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                  : complete
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-stone-200 bg-white"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                {s.stepLabel}
              </p>
              <p
                className={`mt-0.5 text-sm font-bold leading-tight ${
                  active ? "text-brand-950" : complete ? "text-emerald-900" : "text-stone-800"
                }`}
              >
                {complete && !active ? "✓ " : null}
                {s.label}
                {s.optional ? (
                  <span className="ml-1 text-xs font-medium text-stone-500">({copy.tabOptional})</span>
                ) : null}
              </p>
            </button>
          );
        })}
      </nav>

      <section
        id={step.id}
        className="vow-settings-step-panel scroll-mt-24 rounded-2xl border-2 border-brand-200 bg-white shadow-sm"
      >
        <header className="border-b border-brand-100 bg-brand-50/50 px-4 py-4">
          <div className="flex gap-3">
            {step.icon ? (
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl ring-1 ring-brand-200"
                aria-hidden
              >
                {step.icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                {copy.wizardStepOf
                  .replace("{current}", String(index + 1))
                  .replace("{total}", String(total))}
                {" · "}
                {step.label}
              </p>
              <h3 className="mt-1 text-lg font-bold text-brand-950 sm:text-xl">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{step.description}</p>
            </div>
          </div>
          {step.quickTip ? (
            <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm leading-snug text-sky-950">
              {step.quickTip}
            </p>
          ) : null}
        </header>

        <div className="vow-settings-wizard-body px-4 py-4">{step.content}</div>

        <footer className="flex flex-col gap-3 border-t border-brand-100 bg-stone-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-40"
          >
            {copy.wizardBack}
          </button>

          <div className="min-w-0 flex-1 text-center sm:px-2">
            {!step.canContinue && step.continueHint ? (
              <p className="text-sm font-medium text-amber-800">{step.continueHint}</p>
            ) : step.done ? (
              <p className="text-sm font-medium text-emerald-700">{copy.wizardStepComplete}</p>
            ) : null}
          </div>

          {index < steps.length - 1 ? (
            <button
              type="button"
              disabled={!step.canContinue || continuing}
              onClick={() => void handleContinue()}
              className="min-h-11 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {continuing ? copy.saveAllSaving : copy.wizardContinue}
            </button>
          ) : (
            <p className="text-center text-sm text-stone-500 sm:text-right">{copy.saveAllHint}</p>
          )}
        </footer>
      </section>
    </div>
  );
}
