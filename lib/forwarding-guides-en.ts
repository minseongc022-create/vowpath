/** Call-forwarding setup guides — US English. */



export type ForwardingScenarioId = "overflow" | "busy_and_after_hours";

export type LegacyForwardingScenarioId = ForwardingScenarioId | "after_hours";

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



export function normalizeForwardingScenario(

  scenario?: LegacyForwardingScenarioId | string,

): ForwardingScenarioId {

  if (scenario === "busy_and_after_hours") return "busy_and_after_hours";

  return "overflow";

}



export const FORWARDING_PROVIDER_NOTE =

  "Carrier and phone menus vary. Use this as a starting guide and confirm with your provider's docs before changing settings.";



export const FORWARDING_SCENARIOS: ForwardingScenario[] = [

  {

    id: "overflow",

    label: "When you miss a call (most common)",

    summary:

      "Your main line rings first. If no one answers in about 15–20 seconds, the call forwards to Effiroad.",

    recommended: true,

  },

  {

    id: "busy_and_after_hours",

    label: "When line is busy",

    summary:

      "While you are on another call, calls forward to Effiroad. Set after-hours windows separately in answer hours.",

  },

];



export const FORWARDING_PROVIDERS: ForwardingProvider[] = [

  {

    id: "dialpad",

    label: "Business Phone / Dialpad",

    hint: "Jobber Phone, ServiceTitan Phones Pro, and other Dialpad-based systems work the same way",

    recommended: true,

  },

  {

    id: "carrier",

    label: "Mobile carrier",

    hint: "Verizon, AT&T, T-Mobile — codes vary by carrier",

  },

  {

    id: "voip",

    label: "Business VoIP",

    hint: "RingCentral, OpenPhone, 3CX, etc.",

  },

  {

    id: "other",

    label: "Other",

    hint: "PBX, hosted voice, custom setup",

  },

];



export function getForwardingGuideSteps(

  provider: ForwardingProviderId,

  scenario: LegacyForwardingScenarioId,

  effiroadNumber: string,

): string[] {

  const activeScenario = normalizeForwardingScenario(scenario);

  const num = effiroadNumber || "(your Effiroad number)";

  const ringTip = "Let it ring about 15–20 seconds so your team can answer before forwarding.";

  const dialNum = num.replace(/\D/g, "").slice(-10);

  const tenDigit = dialNum || "10-digit number";



  if (provider === "dialpad") {

    if (activeScenario === "overflow") {

      return [

        "In Dialpad or your business phone system, open call routing for your main shop line.",

        `Set overflow / no-answer external number to ${num}.`,

        "If you use a contact center queue, add the same external number to the queue overflow rule.",

        `During business hours your shop line rings first; missed calls go to Effiroad. ${ringTip}`,

        "Save, then call your public shop number during business hours to verify.",

      ];

    }

    return [

      `Business hours — no answer / overflow → ${num}`,

      `After hours — same destination: ${num}`,

      "If calls pass through a queue, mirror the same rules on the queue.",

      "Test all three: daytime no-answer, after hours, and busy.",

    ];

  }



  if (provider === "carrier") {

    if (activeScenario === "overflow") {

      return [

        "iPhone default forwarding sends all calls (not just missed). Carrier codes below are usually better.",

        `Verizon example: no answer / busy *71${tenDigit}, cancel *73 — confirm latest codes on Verizon support.`,

        `AT&T example: no answer *92${tenDigit}#, cancel *93# — busy codes may differ.`,

        "On Verizon iPhone: Settings → Phone → turn off Live Voicemail, then test *71.",

        "Call your main shop number and confirm Effiroad answers after a few rings.",

      ];

    }

    return [

      `Verizon-style no answer / busy: *71${tenDigit} (cancel *73).`,

      `AT&T-style no answer: *92${tenDigit}# (cancel *93#). Check your carrier for busy codes.`,

      "On Verizon iPhone, disable Live Voicemail before testing.",

      "Set after-hours windows in Integrations, then test during those hours.",

    ];

  }



  if (provider === "voip") {

    if (activeScenario === "overflow") {

      return [

        "In your VoIP admin portal, open call routing / time rules for the main number.",

        `Add or edit a no-answer rule to forward externally to ${num}.`,

        `Set ring time to about 15–20 seconds. ${ringTip}`,

        "Optional: add a busy rule to the same number, save, and test.",

      ];

    }

    return [

      "Create a busy rule and set the external destination.",

      `Destination: ${num}`,

      "Keep a no-answer rule as backup for peak season.",

      "Test each scenario from your public shop number.",

    ];

  }



  return [

    "Find call forwarding or external routing in your phone system.",

    `Forward to ${num}.`,

    activeScenario === "busy_and_after_hours"

      ? "Enable busy forwarding if your system supports it."

      : "Enable no-answer forwarding.",

    "After-hours windows are set under Integrations → answer hours.",

    "Call the number customers actually dial and confirm Effiroad answers.",

  ];

}
