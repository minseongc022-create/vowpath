"use client";

import { useEffect, useRef, useState } from "react";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /** Kept for backwards-compat with existing step definitions; no longer used
   *  for positioning — the tour renders as a centered card, not an anchored
   *  spotlight, so there is nothing to align against and nothing to misfire. */
  target?: string;
};

export function GuidedTour({
  steps,
  storageKey,
  doneMap,
}: {
  steps: TourStep[];
  storageKey: string;
  /** Maps a TourStep.id to whether the user has completed that step's action. When the
   *  current step's entry flips to true, the tour auto-advances after a short delay. */
  doneMap?: Record<string, boolean>;
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const stepBaselineDoneRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [storageKey]);

  // Capture the done-state baseline for the step we just entered, so we only
  // auto-advance when it *transitions* to done — not if it was already done.
  useEffect(() => {
    stepBaselineDoneRef.current = doneMap?.[steps[step]?.id];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, visible]);

  useEffect(() => {
    if (!visible || !doneMap) return;
    const currentId = steps[step]?.id;
    if (!currentId) return;
    if (doneMap[currentId] && stepBaselineDoneRef.current === false) {
      const t = setTimeout(() => handleNext(), 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneMap, step, visible, steps]);

  function handleNext() {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else setVisible(false);
  }

  function handlePrev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleClose() {
    setVisible(false);
  }

  function handleNever() {
    if (typeof window !== "undefined") localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = steps[step];
  if (!current) return null;
  const isLast = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="guided-tour-tooltip w-full max-w-md rounded-2xl border border-cyan-400/30 bg-brand-950 p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            기능 안내 &nbsp;{step + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="닫기"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">{current.title}</h3>
        <p className="mt-2 text-base leading-relaxed text-white/90">{current.description}</p>

        <div className="mt-6 flex justify-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-cyan-400" : i < step ? "w-2 bg-cyan-200" : "w-2 bg-white/30"
              }`}
              aria-label={`${i + 1}단계로 이동`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleNever}
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            다시 보지 않기
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                ← 이전
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-cyan-400 px-5 py-2 text-sm font-bold text-brand-950 shadow-sm transition hover:bg-cyan-300"
            >
              {isLast ? "완료 ✓" : "다음 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
