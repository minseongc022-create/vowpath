"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

type TabId = "emergency" | "estimate" | "dispatch" | "afterhours";

type TabContent = {
  id: TabId;
  label: string;
  title: string;
  description: string;
  points: string[];
  mockup: {
    header: string;
    rows: { label: string; value: string; tone?: "urgent" | "ok" }[];
  };
};

const TABS: TabContent[] = [
  {
    id: "emergency",
    label: "Emergency Response",
    title: "Emergencies get triaged in seconds, not voicemail",
    description:
      "When a caller mentions a flood, fire, or no-heat emergency, Effiroad recognizes the urgency immediately and moves straight into dispatch — no menu, no hold music.",
    points: ["Auto-dispatch to the on-call crew", "Address & damage capture", "Instant crew notification by SMS"],
    mockup: {
      header: "Incoming · Priority 1",
      rows: [
        { label: "Issue", value: "Sewage backup, rising" },
        { label: "Address", value: "4821 Oak Dr, Austin TX" },
        { label: "Status", value: "Crew dispatched", tone: "urgent" },
      ],
    },
  },
  {
    id: "estimate",
    label: "Estimate Flow",
    title: "Non-urgent jobs still get a clean, complete intake",
    description:
      "Not every call is a 2 AM emergency. For estimates and routine work, Effiroad captures job scope, photos, and availability so your team calls back with everything they need.",
    points: ["Job scope & photo request", "Availability captured up front", "Synced straight to your calendar"],
    mockup: {
      header: "Estimate request",
      rows: [
        { label: "Job", value: "Mold inspection, basement" },
        { label: "Availability", value: "Tue–Thu afternoons" },
        { label: "Status", value: "Added to calendar", tone: "ok" },
      ],
    },
  },
  {
    id: "dispatch",
    label: "Smart Dispatch",
    title: "Every job routes to the right person, automatically",
    description:
      "Calls are triaged P1–P3 based on urgency, then routed through your on-call rotation with an SMS approval loop so the owner stays in control without answering the phone.",
    points: ["P1 / P2 / P3 priority triage", "On-call rotation aware", "Owner approve/decline via SMS"],
    mockup: {
      header: "Dispatch queue",
      rows: [
        { label: "P1", value: "1 active — auto-dispatched", tone: "urgent" },
        { label: "P2", value: "2 pending owner reply" },
        { label: "P3", value: "3 scheduled this week", tone: "ok" },
      ],
    },
  },
  {
    id: "afterhours",
    label: "After-Hours Coverage",
    title: "Nights, weekends, holidays — never an off switch",
    description:
      "The exact same triage logic runs at 3 PM on a Tuesday or 3 AM on Christmas. Callers get a real answer every time, and your team only gets paged when it matters.",
    points: ["24/7/365 live answering", "No voicemail, ever", "Same triage logic around the clock"],
    mockup: {
      header: "3:12 AM · Answered",
      rows: [
        { label: "Wait time", value: "0 seconds", tone: "ok" },
        { label: "Call type", value: "No-heat emergency" },
        { label: "Status", value: "Tech notified", tone: "urgent" },
      ],
    },
  },
];

export function FeatureTabs() {
  const [active, setActive] = useState<TabId>("emergency");
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <section id="how-it-works-live" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading
          label="What effiroad handles"
          title="One AI, every kind of call"
          subtitle="Explore how Effiroad responds depending on what's actually happening on the line."
          align="center"
        />

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active === t.id
                  ? "bg-brand-800 text-white shadow-md"
                  : "border border-brand-200 bg-white text-stone-700 hover:border-brand-300 hover:bg-brand-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="text-2xl font-bold text-brand-950 sm:text-3xl">{tab.title}</h3>
            <p className="mt-4 text-base leading-relaxed text-stone-700">{tab.description}</p>
            <ul className="mt-6 space-y-3">
              {tab.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm font-medium text-brand-900">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="vow-site-card p-1.5">
            <div className="flex items-center justify-between rounded-xl bg-brand-950 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-200">
                {tab.mockup.header}
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
            </div>
            <div className="divide-y divide-brand-100 px-4">
              {tab.mockup.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {row.label}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      row.tone === "urgent"
                        ? "text-rose-700"
                        : row.tone === "ok"
                          ? "text-emerald-700"
                          : "text-brand-900"
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
