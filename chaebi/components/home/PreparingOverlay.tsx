"use client";

import { useEffect, useState } from "react";
import { CheckIcon, SpinnerIcon } from "@/chaebi/components/ui/Icons";

/**
 * 생성 중 화면.
 *
 * ★ 왜 스피너 하나로 안 끝내는가
 *
 * 이 앱은 사용자가 스스로 못 하는 일을 대신 한다. 그 몇 초 동안 아무것도
 * 안 보여주면 "그냥 검색해서 목록 뿌리겠지"라고 생각한다. 무슨 일을 어떤
 * 순서로 하고 있는지 보여주는 것 자체가 제품 설명이다.
 *
 * 단계 문구는 실제 파이프라인(parse → needs → catalog → budget → timeline)과
 * 같은 순서다. 보여주기용 가짜 단계가 아니다.
 */

const STEPS = [
  "상황을 읽고 있어요",
  "무엇이 필요한지 정리하는 중",
  "주변 제휴처에서 후보를 찾는 중",
  "예산을 항목별로 나누는 중",
  "당일 동선을 짜는 중",
] as const;

const STEP_MS = 620;

export function PreparingOverlay() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      // 마지막 단계에서 멈춘다 — 응답이 오면 화면 자체가 바뀐다
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-cb-bg px-8"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-cb-primary text-white">
          <SpinnerIcon className="h-6 w-6" />
        </div>

        <ul className="space-y-3.5">
          {STEPS.map((label, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li
                key={label}
                className="flex items-center gap-3 transition-opacity duration-300"
                style={{ opacity: done ? 0.5 : active ? 1 : 0.28 }}
              >
                <span
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-full border"
                  style={{
                    borderColor: done || active ? "var(--cb-primary)" : "var(--cb-border-strong)",
                    background: done ? "var(--cb-primary)" : "transparent",
                    color: "#fff",
                  }}
                >
                  {done ? <CheckIcon className="h-3 w-3" strokeWidth={3.2} /> : null}
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-cb-primary animate-pulse" />
                  ) : null}
                </span>
                <span
                  className="text-[15px]"
                  style={{
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--cb-ink)" : "var(--cb-muted)",
                  }}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-9 text-center text-[12.5px] text-cb-subtle">잠시만요, 곧 보여드릴게요</p>
      </div>
    </div>
  );
}
