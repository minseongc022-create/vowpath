"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsEnglishUi } from "@/components/providers/LocaleProvider";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the element to spotlight, e.g. "#shop-name" or '[data-tour-step="kpi-cards"]' */
  target: string;
  /** Short context above the title — e.g. "Step 1 of 4 · Required" */
  eyebrow?: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const RING = "rgba(224, 168, 88, 0.98)";
const RING_GLOW = "rgba(224, 168, 88, 0.45)";

/** Bottom tour card + dots + safe area — keep targets above this on mobile. */
function tourBottomReserve() {
  if (typeof window === "undefined") return 120;
  return window.innerWidth < 768 ? 300 : 140;
}

function findVisibleTarget(selector: string): Element | null {
  const nodes = document.querySelectorAll(selector);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width >= 20 && r.height >= 20) return el;
  }
  return null;
}

function scrollTargetIntoTourView(el: Element) {
  const mobile = window.innerWidth < 768;
  const rect = el.getBoundingClientRect();
  const topReserve = mobile ? 64 : 96;
  const bottomReserve = tourBottomReserve();
  const viewH = window.innerHeight;

  let delta = 0;
  if (rect.top < topReserve) {
    delta = rect.top - topReserve - 12;
  } else if (rect.bottom > viewH - bottomReserve) {
    delta = rect.bottom - (viewH - bottomReserve) + 12;
  }

  if (Math.abs(delta) > 4) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + delta),
      behavior: mobile ? "auto" : "smooth",
    });
  }
}

export function GuidedTour({
  steps,
  storageKey,
  doneMap,
  tourLabel,
}: {
  steps: TourStep[];
  storageKey: string;
  doneMap?: Record<string, boolean>;
  tourLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const stepBaselineDoneRef = useRef<boolean | undefined>(undefined);
  const measureRafRef = useRef<number | null>(null);
  const en = useIsEnglishUi();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [storageKey]);

  useEffect(() => {
    if (!visible) return;
    const current = steps[step];
    if (!current) return;
    const el = findVisibleTarget(current.target);
    if (el) return;
    const t = window.setTimeout(() => {
      if (step < steps.length - 1) setStep((s) => s + 1);
      else setVisible(false);
    }, 120);
    return () => window.clearTimeout(t);
  }, [step, visible, steps]);

  useEffect(() => {
    if (!visible) return;
    const current = steps[step];
    if (!current) {
      setRect(null);
      return;
    }

    const el = findVisibleTarget(current.target);
    if (!el) {
      setRect(null);
      return;
    }

    scrollTargetIntoTourView(el);

    const measure = () => {
      const target = findVisibleTarget(current.target);
      if (!target) {
        setRect(null);
        return;
      }
      const r = target.getBoundingClientRect();
      setRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - r.top) < 1 &&
          Math.abs(prev.left - r.left) < 1 &&
          Math.abs(prev.width - r.width) < 1 &&
          Math.abs(prev.height - r.height) < 1
        ) {
          return prev;
        }
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
    };

    const scheduleMeasure = () => {
      if (measureRafRef.current != null) cancelAnimationFrame(measureRafRef.current);
      measureRafRef.current = requestAnimationFrame(measure);
    };

    measure();
    const settle = setTimeout(measure, 120);
    const settle2 = setTimeout(measure, 400);
    window.addEventListener("scroll", scheduleMeasure, true);
    window.addEventListener("resize", scheduleMeasure);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleMeasure);
    }

    return () => {
      if (measureRafRef.current != null) cancelAnimationFrame(measureRafRef.current);
      clearTimeout(settle);
      clearTimeout(settle2);
      window.removeEventListener("scroll", scheduleMeasure, true);
      window.removeEventListener("resize", scheduleMeasure);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", scheduleMeasure);
      }
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
  const ui = {
    tour: tourLabel ?? (en ? "Quick tour" : "둘러보기"),
    step: (n: number, total: number) =>
      en ? `Step ${n} of ${total}` : `${total}단계 중 ${n}단계`,
    never: en ? "Don't show again" : "다시 보지 않기",
    back: en ? "← Back" : "← 이전",
    next: en ? "Next →" : "다음 →",
    done: en ? "Done ✓" : "완료 ✓",
    goTo: (n: number) => (en ? `Go to step ${n}` : `${n}단계로 이동`),
  };

  const hasSpot = !!rect && rect.height >= 24 && rect.width >= 24;

  const holeX = rect ? rect.left - PAD : 0;
  const holeY = rect ? rect.top - PAD : 0;
  const holeW = rect ? rect.width + PAD * 2 : 0;
  const holeH = rect ? rect.height + PAD * 2 : 0;

  return createPortal(
    <>
      {hasSpot ? (
        <>
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
          <div
            className="pointer-events-none fixed z-[91] rounded-xl"
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

      <div
        className="fixed bottom-0 left-0 right-0 z-[95] animate-tour-slide-up"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex justify-center gap-2 pb-3">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-amber-400" : i < step ? "w-2 bg-amber-200" : "w-2 bg-white/30"
              }`}
              aria-label={ui.goTo(i + 1)}
            />
          ))}
        </div>

        <div className="guided-tour-tooltip mx-4 mb-0 max-h-[min(42vh,320px)] overflow-y-auto rounded-t-2xl border border-b-0 border-amber-400/30 bg-brand-950 px-5 py-5 shadow-[0_-12px_50px_-8px_rgba(0,0,0,0.55)] sm:mx-auto sm:max-w-2xl sm:px-8 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {ui.tour} · {ui.step(step + 1, steps.length)}
              </p>
              {current.eyebrow ? (
                <p className="mt-1 text-sm font-semibold text-amber-200/90">{current.eyebrow}</p>
              ) : null}
              <h3 className="mt-1.5 text-lg font-bold text-white sm:text-2xl">{current.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/90 sm:text-[17px]">
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
              {ui.never}
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {ui.back}
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-amber-400 px-5 py-2 text-sm font-bold text-brand-950 shadow-sm transition hover:bg-amber-300"
              >
                {isLast ? ui.done : ui.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
