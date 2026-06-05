/** Vowpath call-forwarding onboarding — original setup guides for US shops. */

export type ForwardingScenarioId = "overflow" | "after_hours" | "busy_and_after_hours";

export type ForwardingProviderId = "carrier" | "dialpad" | "voip" | "other";

export type ForwardingScenario = {
  id: ForwardingScenarioId;
  label: string;
  summary: string;
  recommended?: boolean;
};

export type ForwardingProvider = {
  id: ForwardingProviderId;
  label: string;
  hint: string;
  recommended?: boolean;
};

export const FORWARDING_SCENARIOS: ForwardingScenario[] = [
  {
    id: "overflow",
    label: "When you miss a call (recommended)",
    summary:
      "Your line rings first. If nobody picks up in about 15–20 seconds, the call forwards to Vowpath.",
    recommended: true,
  },
  {
    id: "after_hours",
    label: "After hours & weekends only",
    summary:
      "You answer during business hours. Nights and weekends forward to Vowpath automatically.",
  },
  {
    id: "busy_and_after_hours",
    label: "Busy line + after hours",
    summary:
      "Forwards when you are on another call or outside business hours — good for peak season.",
  },
];

export const FORWARDING_PROVIDERS: ForwardingProvider[] = [
  {
    id: "dialpad",
    label: "Jobber Phone / Dialpad",
    hint: "ServiceTitan Phones Pro, etc.",
    recommended: true,
  },
  {
    id: "carrier",
    label: "Cell carrier",
    hint: "Verizon, AT&T, T-Mobile — varies by carrier",
  },
  {
    id: "voip",
    label: "VoIP",
    hint: "RingCentral, OpenPhone, 3CX",
  },
  {
    id: "other",
    label: "Other",
    hint: "Another PBX or phone system",
  },
];

export function getForwardingGuideSteps(
  provider: ForwardingProviderId,
  scenario: ForwardingScenarioId,
  vowpathNumber: string,
): string[] {
  const num = vowpathNumber || "(your Vowpath number)";
  const ringTip =
    "Tip: 15–20 seconds of ring time lets your team answer before Vowpath picks up.";
  const dialNum = num.replace(/\D/g, "").slice(-10);

  if (provider === "dialpad") {
    if (scenario === "overflow") {
      return [
        "Open Dialpad → Settings → Main Line → Call Routing → Edit Call Routing.",
        `Under Fallback, choose “To a team member, room phone, or external number” and enter ${num}.`,
        "If Fallback is not on Main Line, set the same external number in your default Contact Center.",
        `During business hours your team rings first; unanswered calls go to Vowpath. ${ringTip}`,
        "Save (look for “Changes Saved”), then place a test call during business hours.",
      ];
    }
    if (scenario === "after_hours") {
      return [
        "Open Dialpad → Settings → Main Line → Call Routing → Edit.",
        `Under Closed Hours Routing, choose an external number and enter ${num}.`,
        "Set Business Hours and time zone to match your shop’s local schedule.",
        "Save, then test with a call placed after hours or on a weekend.",
      ];
    }
    return [
      `Business-hours overflow (Fallback) → external number ${num}.`,
      `After hours (Closed Hours Routing) → same number ${num}.`,
      "If calls route through a Contact Center, configure both rules there instead of Main Line.",
      "Test during business hours, after hours, and while on another call.",
    ];
  }

  if (provider === "carrier") {
    if (scenario === "after_hours") {
      return [
        "Mobile-only shops often use *72 (forward all) at night and *73 to turn off in the morning.",
        "Check My Verizon or myAT&T for scheduled forwarding if your plan supports it.",
        `Forward to ${num} (10-digit: ${dialNum || "your number"}).`,
        "For reliable after-hours rules, Dialpad or VoIP time-based routing works better.",
        "Test by calling your main shop number after hours.",
      ];
    }
    if (scenario === "overflow") {
      return [
        "iPhone Settings → Call Forwarding only forwards all calls — not “no answer only.” Use the codes below.",
        `Verizon: dial *71${dialNum || "10digitnumber"} (no answer / busy, ~3–4 rings). Turn off with *73.`,
        `AT&T: dial *92${dialNum || "10digitnumber"}# (no answer). Turn off with *93#.`,
        "iPhone on Verizon: Settings → Phone → Live Voicemail OFF (can block *71).",
        "Call your main shop number and confirm Vowpath answers after a few rings.",
      ];
    }
    return [
      `Verizon *71${dialNum || "10digit"} for no-answer/busy; nights may need *72/*73 if no schedule.`,
      `AT&T no-answer *92${dialNum || "10digit"}# · busy *90${dialNum || "10digit"}#.`,
      "Turn off iPhone Live Voicemail on Verizon before testing.",
      "Test after-hours and busy-line scenarios separately.",
    ];
  }

  if (provider === "voip") {
    if (scenario === "overflow") {
      return [
        "In your VoIP admin portal, open Call Routing or Time-based routing.",
        `Set No Answer → Forward to external number → ${num}.`,
        `Set ring timeout to about 15–20 seconds. ${ringTip}`,
        "Optionally forward Busy to the same number, then test.",
      ];
    }
    if (scenario === "after_hours") {
      return [
        "Open Business Hours or After-hours routing in your VoIP portal.",
        `Outside business hours → Forward to external → ${num}.`,
        "Match time zone and days to your Vowpath schedule in Settings.",
        "Test with a call placed after hours.",
      ];
    }
    return [
      "Configure both after-hours and busy-line rules to forward to an external number.",
      `Destination: ${num}.`,
      "Add a no-answer rule during business hours for peak-season backup.",
      "Test each scenario with a call to your main line.",
    ];
  }

  return [
    "In your phone system, find call forwarding or external-number routing.",
    `Set the forward destination to ${num}.`,
    scenario === "after_hours"
      ? "Apply the rule for nights and weekends only."
      : "Apply for no-answer and busy (as needed).",
    "Place a test call to your published shop number.",
  ];
}
