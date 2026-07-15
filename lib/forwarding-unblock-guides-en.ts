import type { ForwardingProviderId } from "./forwarding-guides-en";

export type ForwardingUnblockGuide = {
  id: string;
  problem: string;
  steps: string[];
};

const VERIZON_SUPPORT = "800-922-0204";
const ATT_SUPPORT = "611 from your AT&T phone";
const ATT_SUPPORT_TOLL = "800-331-0500";
const TMO_SUPPORT = "611 from your T-Mobile phone";

export function getForwardingUnblockGuides(
  provider: ForwardingProviderId,
  tenDigitEffiroad: string,
): ForwardingUnblockGuide[] {
  const td = tenDigitEffiroad.replace(/\D/g, "").slice(-10);

  if (provider === "effiroad_main") {
    return [
      {
        id: "main-gbp-delay",
        problem: "Google still shows my old number",
        steps: [
          "Google Business Profile updates can take 24–48 hours to appear on Search and Maps.",
          "Confirm you saved the Effiroad number under Contact → Phone.",
          "Meanwhile, test by calling the Effiroad number directly — that works immediately.",
        ],
      },
      {
        id: "main-keep-old",
        problem: "I still want my old cell to ring sometimes",
        steps: [
          "Switch provider above to AT&T, T-Mobile, Verizon, or Dialpad for overflow forwarding.",
          "Or port your old number to Effiroad later (contact support).",
        ],
      },
    ];
  }

  if (provider === "google_voice") {
    return [
      {
        id: "gv-verify-fail",
        problem: "Google cannot verify the Effiroad number",
        steps: [
          "Turn OFF active forwarding before requesting a verification code — Effiroad must receive Google's robocall directly.",
          "Choose phone-call verification (not text) when Google offers both.",
          "Start the test call step — Effiroad must receive Google's verification robocall.",
          "If verification never works: use Effiroad-as-main-line (no GV forward) or cell carrier **61* / *71.",
        ],
      },
      {
        id: "gv-rings-cell",
        problem: "My cell answers instead of Effiroad",
        steps: [
          "voice.google.com → Settings → Calls → My Devices — disable ring on personal cell for overflow tests.",
          "Turn OFF “Show my Google Voice number as caller ID when forwarding”.",
          "Or switch to Effiroad-as-main-line so customers skip GV entirely.",
        ],
      },
      {
        id: "gv-no-unanswered",
        problem: "No unanswered-forward option in Google Voice",
        steps: [
          "Use desktop browser at voice.google.com/settings — not only the mobile app.",
          "Add Effiroad under Linked numbers and toggle forwarding ON under Calls.",
          "If still missing: forward from the cell that rings when GV calls (AT&T/T-Mobile/Verizon paths).",
        ],
      },
      {
        id: "gv-screen-calls",
        problem: "Callers hear screening or extra prompts before Effiroad",
        steps: [
          "Settings → Calls → turn OFF Screen calls.",
          "Turn OFF call announcement / call screening on any linked device.",
          "Ruby & Smith.ai: extra GV prompts delay AI pickup — disable all pre-connection menus.",
        ],
      },
      {
        id: "gv-overflow-limit",
        problem: "GV cannot ring my phone first, then Effiroad after 20 sec",
        steps: [
          "Google Voice does not reliably support delayed overflow to an external AI line.",
          "Use Effiroad-as-main-line, OR set **61* / *71 on the cell that rings when customers call.",
          "Jobber users: link GV to a dedicated number only when you accept GV's hand-off limits.",
        ],
      },
    ];
  }

  if (provider === "verizon") {
    const star71 = `*71${td}`;
    return [
      {
        id: "vz-no-app-menu",
        problem: "My Verizon app has no Call forwarding menu",
        steps: [
          `On the shop phone, dial ${star71} and press Call (Verizon official conditional code).`,
          "Wait for confirmation tone, then test from another phone.",
          `Still nothing? Dial *73 to reset, then try ${star71} again.`,
          `Prepaid line: app often cannot set forwarding — use ${star71} only.`,
          `Call Verizon ${VERIZON_SUPPORT} and say: "Enable conditional call forwarding (no answer) on my line."`,
        ],
      },
      {
        id: "vz-prepaid",
        problem: "Prepaid / Visible / Total Wireless",
        steps: [
          `Dial ${star71} from the prepaid phone — do not use My Verizon.`,
          "If fast busy: ask Verizon to enable Call Forwarding feature on the account.",
          "Turn off with *73 before retrying.",
        ],
      },
      {
        id: "vz-business",
        problem: "Business / company phone — options greyed out",
        steps: [
          "Ask your company Verizon admin to allow conditional forwarding for your line.",
          `Or admin sets When unanswered → +1${td} in Verizon Business portal.`,
          `Employee phone fallback: ${star71} if your admin allows star codes.`,
        ],
      },
      {
        id: "vz-voicemail-first",
        problem: "Voicemail answers before Effiroad",
        steps: [
          "iPhone: Settings → Phone → Live Voicemail → OFF.",
          "iPhone: Settings → Phone → Call Forwarding → must stay OFF (that forwards all calls).",
          `Re-apply: ${star71} or My Verizon → When unanswered only.`,
          "Test again — let it ring 25+ seconds without answering.",
        ],
      },
      {
        id: "vz-iphone",
        problem: "iPhone on Verizon — Settings path missing",
        steps: [
          "Verizon blocks iPhone Settings → Call Forwarding on many lines — this is normal.",
          `Use ${star71} or My Verizon instead.`,
          "Disable Live Voicemail (see above).",
        ],
      },
    ];
  }

  if (provider === "att") {
    const code = `**61*1${td}*11*20#`;
    const alt = `**61*1${td}#`;
    const iphone10 = `*61*1${td}*11*10#`;
    return [
      {
        id: "att-code-fails",
        problem: "Code gives error tone or fast busy",
        steps: [
          `Try shorter code: ${alt} (some plans ignore ring timer).`,
          `Try iPhone 10-sec code: ${iphone10}`,
          `Reset: ##61# then retry ${code}.`,
          `Call ${ATT_SUPPORT} or ${ATT_SUPPORT_TOLL} — ask to enable "conditional call forwarding" on your line.`,
          "Confirm you are on AT&T Wireless, not AT&T landline (*72/*73 landline codes differ).",
          "Never use *21* for overflow — that forwards every call.",
        ],
      },
      {
        id: "att-prepaid-cricket",
        problem: "Cricket / AT&T Prepaid",
        steps: [
          `Dial ${code} from the Cricket phone.`,
          "Cricket: Settings → Call forwarding may also work if code fails.",
          "If blocked, contact Cricket support to enable call forwarding.",
        ],
      },
      {
        id: "att-voicemail",
        problem: "Voicemail picks up first",
        steps: [
          "iPhone: Settings → Phone → Live Voicemail → OFF.",
          `Reset forwarding: ##61# then ${code}.`,
          "Call yourself — voicemail should not answer before ~20 sec ring.",
        ],
      },
      {
        id: "att-business",
        problem: "Business line — code rejected",
        steps: [
          "AT&T Business Center admin may need to enable forwarding.",
          `Admin: set no-answer route to +1${td} in AT&T Business hub.`,
        ],
      },
    ];
  }

  if (provider === "tmobile") {
    const code20 = `**61*1${td}**20#`;
    const code = `**61*1${td}#`;
    const tenOnly = `**61*${td}#`;
    return [
      {
        id: "tm-code-fails",
        problem: "Code fails or no confirmation text",
        steps: [
          `Try 20-second code: ${code20}`,
          `Or shorter: ${tenOnly} (10-digit destination, no leading 1).`,
          "Clear all rules: ##004# then retry.",
          `Call ${TMO_SUPPORT} — request conditional call forwarding enabled.`,
          "Done everything? Switch to Effiroad dedicated number — no codes required.",
        ],
      },
      {
        id: "tm-mvno",
        problem: "Metro / Mint / Ultra Mobile",
        steps: [
          `Primary: ${code20} — these use T-Mobile network.`,
          `Alternate: ${code}`,
          "Mint: must dial from the Mint phone app, not Wi-Fi calling only.",
          "If Wi-Fi calling only: disable Wi-Fi calling temporarily and retry on cellular.",
        ],
      },
      {
        id: "tm-voicemail",
        problem: "Voicemail before Effiroad",
        steps: [
          "Dial ##61# to reset, then re-apply code.",
          "T-Mobile Visual Voicemail: shorten voicemail ring in T-Mobile app if available.",
          "iPhone Live Voicemail → OFF.",
        ],
      },
    ];
  }

  if (provider === "xfinity") {
    const star71 = `*71${td}`;
    return [
      {
        id: "xf-device-only",
        problem: "Cannot activate from computer or another phone",
        steps: [
          "Xfinity only allows *71 from the Xfinity Mobile device itself — this is normal.",
          `On the shop Xfinity phone: ${star71} → wait for confirmation.`,
          `Turn off first: *73, then retry ${star71}.`,
        ],
      },
      {
        id: "xf-voicemail",
        problem: "Voicemail answers before Effiroad",
        steps: [
          "iPhone: Settings → Phone → Live Voicemail → OFF.",
          `Re-apply ${star71} after *73 reset.`,
          "Still failing? Use Effiroad dedicated number instead of forwarding.",
        ],
      },
    ];
  }

  if (provider === "ringcentral") {
    return [
      {
        id: "rc-ui-changed",
        problem: "Menus do not match the guide",
        steps: [
          "Search support.ringcentral.com for “call forwarding external number”.",
          "Use sequential ring (5–8 sec) then external — not simultaneous ring.",
          "Enable original caller ID pass-through.",
          "Still stuck? Switch to Effiroad dedicated number.",
        ],
      },
      {
        id: "rc-loop",
        problem: "Calls loop or drop",
        steps: [
          "Transfer-back number must differ from your main RingCentral line.",
          "Do not forward 100% of calls unconditionally unless you intend to.",
        ],
      },
    ];
  }

  if (provider === "grasshopper") {
    return [
      {
        id: "gh-press1",
        problem: "Receptionist hears “press 1 to accept”",
        steps: [
          "Extensions → Edit forwarding number → “Calls will connect as soon as you pick up”.",
          "Disable call screening / call announce on that forwarding number.",
        ],
      },
      {
        id: "gh-wrong-ext",
        problem: "Calls never reach Effiroad",
        steps: [
          "Numbers tab → confirm which extension your main line uses.",
          "Edit that extension’s forwarding list — Effiroad line must be toggled ON.",
          "Set Caller ID to caller’s number.",
        ],
      },
    ];
  }

  return [
    {
      id: "dp-wrong-line",
      problem: "Forwarding saved but test call fails",
      steps: [
        "Confirm you edited the number customers actually dial (main office line or ServiceTitan tracking number).",
        "Rule must be Fallback / When unanswered — not Always forward.",
        "External number must include +1 and full 10 digits.",
        "Enable caller ID pass-through (original caller) in Dialpad if Effiroad shows wrong number.",
        "Wait 2 minutes after Save, then test again.",
      ],
    },
    {
      id: "dp-servicetitan",
      problem: "ServiceTitan Phones Pro — no Fallback on Main Line",
      steps: [
        "Your routing may use Contact Center instead of Main Line.",
        "Dialpad → Admin Settings → Contact Center → default center → Business Hours & Call Routing.",
        "Edit Call Routing → Fallback Options → external number → paste Effiroad.",
        "Set Closed Hours Routing the same way (Avoca verified path).",
      ],
    },
    {
      id: "dp-jobber",
      problem: "Jobber Phone — cannot find Dialpad settings",
      steps: [
        "Jobber → Settings → Phone → your line → Call routing.",
        "Unanswered / No answer → Forward to external → paste Effiroad number.",
        "If greyed out: you need Jobber admin / phone admin role.",
      ],
    },
    {
      id: "dp-admin",
      problem: "Not a Dialpad admin / external number greyed out",
      steps: [
        "Contact Dialpad support — ask to enable forward-to-external on your account (Smith.ai documented requirement).",
        "Ask your office admin to add the unanswered forward rule.",
        `Give them Effiroad number: +1${td}.`,
        "Or use AT&T/T-Mobile/Verizon steps on the cell that rings if no admin access.",
      ],
    },
    {
      id: "dp-closed-hours",
      problem: "Works in daytime but not after hours",
      steps: [
        "Main Line → Closed Hours Routing → Edit → same external Effiroad number.",
        "Department lines: set both Open Hours AND Closed Hours routing.",
        "Confirm you saved both and saw “Changes saved”.",
      ],
    },
  ];
}

export const FORWARDING_CARRIER_PHONES = {
  verizon: VERIZON_SUPPORT,
  att: ATT_SUPPORT,
  tmobile: TMO_SUPPORT,
} as const;
