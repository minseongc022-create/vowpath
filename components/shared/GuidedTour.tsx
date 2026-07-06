"use client";

import { useEffect, useRef, useState } from "react";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the element to spotlight, e.g. "#shop-name" or '[data-tour-step="kpi-cards"]' */
  target: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

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
  const [rect, setRect] = useState<Rect | null>(null);
  const stepBaselineDoneRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [storageKey]);

  // Recompute the spotlight rect for the current step, and keep it pinned to the target
  // through scroll/resize/animation instead of relying on any CSS z-index/stacking trick.
  useEffect(() => {
    if (!visible) return;

    const current = steps[step];
    const el = document.querySelector(current.target);
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    const raf1 = requestAnimationFrame(measure);
    const t = setTimeout(measure, 350); // after scrollIntoView's smooth-scroll settles

    // Dashboard content (KPI cards, counts) often loads in asynchronously after
    // the initial render and can shift the target's position without firing a
    // scroll/resize event — keep polling while this step is open so the
    // spotlight doesn't go stale.
    const poll = setInterval(measure, 500);

    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t);
      clearInterval(poll);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
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

  function handleNext() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      setVisible(false);
    }
  }

  function handlePrev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleClose() {
    setVisible(false);
  }

  function handleNever() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const holeX = rect ? rect.left - PAD : 0;
  const holeY = rect ? rect.top - PAD : 0;
  const holeW = rect ? rect.width + PAD * 2 : 0;
  const holeH = rect ? rect.height + PAD * 2 : 0;

  return (
    <>
      {/* Single-piece dimming overlay with a precise rectangular cutout carved via an SVG
          mask — guarantees full coverage everywhere except exactly the spotlighted target,
          with no dependency on the target's own z-index/stacking context. */}
      {/* inset-0 alone pins all four edges to the visual viewport exactly — adding an
          explicit w-screen/h-full class on top of it can conflict with the scrollbar
          gutter (100vw/100% don't always equal the true visual viewport) and shift
          the whole overlay relative to real element positions from getBoundingClientRect(). */}
      <svg
        className="pointer-events-none fixed inset-0 z-50"
        aria-hidden
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect ? (
              <rect
                x={holeX}
                y={holeY}
                width={holeW}
                height={holeH}
                rx={12}
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-spotlight-mask)"
        />
        {rect ? (
          <rect
            x={holeX}
            y={holeY}
            width={holeW}
            height={holeH}
            rx={12}
            fill="none"
            stroke="rgba(6,182,212,0.95)"
            strokeWidth={4}
          >
            <animate
              attributeName="stroke-opacity"
              values="1;0.55;1"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </rect>
        ) : null}
      </svg>

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

        <div className="guided-tour-tooltip mx-4 mb-0 rounded-t-2xl border border-b-0 border-cyan-400/30 bg-brand-950 px-6 py-6 shadow-[0_-12px_50px_-8px_rgba(0,0,0,0.55)] sm:mx-auto sm:max-w-2xl sm:px-8 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                기능 안내 &nbsp;{step + 1} / {steps.length}
              </p>
              <h3 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                {current.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-white/90 sm:text-[17px]">
                {current.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
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
    </>
  );
}
