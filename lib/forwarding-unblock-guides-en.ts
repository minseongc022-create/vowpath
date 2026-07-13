import type { ForwardingProviderId } from "./forwarding-guides-en";

export type ForwardingUnblockGuide = {
  id: string;
  problem: string;
  steps: string[];
};

const VERIZON_SUPPORT = "800-922-0204";
const ATT_SUPPORT = "611 from your AT&T phone";
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
          "Start the test call step — Effiroad must receive Google's verification robocall.",
          "If verification never works: use Effiroad-as-main-line (no GV forward) or cell carrier **61* / *71.",
        ],
      },
      {
        id: "gv-rings-cell",
        problem: "My cell answers instead of Effiroad",
        steps: [
          "voice.google.com → Settings → Calls → review linked devices — disable ring on personal cell for overflow tests.",
          "Or switch to Effiroad-as-main-line so customers skip GV entirely.",
        ],
      },
      {
        id: "gv-no-unanswered",
        problem: "No unanswered-forward option in Google Voice",
        steps: [
          "Use desktop browser at voice.google.com/settings — not only the mobile app.",
          "If still missing: forward from the cell that rings when GV calls (AT&T/T-Mobile/Verizon paths).",
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
    return [
      {
        id: "att-code-fails",
        problem: "Code gives error tone or fast busy",
        steps: [
          `Try shorter code: ${alt} (some plans ignore ring timer).`,
          `Reset: ##61# then retry ${code}.`,
          `Call ${ATT_SUPPORT} — ask to enable "conditional call forwarding" on your line.`,
          "Confirm you are on AT&T Wireless, not AT&T landline (*72/*73 landline codes differ).",
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

  return [
    {
      id: "dp-wrong-line",
      problem: "Forwarding saved but test call fails",
      steps: [
        "Confirm you edited the number customers actually dial (main office line).",
        "Rule must be When unanswered — not Always forward.",
        "External number must include +1 and full 10 digits.",
        "Wait 2 minutes after Save, then test again.",
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
      problem: "Not a Dialpad admin",
      steps: [
        "Ask your office admin to add the unanswered forward rule.",
        `Give them Effiroad number: +1${td}.`,
        "Or use AT&T/T-Mobile/Verizon steps on the cell that rings if no admin access.",
      ],
    },
  ];
}

export const FORWARDING_CARRIER_PHONES = {
  verizon: VERIZON_SUPPORT,
  att: ATT_SUPPORT,
  tmobile: TMO_SUPPORT,
} as const;
