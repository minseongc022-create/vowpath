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
      "On a computer, open https://voice.google.com/settings and sign in to the Google account that owns your shop GV number.",
      "Calls tab — prep before forwarding (verified with Ruby, Smith.ai, Jobber):",
      "  • Turn OFF Screen calls (callers must hear Effiroad immediately — no extra prompts).",
      "  • Turn OFF “Show my Google Voice number as caller ID when forwarding calls” (Effiroad needs the real caller number).",
      "  • Under My Devices: turn OFF ring on personal cell/tablets during overflow setup — extra rings can block forwarding.",
      "Linked numbers: click New linked number → enter Effiroad number → Send code.",
      `Enter ${e164} — include +1 and area code.`,
      "Verification: choose phone call (not text if possible). Effiroad must receive the 6-digit code — run the test-call step after saving.",
      "Toggle ON forwarding to Effiroad under Calls → Linked numbers. Only one forward destination should be active.",
      "Limitation: Google Voice often cannot ring your cell first, then Effiroad after 20 sec — for true overflow, use AT&T/T-Mobile/Verizon **61*/*71 on the cell that rings, or Effiroad-as-main-line.",
      "If you use Jobber-style linking (GV → dedicated AI number): enable a short answer delay on the receiving side so the greeting is captured cleanly.",
      "Test: call your Google Voice number from another phone and let it route to Effiroad.",
    ];
  }

  if (provider === "dialpad") {
    return [
      "Path A — ServiceTitan Phones Pro / Main Line (Avoca & Smith.ai verified):",
      "Open https://dialpad.com/officesettings → Admin Settings → Main Line.",
      "Scroll to Business Hours & Call Routing → Edit Call Routing.",
      "Under Fallback Options (or Other routing options): choose “To a team member, room phone, or external number”.",
      `Enter ${e164} and press Enter — wait for “Changes saved”.`,
      "Closed Hours Routing: repeat the same external number for after-hours overflow.",
      "If Fallback is missing on Main Line, your account routes via Contact Center — go to Admin Settings → Contact Center → default center → same Fallback + Closed Hours steps.",
      "Path B — per-user / Jobber Phone (Smith.ai verified):",
      "Open https://dialpad.com/app → Settings (gear) → Office Settings → Users → shop line.",
      "Answering rules / Call handling → When call is not answered → Forward to external number.",
      `Paste ${e164} (+1). Set ring duration ~20 seconds if available → Save.`,
      "Jobber Phone shortcut: Jobber → Settings → Phone → your line → Unanswered → Forward to external → paste Effiroad number.",
      "Path C — Department line: Admin Settings → Departments → Business Hours & Call Handling → Edit Call Routing → Other routing → external number (set both open and closed hours if split).",
      "Enable caller ID pass-through so Effiroad sees the original caller, not your Dialpad line.",
      "If “external number” is greyed out: contact Dialpad support and ask them to enable forward-to-external on your account.",
      "Test: call your shop number from another phone and let it ring without answering.",
    ];
  }

  if (provider === "att") {
    const code = `**61*1${tenDigit}*11*20#`;
    const iphone10 = `*61*1${tenDigit}*11*10#`;
    const unreachable = `*62*1${tenDigit}#`;
    const busy = `*67*1${tenDigit}#`;
    const alt = `**61*1${tenDigit}#`;
    return [
      "Use the AT&T cell phone that receives your shop's customer calls (includes Cricket, Straight Talk on AT&T network).",
      "Do NOT use *21* — that forwards every call. Use conditional codes below so your phone rings first.",
      "Primary — no answer after ~20 seconds (GSM standard):",
      `  Dial exactly: ${code}`,
      "Press Call and wait for a success tone or confirmation text from AT&T.",
      "If that errors, try shorter code (carrier default ring time):",
      `  ${alt}`,
      "iPhone / AT&T alternate codes (Smith.ai verified — run each that you need):",
      `  No answer ~10 sec: ${iphone10}`,
      `  Unreachable (phone off / no signal): ${unreachable}`,
      `  Busy line only: ${busy}`,
      "To remove: ##61# (no-answer), ##62# (unreachable), ##67# (busy), or #21# if you accidentally used forward-all.",
      "If codes fail: call AT&T (800) 331-0500 — ask to enable conditional call forwarding on your line.",
      FORWARDING_IPHONE_WARNING,
      `Test: from a different phone, call your shop number and let it ring ~20 seconds — Effiroad should answer.`,
    ];
  }

  if (provider === "tmobile") {
    const code = `**61*1${tenDigit}**20#`;
    const alt = `**61*1${tenDigit}#`;
    const busy = `*67*${tenDigit}#`;
    const unreachable = `*62*${tenDigit}#`;
    return [
      "Use the T-Mobile phone that receives your shop's customer calls (includes Metro, Mint on T-Mobile network).",
      "Do NOT use **21* — that forwards every call. Use conditional codes so your phone rings first.",
      "Primary — no answer after ~20 seconds:",
      `  Dial exactly: ${code}`,
      `If that errors, try: ${alt} (carrier default ring time)`,
      "Optional extras (T-Mobile GSM — only if you want busy/unreachable coverage too):",
      `  Busy only: ${busy}`,
      `  Unreachable only: ${unreachable}`,
      "Press Call and wait for a confirmation tone or text from T-Mobile.",
      "To remove: ##61# (no-answer), ##67# (busy), ##62# (unreachable), or ##004# to clear all conditional rules.",
      "More options: https://support.t-mobile.com/docs/DOC-4041",
      FORWARDING_IPHONE_WARNING,
      "Test: call your shop number from another phone and do not answer.",
    ];
  }

  if (provider === "xfinity") {
    return [
      "Use the Xfinity Mobile phone that receives your shop's customer calls (Xfinity official + Smith.ai verified).",
      "Do NOT use *72 — that forwards every call without ringing your phone.",
      `On the Xfinity phone, dial *71${tenDigit} then press Call.`,
      "Wait for confirmation tone or message. Activation only works from the Xfinity device — not web or another phone.",
      "To remove: dial *73 and press Call.",
      FORWARDING_IPHONE_WARNING,
      "Note: Xfinity does not let you choose ring count — about 5 rings before forward is normal.",
      "Test: call your shop number from another phone and let it ring without answering.",
    ];
  }

  if (provider === "ringcentral") {
    return [
      "Log in to RingCentral Admin Portal (Smith.ai verified overflow pattern):",
      "Go to Phone System → Users → the user/line that receives shop calls → Call Handling & Forwarding.",
      "Set your cell to ring first — about 5–8 seconds (never more than 10 sec or callers hang up).",
      "Under Phones Will Ring: choose Sequentially — not Simultaneously.",
      `Then add external forward to ${e164} when unanswered or after sequential ring fails.`,
      "Enable caller ID pass-through so Effiroad sees the original caller number.",
      "If Effiroad transfers calls back to you, use a different number than your main RingCentral line (avoids loops).",
      "RingCentral changes their UI often — search support.ringcentral.com for “call forwarding external number” if menus differ.",
      "Test: call your RingCentral shop number and do not answer.",
    ];
  }

  if (provider === "grasshopper") {
    return [
      "Log in at grasshopper.com (Smith.ai verified):",
      "Numbers → confirm which extension your main shop number routes to.",
      "Extensions → Edit that extension → Add a forwarding number.",
      `Enter ${e164} as forwarding number.`,
      "How should Grasshopper handle this number: “Calls will connect to you as soon as you pick up” — NOT press-1 screening.",
      "Set Caller ID to the caller’s number (not your Grasshopper line).",
      "Toggle the Effiroad forwarding line ON → Save.",
      "Pre-2011 accounts: Settings → Extensions → Call Forwarding → Add number (same options).",
      "Test: call your Grasshopper number and let it route to Effiroad.",
    ];
  }

  return [
    "Method A — star code (Verizon official — Smith.ai verified):",
    `On the shop phone, open Phone and dial *71${tenDigit} then press Call.`,
    "Wait for confirmation tone. *71 covers busy AND no-answer — your phone rings first.",
    "Do NOT use *72 — that forwards every call unconditionally.",
    "To remove: dial *73 and press Call.",
    "Method B — My Verizon web (When unanswered only):",
    "Open m.vzw.com/callforwarding → sign in → select your line → Call forwarding → Manage.",
    `Enter ${e164} under When unanswered / No answer → Update Call Forwarding Status.`,
    "Method C — My Verizon app:",
    "Account → your line → Manage call forwarding → When unanswered → paste Effiroad number → Save.",
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
