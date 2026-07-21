import type { DemoVertical } from "./demo-vertical-config";
import {
  HVAC_AI_LINES,
  HVAC_GAS_AI_LINES,
  HVAC_CUSTOMER_TEXT,
  HVAC_GAS_CUSTOMER_TEXT,
  RESTORATION_AI_LINES,
  RESTORATION_CUSTOMER_TEXT,
} from "./demo-phone-script";

/** Production-accurate main menu (matches lib/twilio-xml.ts twimlGatherMainMenu). */
export const PRODUCTION_MAIN_MENU =
  "Thank you for calling {shop}. To book service or report an emergency, press 1. For a free estimate, press 2.";

/** Tier 2 conversational choice — booking path (matches lib/retell-prompt.ts booking_choice). */
export const PRODUCTION_CHANNEL_CHOICE =
  "Would you like a quick text link, or handle it on this call?";

/** Estimate path channel choice (matches lib/retell-prompt.ts estimate_choice). */
export const PRODUCTION_ESTIMATE_CHANNEL_CHOICE =
  "Would you like a quick text link, or tell us about the project on this call?";

/** Sample customer link shown in interactive demo (not a live token). */
export const DEMO_LINK_INTAKE_URL = "https://link.effiroad.com/r/demo";

export type InteractiveStep =
  | { kind: "system"; text: string }
  | {
      kind: "ai-voice";
      text: string;
      audioIndex?: number;
      /** Static clip under /demo-audio/ (menu, channel choice, link close). */
      audioFile?: string;
    }
  | {
      kind: "menu";
      prompt: string;
      options: {
        id: string;
        label: string;
        customerText?: string;
        jumpTo?: number;
      }[];
    }
  | {
      kind: "customer-action";
      label: string;
      customerText: string;
    }
  | {
      kind: "sms";
      text: string;
      variant: "owner" | "crew" | "fyi" | "customer";
    }
  | {
      kind: "owner-action";
      label: string;
      systemText: string;
    };

const RESTORATION_SHOP = "Ridgeline Restoration";
const HVAC_SHOP = "Comfort Air HVAC";

export function getInteractiveDemoSteps(vertical: DemoVertical): InteractiveStep[] {
  if (vertical === "hvac") {
    return buildHvacInteractiveSteps();
  }
  return buildRestorationInteractiveSteps();
}

function buildRestorationInteractiveSteps(): InteractiveStep[] {
  const linkCloseText = `Perfect — I'm texting you a secure link from ${RESTORATION_SHOP}. It takes about a minute on your phone.`;

  const phoneSteps: InteractiveStep[] = [
    { kind: "ai-voice", text: RESTORATION_AI_LINES[0], audioIndex: 0 },
    {
      kind: "customer-action",
      label: "Describe the emergency",
      customerText: RESTORATION_CUSTOMER_TEXT[0],
    },
    { kind: "ai-voice", text: RESTORATION_AI_LINES[1], audioIndex: 1 },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: RESTORATION_CUSTOMER_TEXT[1],
    },
    { kind: "ai-voice", text: RESTORATION_AI_LINES[2], audioIndex: 2 },
    {
      kind: "customer-action",
      label: "Give full address",
      customerText: RESTORATION_CUSTOMER_TEXT[2],
    },
    { kind: "ai-voice", text: RESTORATION_AI_LINES[3], audioIndex: 3 },
    {
      kind: "sms",
      text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup · P1 · Reply 1 to dispatch · 2 pass",
      variant: "owner",
    },
    {
      kind: "owner-action",
      label: "Reply 1 — Dispatch",
      systemText: "Owner replied 1 · Dispatching crew",
    },
    {
      kind: "sms",
      text: "CREW · Jake M · 4821 Oak Dr · Sewage P1 · Reply 1 accept · 2 pass",
      variant: "crew",
    },
    { kind: "system", text: "Tech replied 1 · En route · ETA 32 min" },
    { kind: "ai-voice", text: RESTORATION_AI_LINES[4], audioIndex: 4 },
    { kind: "system", text: "Customer ETA text sent · Intake saved · Dispatched" },
  ];

  const linkSteps: InteractiveStep[] = [
    { kind: "ai-voice", text: linkCloseText, audioFile: "voice-ai-link-close.mp3" },
    {
      kind: "sms",
      text: `${RESTORATION_SHOP}: Hi! Thanks for calling! Finish here (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Link sent · Owner gets notified when the form is submitted" },
  ];

  const estimateChannelSteps: InteractiveStep[] = [
    {
      kind: "ai-voice",
      text: PRODUCTION_ESTIMATE_CHANNEL_CHOICE,
      audioFile: "voice-ai-estimate-channel.mp3",
    },
    {
      kind: "menu",
      prompt: "Estimate — link vs phone",
      options: [
        {
          id: "link",
          label: "Quick text link",
          customerText: "Text me the estimate link please.",
          jumpTo: 0, // patched below
        },
        {
          id: "phone",
          label: "Tell us on this call",
          customerText: "I'd like to describe the project on this call.",
          jumpTo: 0, // patched below
        },
      ],
    },
  ];

  const estimateLinkSteps: InteractiveStep[] = [
    {
      kind: "ai-voice",
      text: `Perfect — I'm texting you a short estimate form from ${RESTORATION_SHOP}. It takes about a minute on your phone.`,
      audioFile: "voice-ai-estimate-link-close.mp3",
    },
    {
      kind: "sms",
      text: `${RESTORATION_SHOP}: Thanks for calling! Free estimate form (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Estimate link sent · Owner notified when submitted" },
  ];

  const estimatePhoneSteps: InteractiveStep[] = [
    {
      kind: "ai-voice",
      text: "Happy to help with your estimate. What's your name?",
      audioFile: "voice-ai-estimate-open.mp3",
    },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: "Jennifer Park.",
    },
    {
      kind: "ai-voice",
      text: "Thanks, Jennifer. What's the property address for the estimate?",
      audioFile: "voice-ai-estimate-address.mp3",
    },
    {
      kind: "customer-action",
      label: "Give property address",
      customerText: "2205 Elm Street, Austin, Texas — kitchen water damage from a slow leak.",
    },
    {
      kind: "ai-voice",
      text: "Got it — I've captured everything. Our team will follow up with next steps. You'll get a text confirmation shortly.",
      audioFile: "voice-ai-estimate-close.mp3",
    },
    { kind: "system", text: "Estimate intake saved · Owner notified · No price quoted on call" },
  ];

  const phoneStart = 5;
  const estimateChannelStart = phoneStart + phoneSteps.length;
  const estimateLinkStart = estimateChannelStart + estimateChannelSteps.length;
  const estimatePhoneStart = estimateLinkStart + estimateLinkSteps.length;
  const linkStart = estimatePhoneStart + estimatePhoneSteps.length;

  const estimateMenu = estimateChannelSteps[1];
  if (estimateMenu.kind === "menu") {
    estimateMenu.options[0]!.jumpTo = estimateLinkStart;
    estimateMenu.options[1]!.jumpTo = estimatePhoneStart;
  }

  const head: InteractiveStep[] = [
    { kind: "system", text: "Incoming call · 2:14 AM · Forwarded — owner is on a job" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", RESTORATION_SHOP),
      audioFile: "voice-ai-main-menu.mp3",
    },
    {
      kind: "menu",
      prompt: "Main menu — caller chooses",
      options: [
        { id: "1", label: "Press 1 — Book / emergency", customerText: "[Pressed 1]" },
        {
          id: "2",
          label: "Press 2 — Free estimate",
          customerText: "[Pressed 2 — estimate]",
          jumpTo: estimateChannelStart,
        },
      ],
    },
    {
      kind: "ai-voice",
      text: PRODUCTION_CHANNEL_CHOICE,
      audioFile: "voice-ai-channel.mp3",
    },
    {
      kind: "menu",
      prompt: "Link vs phone",
      options: [
        {
          id: "link",
          label: "Quick text link",
          customerText: "Text me the link please.",
          jumpTo: linkStart,
        },
        {
          id: "phone",
          label: "Handle on this call (urgent)",
          customerText: "Let's handle it on this call.",
          jumpTo: phoneStart,
        },
      ],
    },
  ];

  return [
    ...head,
    ...phoneSteps,
    ...estimateChannelSteps,
    ...estimateLinkSteps,
    ...estimatePhoneSteps,
    ...linkSteps,
  ];
}

function buildHvacInteractiveSteps(): InteractiveStep[] {
  const linkCloseText = `Perfect — I'm texting you a secure link from ${HVAC_SHOP}. It takes about a minute on your phone.`;

  const phoneSteps: InteractiveStep[] = [
    { kind: "ai-voice", text: HVAC_AI_LINES[0], audioIndex: 0 },
    {
      kind: "customer-action",
      label: "Describe the problem",
      customerText: HVAC_CUSTOMER_TEXT[0],
    },
    { kind: "ai-voice", text: HVAC_AI_LINES[1], audioIndex: 1 },
    {
      kind: "customer-action",
      label: "Answer safety check",
      customerText: HVAC_CUSTOMER_TEXT[1],
    },
    { kind: "ai-voice", text: HVAC_AI_LINES[2], audioIndex: 2 },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: HVAC_CUSTOMER_TEXT[2],
    },
    { kind: "ai-voice", text: HVAC_AI_LINES[3], audioIndex: 3 },
    {
      kind: "customer-action",
      label: "Give full address",
      customerText: HVAC_CUSTOMER_TEXT[3],
    },
    { kind: "ai-voice", text: HVAC_AI_LINES[4], audioIndex: 4 },
    {
      kind: "sms",
      text: "AUTO-DISPATCH · Sarah Bennett · No heat P2 · Tech notified",
      variant: "fyi",
    },
    {
      kind: "sms",
      text: "NEW JOB · Sarah Bennett · No heat · 904 Cedar Ln · Reply 1 accept",
      variant: "crew",
    },
    { kind: "system", text: "Tech replied 1 · En route · ETA 28 min" },
    { kind: "system", text: "Customer ETA text sent · Intake saved · Auto-dispatched" },
  ];

  const linkSteps: InteractiveStep[] = [
    { kind: "ai-voice", text: linkCloseText, audioFile: "voice-hvac-link-close.mp3" },
    {
      kind: "sms",
      text: `${HVAC_SHOP}: Hi! Thanks for calling! Finish here (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Link sent · Owner gets notified when the form is submitted" },
  ];

  const estimateChannelSteps: InteractiveStep[] = [
    {
      kind: "ai-voice",
      text: PRODUCTION_ESTIMATE_CHANNEL_CHOICE,
      audioFile: "voice-hvac-estimate-channel.mp3",
    },
    {
      kind: "menu",
      prompt: "Estimate — link vs phone",
      options: [
        {
          id: "link",
          label: "Quick text link",
          customerText: "Text me the estimate link please.",
          jumpTo: 0,
        },
        {
          id: "phone",
          label: "Tell us on this call",
          customerText: "I'd like to describe the project on this call.",
          jumpTo: 0,
        },
      ],
    },
  ];

  const estimateLinkSteps: InteractiveStep[] = [
    {
      kind: "ai-voice",
      text: `Perfect — I'm texting you a short estimate form from ${HVAC_SHOP}. It takes about a minute on your phone.`,
      audioFile: "voice-hvac-estimate-link-close.mp3",
    },
    {
      kind: "sms",
      text: `${HVAC_SHOP}: Thanks for calling! Free estimate form (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Estimate link sent · Owner notified when submitted" },
  ];

  const estimatePhoneSteps: InteractiveStep[] = [
    {
      kind: "ai-voice",
      text: "Happy to help with your estimate. What's your name?",
      audioFile: "voice-hvac-estimate-open.mp3",
    },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: "David Chen.",
    },
    {
      kind: "ai-voice",
      text: "Thanks, David. What's the property address for the estimate?",
      audioFile: "voice-hvac-estimate-address.mp3",
    },
    {
      kind: "customer-action",
      label: "Describe the project",
      customerText: "8841 Pine Ridge, Round Rock — AC not cooling upstairs, about two weeks.",
    },
    {
      kind: "ai-voice",
      text: "Got it — I've captured everything. Our team will follow up with next steps. You'll get a text confirmation shortly.",
      audioFile: "voice-hvac-estimate-close.mp3",
    },
    { kind: "system", text: "Estimate intake saved · Owner notified · No price quoted on call" },
  ];

  const phoneStart = 5;
  const estimateChannelStart = phoneStart + phoneSteps.length;
  const estimateLinkStart = estimateChannelStart + estimateChannelSteps.length;
  const estimatePhoneStart = estimateLinkStart + estimateLinkSteps.length;
  const linkStart = estimatePhoneStart + estimatePhoneSteps.length;

  const hvacEstimateMenu = estimateChannelSteps[1];
  if (hvacEstimateMenu.kind === "menu") {
    hvacEstimateMenu.options[0]!.jumpTo = estimateLinkStart;
    hvacEstimateMenu.options[1]!.jumpTo = estimatePhoneStart;
  }

  const head: InteractiveStep[] = [
    { kind: "system", text: "Incoming call · 6:42 AM Sat · Forwarded — owner is on an install" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", HVAC_SHOP),
      audioFile: "voice-hvac-main-menu.mp3",
    },
    {
      kind: "menu",
      prompt: "Main menu — caller chooses",
      options: [
        { id: "1", label: "Press 1 — Book / emergency", customerText: "[Pressed 1]" },
        {
          id: "2",
          label: "Press 2 — Free estimate",
          customerText: "[Pressed 2 — estimate]",
          jumpTo: estimateChannelStart,
        },
      ],
    },
    {
      kind: "ai-voice",
      text: PRODUCTION_CHANNEL_CHOICE,
      audioFile: "voice-hvac-channel.mp3",
    },
    {
      kind: "menu",
      prompt: "Link vs phone",
      options: [
        {
          id: "link",
          label: "Quick text link",
          customerText: "I'd like the text link please.",
          jumpTo: linkStart,
        },
        {
          id: "phone",
          label: "Handle on this call",
          customerText: "Let's handle it on this call.",
          jumpTo: phoneStart,
        },
      ],
    },
  ];

  return [
    ...head,
    ...phoneSteps,
    ...estimateChannelSteps,
    ...estimateLinkSteps,
    ...estimatePhoneSteps,
    ...linkSteps,
  ];
}

export function getGasHoldInteractiveSteps(): InteractiveStep[] {
  const intakeSteps: InteractiveStep[] = [
    { kind: "ai-voice", text: HVAC_GAS_AI_LINES[0], audioIndex: 0 },
    {
      kind: "customer-action",
      label: "Describe what you smell",
      customerText: HVAC_GAS_CUSTOMER_TEXT[0],
    },
    { kind: "ai-voice", text: HVAC_GAS_AI_LINES[1], audioIndex: 1 },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: HVAC_GAS_CUSTOMER_TEXT[1],
    },
    { kind: "ai-voice", text: HVAC_GAS_AI_LINES[2], audioIndex: 2 },
    {
      kind: "customer-action",
      label: "Give full address",
      customerText: HVAC_GAS_CUSTOMER_TEXT[2],
    },
    { kind: "ai-voice", text: HVAC_GAS_AI_LINES[3], audioIndex: 3 },
    {
      kind: "sms",
      text: "GAS SMELL HOLD · Tom Reyes · 1202 Maple Ct · Reply 1 dispatch · 2 hold",
      variant: "owner",
    },
    {
      kind: "owner-action",
      label: "Owner replies 2 — Hold",
      systemText: "Owner replied 2 · Held — no crew sent",
    },
    { kind: "system", text: "Safety intake saved · Customer gets next-step text" },
  ];

  const intakeStart = 3;

  return [
    { kind: "system", text: "Incoming call · 9:18 PM · Gas smell reported" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", HVAC_SHOP),
      audioFile: "voice-hvac-gas-main-menu.mp3",
    },
    {
      kind: "menu",
      prompt: "Main menu",
      options: [
        {
          id: "1",
          label: "Press 1 — Book / emergency",
          customerText: "[Pressed 1]",
          jumpTo: intakeStart,
        },
      ],
    },
    ...intakeSteps,
  ];
}
