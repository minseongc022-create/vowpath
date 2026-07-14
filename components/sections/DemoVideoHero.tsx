"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";

const DEMOS = [
  {
    id: "overview",
    label: "What is Effiroad?",
    webm: "/videos/demo-overview.webm",
    mp4: "/videos/demo-overview.mp4",
    hint: "60-second overview — same number, AI intake, dispatch, you approve exceptions",
  },
  {
    id: "voice",
    label: "AI phone response",
    webm: "/videos/demo-voice.webm",
    mp4: "/videos/demo-voice.mp4",
    hint: "AI speaks on the call · customer replies by text · owner SMS dispatch",
  },
  {
    id: "link-intake",
    label: "Text link intake",
    webm: "/videos/demo-link-intake.webm",
    mp4: "/videos/demo-link-intake.mp4",
    hint: "Press 2 → SMS form · ~1 min self-service · no phone tag",
  },
] as const;

type DemoId = (typeof DEMOS)[number]["id"];

export function DemoVideoHero() {
  const [active, setActive] = useState<DemoId>("overview");
  const tab = DEMOS.find((t) => t.id === active) ?? DEMOS[0];

  return (
    <section id="demo" className="border-y border-brand-200/40 bg-[#0c0b0a] py-12 text-white sm:py-16">
      <Container>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">See it in action</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
            3 short demos — what we do &amp; how calls work
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55 sm:text-base">
            Overview first, then how Effiroad responds on a real emergency call.
          </p>
        </div>

        <div className="-mx-2 mt-8 flex gap-2 overflow-x-auto px-2 pb-1 snap-x snap-mandatory sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0">
          {DEMOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
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

        <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl sm:mt-8">
          <video
            key={tab.id}
            className="aspect-video w-full bg-black object-contain"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="auto"
            aria-label={`Effiroad ${tab.label} demo`}
          >
            <source src={tab.webm} type="video/webm" />
            <source src={tab.mp4} type="video/mp4" />
          </video>
        </div>

        <p className="mt-4 text-center text-xs text-white/45 sm:mt-6">
          {tab.hint}
          {active === "voice" ? (
            <span className="mt-1 block text-[#b59b78]">
              Tap the speaker icon on the player to hear the AI voice — customer replies are text-only.
            </span>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
