export type DemoVertical = "restoration" | "hvac";

export type DemoTabId = "overview" | "voice" | "link-intake" | "risk-hold";

export type DemoTab = {
  id: DemoTabId;
  label: string;
  mp4: string;
  hint: string;
  recordSlug: string;
};

export const DEMO_VERTICAL_CONFIG: Record<
  DemoVertical,
  {
    headline: string;
    subhead: string;
    identityLine: string;
    tabs: DemoTab[];
    voiceFootnote?: string;
  }
> = {
  restoration: {
    headline: "3 demos — restoration shops",
    subhead: "Night, weekend & field missed calls → AI intake → risk-based dispatch",
    identityLine:
      "You're on a job or off the clock — Effiroad answers on the schedule you set. Clear P1 water can auto-dispatch; fire, mold & unclear jobs wait for your 1 / 2.",
    tabs: [
      {
        id: "overview",
        label: "What is Effiroad?",
        mp4: "/videos/demo-overview.mp4",
        hint: "Same number · schedule-based answering · P1 auto-dispatch vs owner approval",
        recordSlug: "overview",
      },
      {
        id: "voice",
        label: "2 AM emergency call",
        mp4: "/videos/demo-voice.mp4",
        hint: "Full call — sewage P1 · owner SMS · crew dispatch · start to finish",
        recordSlug: "voice",
      },
      {
        id: "link-intake",
        label: "Text link intake",
        mp4: "/videos/demo-link-intake.mp4",
        hint: "Press 2 → SMS form · ~1 min self-service · no phone tag",
        recordSlug: "link-intake",
      },
    ],
    voiceFootnote: "Only the receptionist speaks on the call — customer replies are text-only.",
  },
  hvac: {
    headline: "3 demos — HVAC shops",
    subhead: "No-heat auto-dispatch · gas smell safety hold · schedule you control",
    identityLine:
      "Saturday 6 AM on another job? Effiroad picks up on your hours. Verified no-heat dispatches your on-call tech — gas smell always waits for your 1 / 2.",
    tabs: [
      {
        id: "overview",
        label: "What is Effiroad?",
        mp4: "/videos/demo-overview-hvac.mp4",
        hint: "Forward when you're busy · AI intake · smart dispatch vs safety hold",
        recordSlug: "overview",
      },
      {
        id: "voice",
        label: "No-heat auto-dispatch",
        mp4: "/videos/demo-voice-hvac.mp4",
        hint: "Full call — verified no-heat · auto-dispatch · crew SMS · owner FYI",
        recordSlug: "voice",
      },
      {
        id: "risk-hold",
        label: "Gas smell hold",
        mp4: "/videos/demo-risk-hold-hvac.mp4",
        hint: "Safety call — owner SMS 1 = dispatch · 2 = hold · never blind roll",
        recordSlug: "risk-hold",
      },
    ],
    voiceFootnote: "Clear no-heat dispatches automatically. Gas smell never does.",
  },
};

export type OverviewStep = {
  icon: string;
  title: string;
  body: string;
  tag: string;
};

export const OVERVIEW_STEPS: Record<DemoVertical, OverviewStep[]> = {
  restoration: [
    {
      icon: "📅",
      title: "Answer on your schedule",
      body: "Nights, weekends, lunch — set when Effiroad picks up. Your main number stays on the truck & Google.",
      tag: "Schedule control",
    },
    {
      icon: "📞",
      title: "We catch what you miss",
      body: "On a mitigation job or driving? Unanswered calls forward to Effiroad — not voicemail.",
      tag: "Field & after-hours",
    },
    {
      icon: "📋",
      title: "Smart intake & triage",
      body: "Address, loss type, urgency scored. P1 water with clear info can auto-page your crew.",
      tag: "Smart intake",
    },
    {
      icon: "✅",
      title: "You approve the risky ones",
      body: "Fire, mold, sewage ambiguity → SMS you 1 / 2 before anyone rolls. Reply 9 to undo auto-dispatch.",
      tag: "Risk-based SMS",
    },
  ],
  hvac: [
    {
      icon: "📅",
      title: "Answer on your schedule",
      body: "After 5 PM, weekends, storm weeks — Effiroad only picks up when you forward unanswered calls.",
      tag: "Hours you choose",
    },
    {
      icon: "🔥",
      title: "No-heat = auto-dispatch",
      body: "Verified no-heat / no-cool with name & address → on-call tech SMS instantly. Owner gets FYI.",
      tag: "Speed on standard calls",
    },
    {
      icon: "⚠️",
      title: "Gas smell = your call",
      body: "Gas odor, sparking, or fuzzy details → owner SMS hold. Reply 1 to dispatch, 2 to hold.",
      tag: "Safety first",
    },
    {
      icon: "🚚",
      title: "Crew dispatch built in",
      body: "Tech gets job card by SMS — reply 1 to accept. Customer gets on-the-way text automatically.",
      tag: "Not just a message",
    },
  ],
};

export const OVERVIEW_INTRO: Record<DemoVertical, { emoji: string; title: string; subtitle: string }> = {
  restoration: {
    emoji: "🌊",
    title: "Never miss a 2 AM water loss",
    subtitle: "AI answering for independent restoration shops · 1–15 crew",
  },
  hvac: {
    emoji: "❄️",
    title: "Never miss a 6 AM no-heat call",
    subtitle: "AI intake & dispatch for independent HVAC shops · 1–15 techs",
  },
};

export const LINK_INTAKE_CONFIG: Record<
  DemoVertical,
  {
    shopName: string;
    customerName: string;
    address: string;
    issue: string;
    smsBrand: string;
  }
> = {
  restoration: {
    shopName: "Ridgeline Restoration",
    customerName: "Mike Wilson",
    address: "4821 Oak Dr, Austin TX",
    issue: "Basement flooding",
    smsBrand: "Ridgeline",
  },
  hvac: {
    shopName: "Comfort Air HVAC",
    customerName: "Sarah Bennett",
    address: "904 Cedar Ln, Round Rock TX",
    issue: "No heat — house 58°F",
    smsBrand: "Comfort Air",
  },
};
