import type { DemoVertical } from "./demo-vertical-config";
import {
  HVAC_AI_LINES,
  HVAC_GAS_AI_LINES,
  RESTORATION_AI_LINES,
} from "./demo-phone-script";

/** Production-accurate main menu (matches lib/twilio-xml.ts twimlGatherMainMenu). */
export const PRODUCTION_MAIN_MENU =
  "Thank you for calling {shop}. To book service or report an emergency, press 1. For a free estimate, press 2.";

/** Tier 2 conversational choice (matches lib/retell-prompt.ts booking_choice). */
export const PRODUCTION_CHANNEL_CHOICE =
  "Would you like a quick text link, or handle it on this call?";

/** Sample customer link shown in interactive demo (not a live token). */
export const DEMO_LINK_INTAKE_URL = "https://link.effiroad.com/r/demo";

export type InteractiveStep =
  | { kind: "system"; text: string }
  | {
      kind: "ai-voice";
      text: string;
      audioIndex?: number;
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
    return getHvacInteractiveSteps();
  }
  return getRestorationInteractiveSteps();
}

function getRestorationInteractiveSteps(): InteractiveStep[] {
  const PHONE_START = 5;
  const LINK_START = 17;

  return [
    { kind: "system", text: "Incoming call · 2:14 AM · Forwarded — owner is on a job" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", RESTORATION_SHOP),
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
          jumpTo: LINK_START,
        },
      ],
    },
    {
      kind: "ai-voice",
      text: PRODUCTION_CHANNEL_CHOICE,
    },
    {
      kind: "menu",
      prompt: "Link vs phone",
      options: [
        {
          id: "link",
          label: "Quick text link",
          customerText: "Text me the link please.",
          jumpTo: LINK_START,
        },
        {
          id: "phone",
          label: "Handle on this call (urgent)",
          customerText:
            "Water's flooding my basement — it's coming up through the floor drain.",
          jumpTo: PHONE_START,
        },
      ],
    },
    {
      kind: "ai-voice",
      text: RESTORATION_AI_LINES[1],
      audioIndex: 1,
    },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: "Mike Wilson.",
    },
    {
      kind: "ai-voice",
      text: RESTORATION_AI_LINES[2],
      audioIndex: 2,
    },
    {
      kind: "customer-action",
      label: "Give full address",
      customerText: "4821 Oak Drive, Austin, Texas.",
    },
    {
      kind: "ai-voice",
      text: RESTORATION_AI_LINES[3],
      audioIndex: 3,
    },
    {
      kind: "sms",
      text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup · P1 · Reply 1 to dispatch · 2 pass",
      variant: "owner",
    },
    {
      kind: "owner-action",
      label: "Owner replies 1 — Dispatch",
      systemText: "Owner replied 1 · Dispatching crew",
    },
    {
      kind: "sms",
      text: "CREW · Jake M · 4821 Oak Dr · Sewage P1 · Reply 1 accept · 2 pass",
      variant: "crew",
    },
    { kind: "system", text: "Tech replied 1 · En route · ETA 32 min" },
    {
      kind: "ai-voice",
      text: RESTORATION_AI_LINES[4],
      audioIndex: 4,
    },
    { kind: "system", text: "Customer ETA text sent · Intake saved · Dispatched" },
    {
      kind: "ai-voice",
      text: `Perfect — I'm texting you a secure link from ${RESTORATION_SHOP}. It takes about a minute on your phone.`,
    },
    {
      kind: "sms",
      text: `${RESTORATION_SHOP}: Hi! Thanks for calling! Finish here (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Link sent · Owner gets notified when the form is submitted" },
  ];
}

function getHvacInteractiveSteps(): InteractiveStep[] {
  const PHONE_START = 5;
  const LINK_START = 18;

  return [
    { kind: "system", text: "Incoming call · 6:42 AM Sat · Forwarded — owner is on an install" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", HVAC_SHOP),
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
          jumpTo: LINK_START,
        },
      ],
    },
    {
      kind: "ai-voice",
      text: PRODUCTION_CHANNEL_CHOICE,
    },
    {
      kind: "menu",
      prompt: "Link vs phone",
      options: [
        {
          id: "link",
          label: "Quick text link",
          customerText: "I'd like the text link please.",
          jumpTo: LINK_START,
        },
        {
          id: "phone",
          label: "Handle on this call",
          customerText: "Let's handle it on this call — no heat, fifty-eight degrees inside.",
          jumpTo: PHONE_START,
        },
      ],
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[1],
      audioIndex: 1,
    },
    {
      kind: "customer-action",
      label: "Answer safety check",
      customerText: "No gas smell, no sparking.",
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[2],
      audioIndex: 2,
    },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: "Sarah Bennett.",
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[3],
      audioIndex: 3,
    },
    {
      kind: "customer-action",
      label: "Give full address",
      customerText: "904 Cedar Lane, Round Rock, Texas.",
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[4],
      audioIndex: 4,
    },
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
    {
      kind: "ai-voice",
      text: `Perfect — I'm texting you a secure link from ${HVAC_SHOP}. It takes about a minute on your phone.`,
    },
    {
      kind: "sms",
      text: `${HVAC_SHOP}: Hi! Thanks for calling! Finish here (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Link sent · Owner gets notified when the form is submitted" },
  ];
}

export function getGasHoldInteractiveSteps(): InteractiveStep[] {
  return [
    { kind: "system", text: "Incoming call · 9:18 PM · Gas smell reported" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", HVAC_SHOP),
    },
    {
      kind: "menu",
      prompt: "Main menu",
      options: [{ id: "1", label: "Press 1 — Book / emergency", customerText: "[Pressed 1]" }],
    },
    {
      kind: "ai-voice",
      text: HVAC_GAS_AI_LINES[0],
      audioIndex: 0,
    },
    {
      kind: "customer-action",
      label: "Describe what you smell",
      customerText: "I smell gas near the furnace — it's faint but I'm worried.",
    },
    {
      kind: "ai-voice",
      text: HVAC_GAS_AI_LINES[1],
      audioIndex: 1,
    },
    {
      kind: "customer-action",
      label: "Say your name",
      customerText: "Tom Reyes.",
    },
    {
      kind: "ai-voice",
      text: HVAC_GAS_AI_LINES[2],
      audioIndex: 2,
    },
    {
      kind: "customer-action",
      label: "Give full address",
      customerText: "1202 Maple Court, Round Rock. Everyone's out of the basement.",
    },
    {
      kind: "ai-voice",
      text: HVAC_GAS_AI_LINES[3],
      audioIndex: 3,
    },
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
}
