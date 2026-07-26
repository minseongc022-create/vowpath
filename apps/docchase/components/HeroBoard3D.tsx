"use client";

import { useEffect, useRef, useState } from "react";

const demoRows = [
  { name: "한빛카페 성수점", status: "지연", tone: "rose" },
  { name: "동행건설", status: "2차 요청", tone: "amber" },
  { name: "미르한의원", status: "1차 요청", tone: "pine" },
  { name: "오픈로지스", status: "제출완료", tone: "done" },
] as const;

/**
 * Single 3D focal point for the landing — the status board only.
 * Desktop: gentle pointer tilt. Mobile: soft static depth (no heavy motion).
 */
export function HeroBoard3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 8, y: -10 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({
      x: 8 - py * 10,
      y: -10 + px * 14,
    });
  }

  function onLeave() {
    if (reduced) return;
    setTilt({ x: 8, y: -10 });
  }

  return (
    <div
      className="hero-3d-scene relative mx-auto w-full max-w-md lg:max-w-none"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-pine-500/15 blur-3xl" aria-hidden />
      <div
        ref={ref}
        className="hero-3d-card relative will-change-transform"
        style={{
          transform: reduced
            ? undefined
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
        }}
      >
        <div className="hero-3d-face overflow-hidden rounded-[1.35rem] border border-white/15 bg-ink text-paper shadow-[0_28px_60px_-24px_rgba(14,26,24,0.65)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 sm:px-5 sm:py-4">
            <div>
              <p className="text-[11px] tracking-[0.14em] text-paper/50 sm:text-xs">이번 달 마감</p>
              <p className="mt-1 font-display text-lg font-medium sm:text-xl">바른세무회계 · 7월</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-paper/50 sm:text-xs">회수율</p>
              <p className="font-display text-2xl font-medium text-pine-200">63%</p>
            </div>
          </div>
          <ul className="divide-y divide-white/[0.07]">
            {demoRows.map((row, i) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 animate-slide-in"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      row.tone === "rose"
                        ? "bg-rose-300 animate-pulse-dot"
                        : row.tone === "amber"
                          ? "bg-amber-300"
                          : row.tone === "done"
                            ? "bg-pine-300"
                            : "bg-teal-200"
                    }`}
                  />
                  <span className="truncate text-sm font-medium">{row.name}</span>
                </div>
                <span className="shrink-0 text-xs text-paper/65">{row.status}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 px-4 py-3.5 text-xs leading-relaxed text-paper/55 sm:px-5 sm:py-4">
            지연 1곳 · 요청 중 2곳 · 완료 1곳 — 미제출만 처리합니다.
          </div>
        </div>
        {/* soft depth plate — not a second product card */}
        <div
          className="pointer-events-none absolute inset-x-3 -bottom-3 -z-10 h-full rounded-[1.35rem] bg-ink/25 blur-[1px]"
          aria-hidden
          style={{ transform: "translateZ(-28px) rotateX(2deg)" }}
        />
      </div>
    </div>
  );
}
