"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the element to spotlight, e.g. "#shop-name" or '[data-tour-step="kpi-cards"]' */
  target: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
// Warm gold — on-brand (site palette is warm brown/tan) and highly visible
// against the dark dimming overlay.
const RING = "rgba(224, 168, 88, 0.98)";
const RING_GLOW = "rgba(224, 168, 88, 0.45)";

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
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const stepBaselineDoneRef = useRef<boolean | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [storageKey]);

  // Skip steps whose target is missing (e.g. sidebar AI hidden on mobile).
  useEffect(() => {
    if (!visible) return;
    const current = steps[step];
    if (!current) return;
    const el = document.querySelector(current.target);
    if (el) return;
    const t = window.setTimeout(() => {
      if (step < steps.length - 1) setStep((s) => s + 1);
      else setVisible(false);
    }, 120);
    return () => window.clearTimeout(t);
  }, [step, visible, steps]);

  // Measure the current target and keep the spotlight pinned to it through scroll,
  // resize, and async dashboard layout shifts (poll) — the box-shadow dim + ring
  // are drawn from this rect, so a fresh rect means no gap and a snug ring.
  useEffect(() => {
    if (!visible) return;
    const current = steps[step];
    const el = current ? document.querySelector(current.target) : null;
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({
      behavior: "smooth",
      block: typeof window !== "undefined" && window.innerWidth < 640 ? "nearest" : "center",
    });

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const settle = setTimeout(measure, 350);
    const poll = setInterval(measure, 500);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      clearInterval(poll);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step, visible, steps]);

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

  if (!visible || !mounted) return null;

  const current = steps[step];
  if (!current) return null;
  const isLast = step === steps.length - 1;

  // A brand-new account has many empty sections (0 requests, no revenue, etc.)
  // that render as a near-zero-height strip. Spotlighting that looks broken, so
  // treat too-small/absent targets as "no highlight" and just show the teaching
  // card over a flat dim instead.
  const hasSpot = !!rect && rect.height >= 24 && rect.width >= 24;

  const holeX = rect ? rect.left - PAD : 0;
  const holeY = rect ? rect.top - PAD : 0;
  const holeW = rect ? rect.width + PAD * 2 : 0;
  const holeH = rect ? rect.height + PAD * 2 : 0;

  // Render into <body> so the fixed overlay is positioned against the visual
  // viewport, not against any transformed/scrolled dashboard ancestor (which
  // would remap position:fixed and misalign the spotlight from the measured
  // getBoundingClientRect coords).
  return createPortal(
    <>
      {hasSpot ? (
        <>
          {/* Dim the ENTIRE viewport via a shadow that spreads 9999px in all
              directions from the hole — no gaps possible, ever. */}
          <div
            className="pointer-events-none fixed z-[90] rounded-xl"
            style={{
              top: holeY,
              left: holeX,
              width: holeW,
              height: holeH,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            }}
          />
          {/* Glowing brand-gold ring on the exact same rect — cannot drift off. */}
          <div
            className="pointer-events-none fixed z-[91] animate-pulse rounded-xl"
            style={{
              top: holeY,
              left: holeX,
              width: holeW,
              height: holeH,
              outline: `3px solid ${RING}`,
              boxShadow: `0 0 12px 1px ${RING_GLOW}`,
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[90] bg-black/60" />
      )}

      {/* Bottom-anchored guide card */}
      <div className="fixed bottom-0 left-0 right-0 z-[95] animate-tour-slide-up">
        <div className="flex justify-center gap-2 pb-3">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-amber-400" : i < step ? "w-2 bg-amber-200" : "w-2 bg-white/30"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="guided-tour-tooltip mx-4 mb-0 rounded-t-2xl border border-b-0 border-amber-400/30 bg-brand-950 px-6 py-6 shadow-[0_-12px_50px_-8px_rgba(0,0,0,0.55)] sm:mx-auto sm:max-w-2xl sm:px-8 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Quick tour &nbsp;{step + 1} / {steps.length}
              </p>
              <h3 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{current.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-white/90 sm:text-[17px]">
                {current.description}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
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
              Don't show again
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-bold text-brand-950 shadow-sm transition hover:bg-amber-300"
              >
                {isLast ? "Done ✓" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
