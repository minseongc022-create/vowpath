"use client";

import { useEffect, useRef, useState } from "react";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the element to spotlight, e.g. "#shop-name" or '[data-tour-step="kpi-cards"]' */
  target: string;
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
  const prevElRef = useRef<Element | null>(null);
  const stepBaselineDoneRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [storageKey]);

  useEffect(() => {
    if (!visible) return;

    if (prevElRef.current) {
      prevElRef.current.classList.remove("tour-highlight");
      prevElRef.current = null;
    }

    const current = steps[step];
    const el = document.querySelector(current.target);
    if (el) {
      el.classList.add("tour-highlight");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      prevElRef.current = el;
    }

    return () => {
      el?.classList.remove("tour-highlight");
    };
  }, [step, visible, steps]);

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
    const isDone = doneMap[currentId];
    if (isDone && stepBaselineDoneRef.current === false) {
      const t = setTimeout(() => {
        handleNext();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [doneMap, step, visible, steps]);

  useEffect(() => {
    return () => {
      if (prevElRef.current) {
        prevElRef.current.classList.remove("tour-highlight");
      }
    };
  }, []);

  function clearHighlight() {
    if (prevElRef.current) {
      prevElRef.current.classList.remove("tour-highlight");
      prevElRef.current = null;
    }
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      clearHighlight();
      setVisible(false);
    }
  }

  function handlePrev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleClose() {
    clearHighlight();
    setVisible(false);
  }

  function handleNever() {
    clearHighlight();
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <>
      {/* Dimming spotlight overlay — raised above any in-page z-40/z-50 popovers/toasts so
          nothing pokes through un-dimmed; the highlighted target sits above this via z-index */}
      <div className="fixed inset-0 z-50 bg-black/60 transition-opacity" aria-hidden />

      <div className="fixed bottom-0 left-0 right-0 z-[60] animate-tour-slide-up">
        <div className="flex justify-center gap-2 pb-3">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-cyan-400"
                  : i < step
                    ? "w-2 bg-cyan-200"
                    : "w-2 bg-white/30"
              }`}
              aria-label={`${i + 1}단계로 이동`}
            />
          ))}
        </div>

        <div className="mx-4 mb-0 rounded-t-2xl border border-b-0 border-cyan-400/30 bg-brand-950 px-6 py-6 shadow-[0_-12px_50px_-8px_rgba(0,0,0,0.55)] sm:mx-auto sm:max-w-2xl sm:px-8 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                기능 안내 &nbsp;{step + 1} / {steps.length}
              </p>
              <h3 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                {current.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-brand-100 sm:text-[17px]">
                {current.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-lg p-2 text-brand-200 transition hover:bg-white/10 hover:text-white"
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

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleNever}
              className="text-sm font-medium text-brand-300 transition hover:text-white"
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
    </>
  );
}
