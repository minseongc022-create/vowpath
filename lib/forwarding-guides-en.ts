/** Call-forwarding setup — verified US paths. */

export type ForwardingScenarioId = "overflow";

export type LegacyForwardingScenarioId = ForwardingScenarioId | "after_hours" | "busy_and_after_hours";

export type ForwardingProviderId =
  | "effiroad_main"
  | "dialpad"
  | "google_voice"
  | "att"
  | "tmobile"
  | "verizon";

export type ForwardingProvider = {
  id: ForwardingProviderId;
  label: string;
  hint: string;
  recommended?: boolean;
};

export function isDirectEffiroadLineProvider(provider: ForwardingProviderId): boolean {
  return provider === "effiroad_main";
}

export function normalizeForwardingScenario(
  scenario?: LegacyForwardingScenarioId | string,
): ForwardingScenarioId {
  return "overflow";
}

export function normalizeForwardingProvider(value?: string | null): ForwardingProviderId {
  if (
    value === "effiroad_main" ||
    value === "dialpad" ||
    value === "google_voice" ||
    value === "att" ||
    value === "tmobile" ||
    value === "verizon"
  ) {
    return value;
  }
  if (value === "carrier") return "att";
  if (value === "voip" || value === "other") return "dialpad";
  return "effiroad_main";
}

export const FORWARDING_OVERFLOW_SUMMARY =
  "Your shop number rings first. If nobody answers in about 20 seconds, the call forwards to Effiroad. You can still pick up live calls — only missed rings go to us.";

export const FORWARDING_EFFIROAD_MAIN_SUMMARY =
  "No carrier forwarding needed. Put your Effiroad number everywhere customers look (Google, website, trucks). They call it directly — Effiroad answers per your Answer Hours.";

export const FORWARDING_AFTER_HOURS_NOTE =
  "Night and weekend coverage: set Answer Hours in Settings → Effiroad answers when your schedule is closed (no extra carrier codes needed).";

export const FORWARDING_IPHONE_WARNING =
  "Do not use iPhone Settings → Phone → Call Forwarding — that forwards every call unconditionally. Use the steps below instead.";

export const FORWARDING_PROVIDER_NOTE =
  "Steps verified for Effiroad-as-main-line, Google Voice, Dialpad, AT&T, T-Mobile, and Verizon. Prepaid or locked-down business lines may need carrier support.";

export const FORWARDING_PROVIDERS: ForwardingProvider[] = [
  {
    id: "effiroad_main",
    label: "Use Effiroad number as main line",
    hint: "Simplest — no forwarding codes. Update Google, website, and truck signage",
    recommended: true,
  },
  {
    id: "dialpad",
    label: "Jobber Phone · Dialpad",
    hint: "Already on Jobber Phone or Dialpad — unanswered → external number",
  },
  {
    id: "google_voice",
    label: "Google Voice",
    hint: "Shop line is a Google Voice number — forward in voice.google.com",
  },
  {
    id: "att",
    label: "AT&T Wireless",
    hint: "Shop cell on AT&T (or Cricket, Straight Talk) — **61* code from your phone",
  },
  {
    id: "tmobile",
    label: "T-Mobile",
    hint: "Shop cell on T-Mobile (Metro, Mint, etc.)",
  },
  {
    id: "verizon",
    label: "Verizon Wireless",
    hint: "Shop cell on Verizon — *71 or My Verizon app",
  },
];

export const FORWARDING_TROUBLESHOOTING: Record<ForwardingProviderId, string[]> = {
  effiroad_main: [
    "Google Business Profile can take 24–48 hours to show the new number publicly.",
    "Test by calling the Effiroad number — not your old shop cell.",
    "Keep your old number on personal contacts only until marketing is updated.",
    "Answer Hours in Settings still controls when Effiroad picks up vs. you.",
  ],
  dialpad: [
    "Confirm you edited the correct office line (the number customers dial).",
    "Forwarding must be When unanswered / No answer — not Always forward.",
    "Paste the full Effiroad number including +1.",
    "Save, then wait 1 minute before testing.",
  ],
  google_voice: [
    "Use a desktop browser at voice.google.com — the mobile app hides some routing options.",
    "If Effiroad cannot be added as a linked number, forward from your cell carrier instead (AT&T/T-Mobile/Verizon above).",
    "Turn off conflicting ring-all-linked-devices if calls never reach Effiroad.",
    "Test from a non-GV phone calling your Google Voice number.",
  ],
  att: [
    "Dial the code from the AT&T phone itself — not a different device.",
    "Wait for a success tone or confirmation text before testing.",
    "If the code fails, your plan may block forwarding — call AT&T and ask to enable conditional call forwarding.",
    "Turn off with ##61# if you need to reset.",
  ],
  tmobile: [
    "Dial from the T-Mobile line that receives customer calls.",
    "Wait for the confirmation tone or text message.",
    "Some prepaid plans block forwarding — contact T-Mobile to enable it.",
    "Turn off with ##61# or ##004# to clear all conditional rules.",
  ],
  verizon: [
    "Try *71 + Effiroad number first (official conditional code) — then My Verizon if you prefer the app.",
    "Use When unanswered / No answer — never *72 (forwards every call).",
    "Prepaid: dial *71 from the phone — app often cannot set forwarding.",
    "Turn off with *73 before retrying if settings conflict.",
    "iPhone: disable Live Voicemail; do not use Settings → Call Forwarding.",
    `Still blocked? Call Verizon 800-922-0204 — ask to enable conditional call forwarding.`,
  ],
};

export const FORWARDING_TROUBLESHOOTING_SWITCH_NOTE: Record<ForwardingProviderId, string> = {
  effiroad_main:
    "Want to keep your old number ringing your phone? Switch to AT&T, T-Mobile, Verizon, or Dialpad above.",
  dialpad: "Still stuck? Many shops put their main line on a cell — try AT&T or T-Mobile steps on that phone.",
  google_voice:
    "GV linking failed? Your cell may be easier — pick AT&T, T-Mobile, or Verizon. Or switch to Effiroad-as-main-line.",
  att: "On Dialpad or Jobber Phone instead? Switch provider above for app-based setup.",
  tmobile: "On Dialpad or Jobber Phone instead? Switch provider above.",
  verizon: "Prepaid or business line? Expand “If something blocks you” below for alternate paths.",
};

export const FORWARDING_TROUBLESHOOTING_FALLBACK =
  "Email support@effiroad.com with your carrier name — we will walk through live setup.";

export function getForwardingGuideSteps(
  provider: ForwardingProviderId,
  _scenario: LegacyForwardingScenarioId,
  effiroadNumber: string,
): string[] {
  const num = effiroadNumber || "(your Effiroad number)";
  const tenDigit = num.replace(/\D/g, "").slice(-10) || "10-digit Effiroad number";
  const e164 = tenDigit.length === 10 ? `+1${tenDigit}` : num;

  if (provider === "effiroad_main") {
    return [
      `Copy your Effiroad number: ${e164} (use the Copy button above).`,
      "Google Business Profile: business.google.com → Edit profile → Contact → Phone → paste Effiroad number → Save.",
      "Website & Facebook: replace the old shop number in header, footer, and Contact page.",
      "Truck wraps, yard signs, business cards — use Effiroad number on new prints (old materials can finish their run).",
      "Jobber (optional): Settings → Company settings → Company phone → Effiroad number.",
      "Angi, Yelp, Nextdoor — update listing phone if you use those lead sources.",
      "No carrier codes or forwarding rules — customers dial Effiroad directly.",
      FORWARDING_AFTER_HOURS_NOTE,
      `Test: from another phone, call ${e164} directly — Effiroad should answer (per your Answer Hours).`,
    ];
  }

  if (provider === "google_voice") {
    return [
      "On a computer, open https://voice.google.com and sign in to the Google account that owns your shop GV number.",
      "Click the gear icon (Settings) → Calls (left menu).",
      "Under Call forwarding / Linked numbers: add a forwarding destination when calls are not answered.",
      `Enter ${e164} as the external forward destination (+1 and area code).`,
      "If Google asks to verify the number: Effiroad must receive that verification call — run the test call step after saving.",
      "Disable extra linked devices that steal calls if routing fails (Settings → Calls → Manage linked devices).",
      "Note: Google Voice cannot always ring your cell first then Effiroad — many shops use Effiroad-as-main-line or cell carrier **61* instead.",
      "Test: call your Google Voice number from another phone and let it route to Effiroad.",
    ];
  }

  if (provider === "dialpad") {
    return [
      "Open https://dialpad.com/app and sign in as an admin (or the user whose line receives shop calls).",
      "Click the gear icon (Settings) in the left sidebar.",
      "Go to Office Settings → Users → click the user/line that receives your shop calls.",
      "Open Answering rules or Call handling for that user.",
      "Under When call is not answered (or Unanswered), choose Forward to external number.",
      `Enter ${e164} as the external number (include +1).`,
      "Set ring duration to about 20 seconds if the field exists, then click Save.",
      "Jobber Phone: Jobber → Settings → Phone → select your line → same Unanswered → Forward to external → paste the Effiroad number → Save.",
      "Test: call your shop number from another phone and let it ring without answering.",
    ];
  }

  if (provider === "att") {
    const code = `**61*1${tenDigit}*11*20#`;
    return [
      "Use the AT&T cell phone that receives your shop's customer calls.",
      "Open the Phone app.",
      `Dial exactly: ${code}`,
      "Press the green Call button (do not add spaces).",
      "Wait for a success tone or a confirmation text from AT&T.",
      "To remove later: dial ##61# and press Call.",
      FORWARDING_IPHONE_WARNING,
      `Test: from a different phone, call your shop number and let it ring ~20 seconds — Effiroad should answer.`,
    ];
  }

  if (provider === "tmobile") {
    const code = `**61*1${tenDigit}#`;
    return [
      "Use the T-Mobile phone that receives your shop's customer calls (includes Metro, Mint on T-Mobile network).",
      "Open the Phone app.",
      `Dial exactly: ${code}`,
      "Press Call and wait for a confirmation tone or text from T-Mobile.",
      "To remove later: dial ##61# and press Call (or ##004# to clear all conditional forwarding).",
      FORWARDING_IPHONE_WARNING,
      "Test: call your shop number from another phone and do not answer.",
    ];
  }

  return [
    "Method A — star code (works on most Verizon Wireless lines, including many prepaid):",
    `On the shop phone, open Phone and dial *71${tenDigit} then press Call.`,
    "Wait for confirmation tone. To remove later: dial *73 and press Call.",
    "Method B — My Verizon app (if you prefer the app or *71 fails):",
    "Install/open My Verizon → Account (bottom) → select your mobile line.",
    "Manage device / Services → Call forwarding → When unanswered or No answer.",
    "Do not choose Forward all calls.",
    `Enter +1${tenDigit} as destination → Save → wait one minute.`,
    FORWARDING_IPHONE_WARNING,
    "iPhone: Settings → Phone → Live Voicemail → OFF (stops voicemail from beating the forward).",
    "Test: call your shop number from another phone and let it ring 25+ seconds.",
  ];
}

/** @deprecated Only overflow is supported — kept for type compat */
export const FORWARDING_SCENARIOS = [
  {
    id: "overflow" as const,
    label: "No-answer overflow",
    summary: FORWARDING_OVERFLOW_SUMMARY,
    recommended: true,
  },
];
