"use client";

import { useId } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  HERO_FLOW_LOOP_SUMMARY,
  HERO_FLOW_PIPELINE,
  HERO_FLOW_TAGS,
  OPERATING_FLOW_EDGES,
  OPERATING_FLOW_NODES,
  OPERATING_FLOW_PHASES,
} from "@/lib/operating-flow";

type PipelineIcon = (typeof HERO_FLOW_PIPELINE)[number]["icon"];

function StepIcon({ type }: { type: PipelineIcon }) {
  const cls = "h-5 w-5";
  if (type === "intake") {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    );
  }
  if (type === "sms") {
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M3.43 2.524A2 2 0 002 4.44v7.17a2 2 0 002 2.43l2.58.86a1 1 0 00.63 0l2.58-.86A2 2 0 0012 11.61V4.44a2 2 0 00-2.43-1.916l-3.14-.524a2 2 0 00-.66 0L3.43 2.524zM6.5 6.75a.75.75 0 000 1.5h7a.75.75 0 000-1.5h-7zm-.75 2.75a.75.75 0 01.75-.75h7a.75.75 0 010 1.5h-7a.75.75 0 01-.75-.75z"
          clipRule="evenodd"
        />
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
  return (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M3 4a2 2 0 012-2h6.5l3.5 3.5V16a2 2 0 01-2 2H5a2 2 0 01-2-2V4zm8.5 0V6a1 1 0 001 1h2.5L11.5 4z" />
      <path d="M6 11.5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zm0 2.5a.75.75 0 01.75-.75h4a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" />
    </svg>
  );
}

function FlowNode({
  title,
  caption,
  highlight,
}: {
  title: string;
  caption: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex min-w-[5rem] flex-col items-center rounded-xl border px-3 py-2.5 text-center sm:min-w-[6.5rem] sm:px-4 ${
        highlight
          ? "border-[#a78bfa]/40 bg-[#8b5cf6]/15 shadow-[0_0_24px_rgb(139_92_246/0.15)]"
          : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <p className={`text-xs font-semibold sm:text-sm ${highlight ? "text-white" : "text-slate-200"}`}>
        {title}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{caption}</p>
    </div>
  );
}

function FlowConnector({ label }: { label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 sm:px-2">
      <div className="flex w-full max-w-[10rem] items-center gap-1 sm:max-w-[12rem]">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#a78bfa]/50 to-[#a78bfa]/80" />
        <span className="shrink-0 text-sm text-[#a855f7]" aria-hidden>
          →
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#a78bfa]/50 to-[#a78bfa]/80" />
      </div>
      <p className="mt-2 max-w-[10rem] text-center text-[10px] font-medium leading-snug text-[#c4b5fd] sm:max-w-[12rem] sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function FlowTimeline() {
  return (
    <div className="mt-8 border-t border-white/[0.06] pt-8">
      <p className="text-center text-xs font-semibold text-[#c4b5fd]">Approval loop</p>
      <p className="mx-auto mt-2 max-w-xl text-center text-xs leading-relaxed text-slate-500">
        {HERO_FLOW_LOOP_SUMMARY}
      </p>

      <div
        className="mt-6 hidden items-center justify-center lg:flex"
        role="list"
        aria-label="Approval loop"
      >
        {OPERATING_FLOW_NODES.map((node, i) => (
          <div key={node.id} className="flex min-w-0 items-center" role="listitem">
            <FlowNode
              title={node.title}
              caption={node.caption}
              highlight={node.id === "effiroad" || node.id === "owner"}
            />
            {i < OPERATING_FLOW_EDGES.length ? (
              <FlowConnector label={OPERATING_FLOW_EDGES[i]} />
            ) : null}
          </div>
        ))}
      </div>

      <ol className="mx-auto mt-6 max-w-sm space-y-0 lg:hidden">
        {OPERATING_FLOW_NODES.map((node, i) => (
          <li key={node.id}>
            <div className="flex justify-center">
              <FlowNode
                title={node.title}
                caption={node.caption}
                highlight={node.id === "effiroad" || node.id === "owner"}
              />
            </div>
            {i < OPERATING_FLOW_EDGES.length ? (
              <div className="flex flex-col items-center py-2.5">
                <span className="text-[#a855f7]" aria-hidden>
                  ↓
                </span>
                <p className="mt-1 max-w-[16rem] text-center text-[11px] font-medium leading-snug text-[#c4b5fd]">
                  {OPERATING_FLOW_EDGES[i]}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
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
      <div className="vow-hero-flow-stage relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgb(45 91 255 / 0.2), transparent 55%)",
          }}
          aria-hidden
        />

        <p className="relative text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c4b5fd]">
          How approval works
        </p>

        <ul className="relative mt-5 flex flex-wrap justify-center gap-2">
          {HERO_FLOW_TAGS.map((tag) => (
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
            className="pointer-events-none absolute left-[5%] right-[5%] top-8 h-5 w-[90%]"
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
            {HERO_FLOW_PIPELINE.map((item) => (
              <div
                key={item.step}
                className="vow-hero-flow-step flex min-w-0 flex-1 flex-col items-center px-2 py-4 text-center"
              >
                <span className="vow-hero-flow-step-icon flex h-12 w-12 items-center justify-center rounded-xl text-[#c4b5fd]">
                  <StepIcon type={item.icon} />
                </span>
                <p className="mt-3 text-[10px] font-bold text-[#a78bfa]">{item.step}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-[11px] text-slate-500">{item.subtitle}</p>
              </div>
            ))}
          </div>
          <div className="vow-hero-flow-hub relative z-10 mt-2 flex justify-center">
            <div className="vow-hero-flow-hub-inner flex items-center justify-center">
              <BrandMark placement="flow-hub" priority />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 lg:hidden">
          {HERO_FLOW_PIPELINE.map((item) => (
            <div key={item.step} className="vow-hero-flow-step p-3 text-center">
              <p className="text-[10px] font-bold text-[#a78bfa]">{item.step}</p>
              <p className="mt-1 text-xs font-semibold text-white">{item.title}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{item.subtitle}</p>
            </div>
          ))}
        </div>

        <FlowTimeline />
        <PhaseDetailGrid />
      </div>
    </div>
  );
}
