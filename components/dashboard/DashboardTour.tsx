"use client";

import { useEffect, useRef, useState } from "react";

const TOUR_NEVER_KEY = "effiroad_tour_v1_never";

const STEPS = [
  {
    id: "new-request",
    title: "🆕 새 요청 직접 추가",
    description:
      "전화가 없어도 여기서 직접 새 서비스 요청을 등록할 수 있어요. 현장에서 바로 접수하거나 기존 고객 재방문을 기록할 때 씁니다.",
  },
  {
    id: "pending-review",
    title: "⏳ 승인 대기 요청",
    description:
      "AI가 받은 통화에서 접수된 요청이 여기 쌓여요. ✓ 승인 / ✗ 거절을 누르면 고객에게 자동으로 SMS가 발송됩니다. 하루에 한 번만 확인해도 됩니다.",
  },
  {
    id: "revenue",
    title: "💰 매출 현황",
    description:
      "Jobber와 연동하면 수집된 매출을 기간별로 볼 수 있어요. 설정 → Jobber 연결에서 30초면 끝납니다.",
  },
  {
    id: "recovery-metrics",
    title: "📊 복구 작업 지표",
    description:
      "수해·화재·곰팡이 현장별 진행 상황을 한눈에 파악해요. 어떤 손실 유형이 가장 많은지도 확인할 수 있어요.",
  },
  {
    id: "kpi-cards",
    title: "📈 핵심 성과 지표 (KPI)",
    description:
      "처리된 통화 수, 대기 고객, 예약 건수를 실시간으로 파악하세요. 각 카드를 클릭하면 세부 내역이 펼쳐져요.",
  },
  {
    id: "trend-chart",
    title: "📉 통화 처리 추세",
    description:
      "Effiroad가 야간·부재중 통화를 얼마나 처리했는지 날짜별로 확인해요. 상단에서 7일·30일·90일 기간을 바꿔볼 수 있어요.",
  },
  {
    id: "recent-requests",
    title: "📋 최근 서비스 요청",
    description:
      "가장 최근에 접수된 요청 목록이에요. 항목을 클릭하면 고객 이름·주소·이슈 유형·AI 요약을 자세히 볼 수 있어요.",
  },
  {
    id: "upcoming-bookings",
    title: "📅 예정된 일정",
    description:
      "승인된 요청 중 아직 완료되지 않은 일정이 여기 표시돼요. 현장 출동 전 빠르게 오늘 스케줄을 확인하세요.",
  },
];

export function DashboardTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevElRef = useRef<Element | null>(null);

  useEffect(() => {
    if (localStorage.getItem(TOUR_NEVER_KEY)) return;
    // Small delay so the dashboard finishes rendering first
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Apply / remove .tour-highlight on the target element
  useEffect(() => {
    if (!visible) return;

    if (prevElRef.current) {
      prevElRef.current.classList.remove("tour-highlight");
      prevElRef.current = null;
    }

    const current = STEPS[step];
    const el = document.querySelector(`[data-tour-step="${current.id}"]`);
    if (el) {
      el.classList.add("tour-highlight");
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      prevElRef.current = el;
    }

    return () => {
      el?.classList.remove("tour-highlight");
    };
  }, [step, visible]);

  // Clean up on unmount
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
    if (step < STEPS.length - 1) {
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
    localStorage.setItem(TOUR_NEVER_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-tour-slide-up">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pb-2">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "w-6 bg-brand-600"
                : i < step
                  ? "w-1.5 bg-brand-400"
                  : "w-1.5 bg-brand-200"
            }`}
            aria-label={`${i + 1}단계로 이동`}
          />
        ))}
      </div>

      {/* Panel */}
      <div className="mx-4 mb-0 rounded-t-2xl border border-b-0 border-brand-200 bg-white/97 px-5 py-4 shadow-[0_-8px_40px_-8px_rgba(61,50,40,0.20)] backdrop-blur-sm sm:mx-auto sm:max-w-xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
              기능 안내 &nbsp;{step + 1} / {STEPS.length}
            </p>
            <h3 className="mt-0.5 text-[15px] font-semibold text-brand-950">
              {current.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              {current.description}
            </p>
          </div>

          {/* Close (X) */}
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            aria-label="닫기"
          >
            <svg
              className="h-4 w-4"
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

        {/* Bottom row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleNever}
            className="text-xs text-stone-400 transition hover:text-stone-600"
          >
            다시 보지 않기
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
              >
                ← 이전
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              {isLast ? "완료 ✓" : "다음 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
