"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";

type TabId = "voice" | "estimate" | "dispatch" | "live-call" | "dashboard";

const TABS: { id: TabId; label: string; webm: string; mp4: string; group: "flow" | "product" }[] = [
  { id: "voice", label: "Voice AI", webm: "/videos/demo-voice.webm", mp4: "/videos/demo-voice.mp4", group: "flow" },
  { id: "estimate", label: "Free Estimate", webm: "/videos/demo-estimate.webm", mp4: "/videos/demo-estimate.mp4", group: "flow" },
  { id: "dispatch", label: "Smart Dispatch", webm: "/videos/demo-dispatch.webm", mp4: "/videos/demo-dispatch.mp4", group: "flow" },
  { id: "live-call", label: "Live Call UI", webm: "/videos/demo-live-call.webm", mp4: "/videos/demo-live-call.mp4", group: "product" },
  { id: "dashboard", label: "Dashboard", webm: "/videos/demo-dashboard.webm", mp4: "/videos/demo-dashboard.mp4", group: "product" },
];

export function DemoVideoHero() {
  const [active, setActive] = useState<TabId>("voice");
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <section className="border-y border-brand-200/40 bg-[#0c0b0a] py-16 text-white sm:py-20">
      <Container>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b59b78]">
            See it in action
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
            Your AI front desk — on every call
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55 sm:text-base">
            Real intake, real dispatch — no press-1 menus. Pick a flow and watch how Effiroad handles it.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {TABS.filter((t) => t.group === "flow").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active === t.id
                  ? "bg-[#9a7f5e] text-white shadow-lg shadow-[#9a7f5e]/30"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-widest text-white/35">
          Real product UI
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {TABS.filter((t) => t.group === "product").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active === t.id
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

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

        <p className="mt-6 text-center text-xs text-white/40">
          {tab.group === "product"
            ? "Recorded from production UI components · Same dashboard owners use daily"
            : "Simulated call flow · Same logic as production Retell + Twilio intake"}
        </p>
      </Container>
    </section>
  );
}
