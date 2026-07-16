"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OVERVIEW_INTRO, OVERVIEW_STEPS, type DemoVertical } from "@/lib/demo-vertical-config";

type DemoOverviewCarouselProps = {
  vertical?: DemoVertical;
};

export function DemoOverviewCarousel({ vertical = "restoration" }: DemoOverviewCarouselProps) {
  const steps = OVERVIEW_STEPS[vertical];
  const intro = OVERVIEW_INTRO[vertical];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const syncActiveFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    children.forEach((child, i) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(center - childCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActiveIdx(best);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncActiveFromScroll, { passive: true });
    return () => el.removeEventListener("scroll", syncActiveFromScroll);
  }, [syncActiveFromScroll]);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActiveIdx(idx);
  };

  return (
    <div className="mt-8">
      <div className="mb-4 text-center">
        <p className="text-2xl" aria-hidden>
          {intro.emoji}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#f5f0e8]">{intro.title}</p>
        <p className="mt-0.5 text-xs text-white/45">{intro.subtitle}</p>
      </div>

      <div
        ref={scrollRef}
        className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2 scroll-smooth sm:mx-0 sm:gap-4 sm:px-0"
        aria-label="How Effiroad works"
      >
        {steps.map((step, i) => (
          <article
            key={step.title}
            className={`w-[82vw] max-w-sm shrink-0 snap-center rounded-2xl border p-5 transition sm:w-[340px] ${
              activeIdx === i
                ? "border-[#9a7f5e]/60 bg-[#9a7f5e]/15 shadow-lg shadow-black/20"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-2xl" aria-hidden>
                {step.icon}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b59b78]">
                {step.tag}
              </span>
            </div>
            <h3 className="mt-3 text-base font-bold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{step.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {steps.map((step, i) => (
          <button
            key={step.title}
            type="button"
            onClick={() => scrollTo(i)}
            className={`h-2 rounded-full transition-all ${
              activeIdx === i ? "w-6 bg-[#9a7f5e]" : "w-2 bg-white/25 hover:bg-white/40"
            }`}
            aria-label={`Show slide ${i + 1}: ${step.title}`}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-white/35 sm:hidden">Swipe to explore →</p>
    </div>
  );
}
