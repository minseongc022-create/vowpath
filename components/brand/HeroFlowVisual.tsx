"use client";

import Image from "next/image";
import { useId } from "react";
import { BRAND_MARK_SRC } from "@/lib/brand-assets";
import { OPERATING_FLOW_LANES, OPERATING_FLOW_PHASES } from "@/lib/operating-flow";

const INPUT_TAGS = [
  "메인 번호 유지",
  "조건부 착신전환",
  "전화 · 링크 접수",
  "SMS · 1·2 승인",
] as const;

const PIPELINE = [
  { step: "01", title: "착신전환", icon: "phone" as const },
  { step: "02", title: "AI 접수", icon: "ai" as const },
  { step: "03", title: "1·2 승인", icon: "review" as const },
  { step: "04", title: "Jobber", icon: "jobber" as const },
];

function StepIcon({ type }: { type: (typeof PIPELINE)[number]["icon"] }) {
  const cls = "h-5 w-5";
  if (type === "phone") {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    );
  }
  if (type === "ai") {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
      </svg>
    );
  }
  if (type === "review") {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return <span className="text-sm font-bold">J</span>;
}

function FlowLanes() {
  return (
    <div className="mt-8 hidden items-center justify-center gap-3 lg:flex">
      {OPERATING_FLOW_LANES.map((lane, i) => (
        <span key={lane.label} className="flex items-center gap-3">
          <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
            {lane.from}
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#c4b5fd]">
              {lane.label}
            </span>
            <span className="text-[#a855f7]" aria-hidden>
              →
            </span>
          </span>
          <span className="rounded-lg border border-[#a78bfa]/25 bg-[#8b5cf6]/10 px-3 py-1.5 text-xs font-medium text-slate-200">
            {lane.to}
          </span>
          {i < OPERATING_FLOW_LANES.length - 1 ? (
            <span className="ml-2 text-slate-600" aria-hidden>
              ·
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function PhaseDetailGrid() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {OPERATING_FLOW_PHASES.map((phase) => (
        <article key={phase.id} className="vow-site-card group p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a78bfa]">
              {phase.phase}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {phase.outputs.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-400"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">{phase.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{phase.summary}</p>
          <ul className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
            {phase.details.map((d) => (
              <li key={d.label} className="flex gap-3">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a78bfa]"
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-semibold text-slate-300">{d.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{d.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function HeroFlowVisual() {
  const lineGradId = useId().replace(/:/g, "") + "-line";

  return (
    <div className="vow-hero-flow relative mx-auto w-full max-w-6xl">
      <header className="text-center">
        <p className="hvac-badge-dark mx-auto inline-flex">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          미국 residential HVAC · 문자 승인
        </p>
        <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          바쁜 날·야간·현장에서{" "}
          <span className="hvac-text-gradient">문자로 예약 확인</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          메인 번호 유지 → 못 받을 때 Vowpath로 전환 → 전화/링크 접수 → 문자·이메일로 1/2 승인 →
          고객 확정 · Jobber 기록
        </p>
      </header>

      <div className="vow-hero-flow-stage relative mt-10 overflow-hidden rounded-[1.75rem] border border-white/[0.07] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgb(45 91 255 / 0.2), transparent 55%)",
          }}
          aria-hidden
        />

        <p className="relative text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c4b5fd]">
          서비스 흐름
        </p>

        <ul className="relative mt-5 flex flex-wrap justify-center gap-2">
          {INPUT_TAGS.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-[#a78bfa]/25 bg-[#8b5cf6]/12 px-3.5 py-1.5 text-xs font-medium text-slate-200"
            >
              {tag}
            </li>
          ))}
        </ul>

        <div className="relative mt-8 hidden lg:block">
          <svg
            className="pointer-events-none absolute left-[5%] right-[5%] top-6 h-5 w-[90%]"
            viewBox="0 0 900 20"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id={lineGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 10 L 900 10"
              fill="none"
              stroke={`url(#${lineGradId})`}
              strokeWidth="2"
              className="vow-hero-flow-curve"
            />
          </svg>
          <div className="relative flex justify-between gap-2">
            {PIPELINE.map((item) => (
              <div key={item.step} className="vow-hero-flow-step flex min-w-0 flex-1 flex-col items-center px-2 py-4 text-center">
                <span className="vow-hero-flow-step-icon flex h-12 w-12 items-center justify-center rounded-xl text-[#c4b5fd]">
                  <StepIcon type={item.icon} />
                </span>
                <p className="mt-3 text-[10px] font-bold text-[#a78bfa]">{item.step}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
              </div>
            ))}
          </div>
          <div className="relative z-10 -mt-2 flex justify-center">
            <div className="vow-hero-flow-hub-pedestal flex items-center gap-3 rounded-2xl border border-[#a78bfa]/30 bg-[#060d18]/90 px-5 py-3">
              <Image src={BRAND_MARK_SRC} alt="" width={36} height={36} className="h-9 w-9 object-contain" priority />
              <div className="text-left">
                <p className="vow-brand-name vow-brand-name-light text-xs tracking-[0.2em]">VOWPATH</p>
                <p className="text-[10px] text-slate-500">AI 접수 · 알림</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 lg:hidden">
          {PIPELINE.map((item) => (
            <div key={item.step} className="vow-hero-flow-step p-3 text-center">
              <p className="text-[10px] font-bold text-[#a78bfa]">{item.step}</p>
              <p className="mt-1 text-xs font-semibold text-white">{item.title}</p>
            </div>
          ))}
        </div>

        <FlowLanes />
        <PhaseDetailGrid />
      </div>
    </div>
  );
}
