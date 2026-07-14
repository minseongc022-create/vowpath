"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";

type TabId =
  | "overview"
  | "voice"
  | "link-intake"
  | "estimate"
  | "dispatch"
  | "live-call"
  | "dashboard"
  | "onboarding";

type TabGroup = "start" | "flow" | "product";

const TABS: {
  id: TabId;
  label: string;
  webm: string;
  mp4: string;
  group: TabGroup;
  hint: string;
}[] = [
  {
    id: "overview",
    label: "How it works",
    webm: "/videos/demo-overview.webm",
    mp4: "/videos/demo-overview.mp4",
    group: "start",
    hint: "4-step overview · no actor required",
  },
  {
    id: "voice",
    label: "Emergency call",
    webm: "/videos/demo-voice.webm",
    mp4: "/videos/demo-voice.mp4",
    group: "flow",
    hint: "P1 water/sewage · owner approves by SMS",
  },
  {
    id: "link-intake",
    label: "Text link",
    webm: "/videos/demo-link-intake.webm",
    mp4: "/videos/demo-link-intake.mp4",
    group: "flow",
    hint: "Press 2 → SMS form · ~1 min self-service",
  },
  {
    id: "estimate",
    label: "Free estimate",
    webm: "/videos/demo-estimate.webm",
    mp4: "/videos/demo-estimate.mp4",
    group: "flow",
    hint: "Non-urgent · conversational intake",
  },
  {
    id: "dispatch",
    label: "Dispatch",
    webm: "/videos/demo-dispatch.webm",
    mp4: "/videos/demo-dispatch.mp4",
    group: "flow",
    hint: "Owner SMS → crew out · customer ETA text",
  },
  {
    id: "onboarding",
    label: "Go live",
    webm: "/videos/demo-onboarding.webm",
    mp4: "/videos/demo-onboarding.mp4",
    group: "start",
    hint: "Signup · forward calls · test call",
  },
  {
    id: "live-call",
    label: "Live call UI",
    webm: "/videos/demo-live-call.webm",
    mp4: "/videos/demo-live-call.mp4",
    group: "product",
    hint: "Production Retell agent on a real call",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    webm: "/videos/demo-dashboard.webm",
    mp4: "/videos/demo-dashboard.mp4",
    group: "product",
    hint: "Recordings, transcript, approve & dispatch",
  },
];

const GROUP_LABELS: Record<TabGroup, string> = {
  start: "Start here",
  flow: "Call flows",
  product: "Real product UI",
};

export function DemoVideoHero() {
  const [active, setActive] = useState<TabId>("overview");
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <section id="demo" className="border-y border-brand-200/40 bg-[#0c0b0a] py-16 text-white sm:py-20">
      <Container>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">
            See it in action
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
            Your AI front desk — on every call
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55 sm:text-base">
            Same phone number. Voice AI or text link. You approve what needs a human call.
          </p>
        </div>

        {(["start", "flow", "product"] as TabGroup[]).map((group) => (
          <div key={group} className="mt-8">
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-white/35">
              {GROUP_LABELS[group]}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {TABS.filter((t) => t.group === group).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active === t.id
                      ? group === "product"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                        : "bg-[#9a7f5e] text-white shadow-lg shadow-[#9a7f5e]/30"
                      : "bg-white/10 text-white/70 hover:bg-white/15"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
          <video
            key={tab.id}
            className="aspect-video w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label={`Effiroad ${tab.label} demo`}
          >
            <source src={tab.webm} type="video/webm" />
            <source src={tab.mp4} type="video/mp4" />
          </video>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">{tab.hint}</p>
      </Container>
    </section>
  );
}
