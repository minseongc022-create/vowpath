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

  "Interface paths and option labels are updated by providers without prior notice. The steps above reflect verified configurations as of mid-2025 and serve as a reference baseline — cross-check against your provider's current documentation before applying. For configuration assistance, contact Effiroad Support.";



export const FORWARDING_SCENARIOS: ForwardingScenario[] = [

  {

    id: "overflow",

    label: "No-answer overflow",

    summary:

      "Your main line rings first. After 15–20 seconds without a response, the call transfers automatically to Effiroad — no interruption to daytime operations.",

    recommended: true,

  },

  {

    id: "busy_and_after_hours",

    label: "Busy line forwarding",

    summary:

      "Incoming calls route to Effiroad when your line is already engaged. Configure after-hours windows separately under Answer Hours.",

  },

];



export const FORWARDING_PROVIDERS: ForwardingProvider[] = [

  {

    id: "dialpad",

    label: "Jobber Phone · Dialpad",

    hint: "Includes Jobber Phone, ServiceTitan Phones Pro, and all Dialpad-based business phone systems",

    recommended: true,

  },

  {

    id: "carrier",

    label: "Mobile carrier",

    hint: "Verizon, AT&T, T-Mobile — activation codes vary by carrier",

  },

  {

    id: "voip",

    label: "Business VoIP",

    hint: "RingCentral, OpenPhone, 3CX, and similar hosted platforms",

  },

  {

    id: "other",

    label: "Other / Custom",

    hint: "PBX systems, hosted voice, or custom phone configurations",

  },

];



export const FORWARDING_TROUBLESHOOTING: Record<ForwardingProviderId, string[]> = {

  dialpad: [

    "Confirm Call Forwarding is turned on under Dialpad app → Settings → Call Forwarding.",

    "Double-check that the forwarding number is entered correctly.",

    "Confirm your Dialpad account status is active.",

  ],

  carrier: [

    "Re-dial using the exact carrier-specific code from the steps above (Verizon: My Verizon app, not a star code; AT&T/T-Mobile: **61*...) rather than a generic star code — *72/*21 are not valid activation codes for these carriers.",

    "Make sure you included the leading 1 before the number (US).",

    "Check with your carrier whether call forwarding is blocked on your plan.",

  ],

  voip: [

    "Confirm call forwarding is enabled in your VoIP provider's portal.",

    "Check that your SIP trunk settings are configured correctly.",

    "Contact your VoIP provider's support team for help.",

  ],

  other: [

    "Check your phone manufacturer's manual for the call forwarding code.",

    "Make a test call to confirm the connection goes through.",

    "Rule out network or line issues with your carrier.",

  ],

};



export const FORWARDING_TROUBLESHOOTING_SWITCH_NOTE: Record<ForwardingProviderId, string> = {

  dialpad: "If forwarding still fails, try your mobile carrier's native call forwarding instead.",

  carrier: "Consider switching to Dialpad for app-based forwarding.",

  voip: "For simplest setup, we recommend Dialpad.",

  other: "Can't get it working? Dialpad is our most reliable option.",

};



export const FORWARDING_TROUBLESHOOTING_FALLBACK =

  "Still not working? We recommend switching to Dialpad — it's the most reliable option and takes under 2 minutes to set up.";



export function getForwardingGuideSteps(

  provider: ForwardingProviderId,

  scenario: LegacyForwardingScenarioId,

  effiroadNumber: string,

): string[] {

  const activeScenario = normalizeForwardingScenario(scenario);

  const num = effiroadNumber || "(your Effiroad number)";

  const dialNum = num.replace(/\D/g, "").slice(-10);

  const tenDigit = dialNum || "10-digit number";



  if (provider === "dialpad") {

    if (activeScenario === "overflow") {

      return [

        "In Dialpad, navigate to Settings (⚙) → Phone Numbers → select your primary line → Edit.",

        "Under Call Handling → When Unanswered, enable Forward to external number.",

        `Enter ${num} as the external destination. Set the ring timeout to 20 seconds, then Save.`,

        "Jobber Phone: navigate to Settings → Phone → Call Routing — the same configuration fields apply.",

        "Verify the setup by dialing your shop number from a separate device and allowing it to ring past 20 seconds.",

      ];

    }

    return [

      "In Dialpad, navigate to Settings (⚙) → Phone Numbers → select your primary line → Edit.",

      "Configure When Unanswered → Forward to external number, and When Busy → the same external number.",

      `Enter ${num} as the destination for both rules, then Save.`,

      "Verify each condition independently: no-answer during business hours, line-busy, and after-hours.",

    ];

  }



  if (provider === "carrier") {

    if (activeScenario === "overflow") {

      return [

        `Verizon — No-answer forwarding is managed via the My Verizon app: Account → Manage Device → Call Forwarding → When Unanswered → enter ${num} → Save. Star codes (*71/*72) on Verizon forward all calls unconditionally, not just unanswered ones.`,

        `AT&T — Dial **61*+1${tenDigit}*11*20# and press Call (20 = ring duration in seconds). To deactivate: ##61# → Call.`,

        `T-Mobile — Dial **61*+1${tenDigit}# and press Call. To deactivate: ##61# → Call.`,

        "Important: iPhone's built-in Call Forwarding (Settings → Phone → Call Forwarding) routes all incoming calls unconditionally — it cannot be limited to unanswered calls only. Use the carrier codes above for no-answer-only routing.",

        "After applying the configuration, dial your main number from a second device and allow it to ring to confirm Effiroad engages.",

      ];

    }

    return [

      `Verizon — Configure via My Verizon app: Account → Manage Device → Call Forwarding → set both When Unanswered and When Busy to ${num} → Save.`,

      `AT&T — No-answer: dial **61*+1${tenDigit}*11*20# → Call. To deactivate: ##61# → Call.`,

      `T-Mobile — No-answer: dial **61*+1${tenDigit}# → Call. To deactivate: ##61# → Call.`,

      "Verify routing from a separate device during your configured after-hours window.",

    ];

  }



  if (provider === "voip") {

    if (activeScenario === "overflow") {

      return [

        "RingCentral: Admin Portal → Phone System → Users → [select user] → Call Handling & Forwarding → Add Rule → Forward to External Number.",

        "OpenPhone: Settings → Phone Numbers → select your number → Call Routing → When Unanswered → Forward to External Number.",

        `Set ${num} as the external destination with a 20-second ring timeout, then save.`,

        "3CX and other platforms: locate Inbound Rules or Time Conditions and configure the no-answer action to forward to an external number.",

      ];

    }

    return [

      "RingCentral / OpenPhone: create both a no-answer rule and a busy rule, each pointing to the same external destination.",

      `External destination for both rules: ${num}.`,

      "3CX and other platforms: configure overflow handling under Call Queues or Ring Groups to route to an external number.",

      "Verify each forwarding condition — no-answer, busy, and after-hours — from your public-facing shop number.",

    ];

  }



  return [

    "Locate call forwarding or external routing in your phone system's admin panel.",

    `Set the forwarding destination to ${num}.`,

    activeScenario === "busy_and_after_hours"

      ? "Enable both no-answer and busy forwarding where supported by your system."

      : "Enable no-answer forwarding.",

    "After-hours windows are managed under Integrations → Answer Hours.",

    "Verify by dialing the number your customers use and confirming Effiroad answers.",

  ];

}
