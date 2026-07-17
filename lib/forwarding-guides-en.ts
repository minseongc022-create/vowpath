/** Call-forwarding setup — verified US paths. */

export type ForwardingScenarioId = "overflow";

export type LegacyForwardingScenarioId = ForwardingScenarioId | "after_hours" | "busy_and_after_hours";

export type ForwardingProviderId =
  | "effiroad_main"
  | "dialpad"
  | "google_voice"
  | "att"
  | "tmobile"
  | "verizon"
  | "xfinity"
  | "ringcentral"
  | "grasshopper";

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
    value === "verizon" ||
    value === "xfinity" ||
    value === "ringcentral" ||
    value === "grasshopper"
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
  "No carrier forwarding needed. Put your Effiroad number everywhere customers look (Google, website, trucks). During your Answer Hours the AI picks up; outside them the call rings your own phone so you can take it live — and if you miss it, the AI still catches it. Set no Answer Hours and the AI simply covers you 24/7.";

export const FORWARDING_AFTER_HOURS_NOTE =
  "Night and weekend coverage: set Answer Hours in Settings → Effiroad answers when your schedule is closed (no extra carrier codes needed).";

export const FORWARDING_IPHONE_WARNING =
  "Do not use iPhone Settings → Phone → Call Forwarding — that forwards every call unconditionally. Use the steps below instead.";

export const FORWARDING_EFFIROAD_MAIN_FEATURES = [
  "No carrier star codes, no Dialpad admin — customers dial your Effiroad number directly.",
  "You control Answer Hours: AI answers when you are closed; during open hours you can still take live calls on your cell.",
  "Works on every phone plan — prepaid, business, Google Voice limits do not apply.",
  "Update Google Business Profile, website, and truck signage once — then test by calling the Effiroad number.",
] as const;

export const FORWARDING_PROVIDER_NOTE =
  "Steps verified for Effiroad dedicated line, Google Voice, Dialpad, RingCentral, Grasshopper, AT&T, T-Mobile, Verizon, and Xfinity Mobile.";

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
  {
    id: "xfinity",
    label: "Xfinity Mobile",
    hint: "Comcast Xfinity cell — *71 from the phone (Verizon-network codes)",
  },
  {
    id: "ringcentral",
    label: "RingCentral",
    hint: "RingCentral admin — sequential ring then external number",
  },
  {
    id: "grasshopper",
    label: "Grasshopper",
    hint: "Grasshopper extension — add Effiroad as forwarding number",
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
    "Forwarding must be When unanswered / No answer / Fallback — not Always forward.",
    "ServiceTitan Phones Pro: set Fallback Options AND Closed Hours Routing in Dialpad Main Line.",
    "If Main Line has no Fallback menu, use Contact Center → default center → same routing.",
    "Paste the full Effiroad number including +1; enable caller ID pass-through (original caller, not your line).",
    "Save, wait for “Changes saved”, then test after 1 minute.",
  ],
  google_voice: [
    "Use a desktop browser at voice.google.com/settings — the mobile app hides some routing options.",
    "Before forwarding: turn OFF Screen calls and “Show my Google Voice number as caller ID when forwarding”.",
    "Turn OFF ring on extra linked devices under My Devices — they can steal overflow tests.",
    "Add Effiroad under Linked numbers; verify via phone call (Effiroad must receive the code).",
    "Google Voice cannot always ring your cell first then Effiroad — use cell carrier **61* / *71 or Effiroad-as-main-line.",
    "Test from a non-GV phone calling your Google Voice number.",
  ],
  att: [
    "Dial the code from the AT&T phone itself — not a different device.",
    "Use conditional codes (**61*, *61*, *62*, *67*) — never *21* (forwards every call).",
    "Wait for a success tone or confirmation text before testing.",
    "If the code fails, your plan may block forwarding — call AT&T (800) 331-0500 and ask to enable conditional call forwarding.",
    "Turn off with ##61# (no-answer), ##62# (unreachable), or ##67# (busy) if you need to reset.",
  ],
  tmobile: [
    "Dial from the T-Mobile line that receives customer calls.",
    "Use **61* / *61* for no-answer — never **21* (forwards every call).",
    "Wait for the confirmation tone or text message.",
    "Some prepaid plans block forwarding — contact T-Mobile to enable it.",
    "Turn off with ##61# or ##004# to clear all conditional rules.",
  ],
  verizon: [
    "Try *71 + Effiroad number first (official conditional code) — then My Verizon if you prefer the app.",
    "Use When unanswered / No answer — never *72 (forwards every call).",
    "Web: m.vzw.com/callforwarding → When unanswered only.",
    "Prepaid: dial *71 from the phone — app often cannot set forwarding.",
    "Turn off with *73 before retrying if settings conflict.",
    "iPhone: disable Live Voicemail; do not use Settings → Call Forwarding.",
    `Still blocked? Call Verizon 800-922-0204 — ask to enable conditional call forwarding.`,
  ],
  xfinity: [
    "Dial *71 + Effiroad number from the Xfinity Mobile phone only — cannot activate from web.",
    "Never *72 (forwards every call without ringing your phone).",
    "Turn off with *73 before retrying.",
    "iPhone: disable Live Voicemail so voicemail does not beat the forward.",
    "If forwarding still fails after all steps: switch to Effiroad dedicated number (no codes needed).",
  ],
  ringcentral: [
    "Use Admin Portal → call handling → ring your cell sequentially ~5–8 sec, then external Effiroad number.",
    "Choose Sequentially — not Simultaneously — under Phones Will Ring.",
    "Enable caller ID pass-through (original caller, not your RingCentral line).",
    "Transfer-back number must differ from your main RingCentral line to avoid loops.",
  ],
  grasshopper: [
    "Extensions → Edit → Add forwarding number → Effiroad number.",
    "Select “Calls will connect to you as soon as you pick up” — not press-1 screening.",
    "Set Caller ID to the caller’s number, not your Grasshopper line.",
    "Toggle the Effiroad line ON and Save.",
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
  xfinity: "Xfinity only allows *71 from the mobile device — no web portal. Still stuck? Use Effiroad dedicated number.",
  ringcentral: "RingCentral UI changed? See support.ringcentral.com call forwarding — or use Effiroad dedicated number.",
  grasshopper: "Call screening (“press 1”)? Set direct connect on the forwarding number in Grasshopper.",
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
  const national =
    tenDigit.length === 10
      ? `(${tenDigit.slice(0, 3)}) ${tenDigit.slice(3, 6)}-${tenDigit.slice(6)}`
      : num;

  if (provider === "effiroad_main") {
    return [
      `Copy ${national} — use the Copy button above.`,
      "Open Google Business Profile → Edit profile → Contact → Phone → paste → Save.",
      "Put the same number on your website, Facebook, and new truck signs.",
      `Test: call ${national} from another phone. Effiroad should answer.`,
    ];
  }

  if (provider === "google_voice") {
    return [
      "On a computer, open voice.google.com/settings.",
      "Turn OFF Screen calls. Turn OFF caller-ID masking when forwarding.",
      `Add linked number → paste ${e164} → verify with a phone call.`,
      "Turn forwarding ON. Test by calling your Google Voice number.",
    ];
  }

  if (provider === "dialpad") {
    return [
      "Open dialpad.com/officesettings → Admin → Main Line.",
      "Business Hours & Call Routing → Edit → Fallback → external number.",
      `Paste ${e164} → Save. Repeat for Closed Hours if shown.`,
      "Test: call your shop number. Do not answer. Effiroad should pick up.",
    ];
  }

  if (provider === "att") {
    const code = `**61*1${tenDigit}*11*20#`;
    return [
      "Use the AT&T phone that gets customer calls.",
      `Tap Dial code below — or dial ${code} yourself.`,
      "Wait for a success tone or text from AT&T.",
      "Test: call your shop number from another phone. Let it ring ~20 seconds.",
    ];
  }

  if (provider === "tmobile") {
    const code = `**61*1${tenDigit}**20#`;
    return [
      "Use the T-Mobile phone that gets customer calls.",
      `Tap Dial code below — or dial ${code} yourself.`,
      "Wait for a confirmation tone or text from T-Mobile.",
      "Test: call your shop number from another phone. Do not answer.",
    ];
  }

  if (provider === "xfinity") {
    return [
      "Use the Xfinity Mobile phone that gets customer calls.",
      `Dial *71${tenDigit} on that phone → press Call.`,
      "Wait for confirmation. Do not use *72 (forwards every call).",
      "Test: call your shop number from another phone. Let it ring.",
    ];
  }

  if (provider === "ringcentral") {
    return [
      "Open RingCentral Admin → Phone System → your shop user.",
      "Call Handling → ring your cell first (~5–8 sec) → then external number.",
      `Paste ${e164}. Choose Sequentially — not Simultaneously.`,
      "Test: call your shop number. Do not answer.",
    ];
  }

  if (provider === "grasshopper") {
    return [
      "Log in at grasshopper.com → Extensions → your main extension.",
      "Add forwarding number → paste Effiroad number.",
      "Pick direct connect — no press-1 screening. Save.",
      "Test: call your Grasshopper number. Let it route to Effiroad.",
    ];
  }

  return [
    "Use the Verizon phone that gets customer calls.",
    `Tap Dial *71 below — or dial *71${tenDigit} on that phone.`,
    "Wait for confirmation. Never use *72 (forwards every call).",
    "Test: call your shop number from another phone. Let it ring ~25 seconds.",
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
