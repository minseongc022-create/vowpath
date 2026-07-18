export type DemoVertical = "restoration" | "hvac";

export type DemoTabId = "overview" | "voice" | "link-intake" | "risk-hold";

export type DemoTab = {
  id: DemoTabId;
  label: string;
  hint: string;
  /** @deprecated Videos replaced by interactive demo — kept for record pipeline */
  mp4?: string;
  recordSlug?: string;
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
    headline: "See Effiroad in action",
    subhead: "Night, weekend & field missed calls → warm intake → risk-based dispatch",
    identityLine:
      "You're on a job or off the clock — Effiroad answers on the schedule you set. Clear P1 water can auto-dispatch; fire, mold & unclear jobs wait for your 1 / 2.",
    tabs: [
      {
        id: "voice",
        label: "Try the full call flow",
        hint: "Interactive — tap through IVR, intake, owner SMS, and crew dispatch · production scripts",
      },
    ],
    voiceFootnote: "Only the receptionist speaks on the call — you tap to play the customer's side.",
  },
  hvac: {
    headline: "See Effiroad in action",
    subhead: "No-heat auto-dispatch · gas smell safety hold · schedule you control",
    identityLine:
      "Saturday 6 AM on another job? Effiroad picks up on your hours. Verified no-heat dispatches your on-call tech — gas smell always waits for your 1 / 2.",
    tabs: [
      {
        id: "voice",
        label: "No-heat auto-dispatch",
        hint: "Interactive — tap through menu, intake, and auto-dispatch",
      },
      {
        id: "risk-hold",
        label: "Gas smell hold",
        hint: "Interactive — safety hold · owner SMS 1 = dispatch · 2 = hold",
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
