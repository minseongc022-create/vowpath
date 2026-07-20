"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Container } from "@/components/ui/Container";
import { DemoOverviewCarousel } from "@/components/sections/DemoOverviewCarousel";
import {
  DEMO_VERTICAL_CONFIG,
  type DemoTab,
  type DemoVertical,
} from "@/lib/demo-vertical-config";

const DemoInteractiveCallScene = dynamic(
  () =>
    import("@/components/demo/DemoInteractiveCallScene").then((m) => m.DemoInteractiveCallScene),
  { ssr: false },
);

const VISIBLE_RATIO = 0.35;

type DemoVideoHeroProps = {
  vertical?: DemoVertical;
};

function sceneVariant(tabId: DemoTab["id"]): "default" | "gas-hold" {
  return tabId === "risk-hold" ? "gas-hold" : "default";
}

export function DemoVideoHero({ vertical = "restoration" }: DemoVideoHeroProps) {
  const config = DEMO_VERTICAL_CONFIG[vertical];
  const demos = config.tabs;
  const [active, setActive] = useState(demos[0].id);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [liveKey, setLiveKey] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const tab = demos.find((t) => t.id === active) ?? demos[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSectionVisible(entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO);
      },
      { threshold: [0, VISIBLE_RATIO, 0.55, 0.75] },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setActive(demos[0].id);
  }, [vertical, demos]);

  const selectTab = (id: DemoTab["id"]) => {
    setActive(id);
    setLiveKey((k) => k + 1);
  };

  return (
    <section
      ref={sectionRef}
      id="demo"
      className="border-y border-brand-200/40 bg-[#0c0b0a] py-12 text-white sm:py-16"
    >
      <Container>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">See it in action</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">{config.headline}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/55 sm:text-base">{config.subhead}</p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-[#b59b78]/80 sm:text-sm">
            {config.identityLine}
          </p>
        </div>

        <DemoOverviewCarousel vertical={vertical} />

        {demos.length > 1 ? (
          <div className="-mx-2 mt-8 flex gap-2 overflow-x-auto px-2 pb-1 snap-x snap-mandatory sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0">
            {demos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`min-h-[48px] shrink-0 snap-center rounded-full px-5 py-2.5 text-sm font-semibold transition sm:shrink ${
                  active === t.id
                    ? "bg-[#9a7f5e] text-white shadow-lg shadow-[#9a7f5e]/30"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl sm:mt-8">
          <div
            key={`${vertical}-${active}-${liveKey}`}
            className="aspect-video min-h-[360px] w-full sm:min-h-[420px]"
          >
            <DemoInteractiveCallScene
              embedded
              enabled={sectionVisible}
              vertical={vertical}
              variant={sceneVariant(active)}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/45 sm:mt-6">
          {tab.hint}
          <span className="mt-1 block text-white/40">Tap 🔊 in the demo to hear the AI voice.</span>
          {config.voiceFootnote ? (
            <span className="mt-1 block text-[#b59b78]">{config.voiceFootnote}</span>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
