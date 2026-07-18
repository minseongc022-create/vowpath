"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { hapticTap } from "@/lib/haptic";
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
      hapticTap(8);
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
    <div
      id="go-live-wizard-top"
      data-settings-wizard="v6"
      className="scroll-mt-20 space-y-3"
    >
      <div className="rounded-2xl border-2 border-brand-300 bg-brand-50/80 p-3 shadow-sm sm:p-4">
        <p className="text-center text-sm font-bold text-brand-900 sm:text-base">
          {copy.wizardStepOf
            .replace("{current}", String(index + 1))
            .replace("{total}", String(total))}
        </p>
        <nav aria-label="Setup steps" className="mt-3 space-y-2">
          {steps.map((s, i) => {
            const active = i === index;
            const complete = s.done || i < index;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => goTo(i)}
                className={`vow-settings-step-tab flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition active:scale-[0.99] ${
                  active
                    ? "border-brand-600 bg-white shadow-md ring-2 ring-brand-200"
                    : complete
                      ? "border-emerald-300 bg-emerald-50/90"
                      : "border-stone-200 bg-white/90"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    active
                      ? "bg-brand-600 text-white"
                      : complete
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {complete && !active ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    {s.stepLabel}
                  </span>
                  <span
                    className={`mt-0.5 block text-base font-bold leading-tight ${
                      active ? "text-brand-950" : complete ? "text-emerald-900" : "text-stone-800"
                    }`}
                  >
                    {s.label}
                    {s.optional ? (
                      <span className="ml-1 text-xs font-medium text-stone-500">
                        ({copy.tabOptional})
                      </span>
                    ) : null}
                  </span>
                </span>
                {active ? (
                  <span className="shrink-0 text-xs font-bold uppercase text-brand-600">Now</span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <section
        id={step.id}
        className="vow-settings-step-panel scroll-mt-24 overflow-visible rounded-2xl border-2 border-brand-400 bg-white shadow-md"
      >
        <header className="border-b-2 border-brand-100 bg-gradient-to-b from-brand-50 to-white px-4 py-4">
          <div className="flex gap-3">
            {step.icon ? (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl ring-2 ring-brand-200"
                aria-hidden
              >
                {step.icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                {step.label}
                {step.optional ? ` · ${copy.tabOptional}` : ""}
              </p>
              <h3 className="mt-1 text-xl font-bold text-brand-950">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.description}</p>
            </div>
          </div>
          {step.quickTip ? (
            <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm leading-snug text-sky-950">
              {step.quickTip}
            </p>
          ) : null}
        </header>

        <div className="vow-settings-wizard-body px-4 py-4">{step.content}</div>

        <footer className="flex flex-col gap-3 border-t-2 border-brand-100 bg-stone-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="min-h-12 rounded-xl border-2 border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-40"
          >
            {copy.wizardBack}
          </button>

          <div className="min-w-0 flex-1 text-center sm:px-2">
            {!step.canContinue && step.continueHint ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                {step.continueHint}
              </p>
            ) : step.done ? (
              <p className="text-sm font-medium text-emerald-700">{copy.wizardStepComplete}</p>
            ) : null}
          </div>

          {index < steps.length - 1 ? (
            <button
              type="button"
              disabled={!step.canContinue || continuing}
              onClick={() => void handleContinue()}
              className="min-h-12 rounded-xl bg-brand-600 px-5 py-2.5 text-base font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {continuing ? copy.saveAllSaving : copy.wizardContinue}
            </button>
          ) : (
            <p className="text-center text-sm text-stone-500 sm:text-right">{copy.wizardLastStepHint}</p>
          )}
        </footer>
      </section>
    </div>
  );
}
