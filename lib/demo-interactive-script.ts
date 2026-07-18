import type { DemoVertical } from "./demo-vertical-config";

/** Production-accurate main menu (matches lib/twilio-xml.ts twimlGatherMainMenu). */
export const PRODUCTION_MAIN_MENU =
  "Thank you for calling {shop}. To book service or report an emergency, press 1. For a free estimate, press 2.";

/** Tier 2 conversational choice (matches lib/retell-prompt.ts booking_choice). */
export const PRODUCTION_CHANNEL_CHOICE =
  "Would you like a quick text link, or handle it on this call?";

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
      options: { id: string; label: string; customerText?: string }[];
    }
  | {
      kind: "customer-action";
      label: string;
      customerText: string;
    }
  | {
      kind: "sms";
      text: string;
      variant: "owner" | "crew" | "fyi";
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
    return [
      { kind: "system", text: "Incoming call · 6:42 AM Sat · Forwarded — owner is on an install" },
      {
        kind: "ai-voice",
        text: PRODUCTION_MAIN_MENU.replace("{shop}", HVAC_SHOP),
        audioIndex: 0,
      },
      {
        kind: "menu",
        prompt: "Main menu — caller chooses",
        options: [
          { id: "1", label: "Press 1 — Book / emergency", customerText: "[Pressed 1]" },
          { id: "2", label: "Press 2 — Free estimate", customerText: "[Pressed 2]" },
        ],
      },
      {
        kind: "ai-voice",
        text: PRODUCTION_CHANNEL_CHOICE,
        audioIndex: 1,
      },
      {
        kind: "menu",
        prompt: "Link vs phone",
        options: [
          { id: "link", label: "Quick text link", customerText: "I'd like the text link please." },
          {
            id: "phone",
            label: "Handle on this call",
            customerText: "Let's handle it on this call — no heat, fifty-eight degrees inside.",
          },
        ],
      },
      {
        kind: "ai-voice",
        text: "Comfort Air HVAC, thanks for calling. I'm here to help — what's going on at the house?",
        audioIndex: 2,
      },
      {
        kind: "customer-action",
        label: "Describe the issue",
        customerText: "No heat — it's fifty-eight degrees inside and we've got kids home.",
      },
      {
        kind: "ai-voice",
        text: "I'm sorry you're dealing with that, especially this early. Quick safety check — do you smell gas or hear any sparking?",
        audioIndex: 3,
      },
      {
        kind: "customer-action",
        label: "Safety answer",
        customerText: "No gas smell, no sparking.",
      },
      {
        kind: "ai-voice",
        text: "Good — no gas smell. What's your name?",
        audioIndex: 4,
      },
      {
        kind: "customer-action",
        label: "Give name",
        customerText: "Sarah Bennett.",
      },
      {
        kind: "ai-voice",
        text: "Thanks, Sarah. What's the full service address?",
        audioIndex: 5,
      },
      {
        kind: "customer-action",
        label: "Give address",
        customerText: "904 Cedar Lane, Round Rock, Texas.",
      },
      {
        kind: "ai-voice",
        text: "Got it. That's a verified no-heat call, so I'm dispatching your on-call tech now. You'll get an ETA text shortly.",
        audioIndex: 6,
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
    ];
  }

  return [
    { kind: "system", text: "Incoming call · 2:14 AM · Forwarded — owner is on a job" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", RESTORATION_SHOP),
      audioIndex: 0,
    },
    {
      kind: "menu",
      prompt: "Main menu — caller chooses",
      options: [
        { id: "1", label: "Press 1 — Book / emergency", customerText: "[Pressed 1]" },
        { id: "2", label: "Press 2 — Free estimate", customerText: "[Pressed 2]" },
      ],
    },
    {
      kind: "ai-voice",
      text: PRODUCTION_CHANNEL_CHOICE,
      audioIndex: 1,
    },
    {
      kind: "menu",
      prompt: "Link vs phone",
      options: [
        { id: "link", label: "Quick text link", customerText: "Text me the link please." },
        {
          id: "phone",
          label: "Handle on this call (urgent)",
          customerText: "Water's flooding my basement — it's coming up through the floor drain.",
        },
      ],
    },
    {
      kind: "ai-voice",
      text: "I'm here with you. What's your name?",
      audioIndex: 2,
    },
    {
      kind: "customer-action",
      label: "Give name",
      customerText: "Mike Wilson.",
    },
    {
      kind: "ai-voice",
      text: "Thanks, Mike. What's the full property address — street, city, and state?",
      audioIndex: 3,
    },
    {
      kind: "customer-action",
      label: "Give address",
      customerText: "4821 Oak Drive, Austin, Texas.",
    },
    {
      kind: "ai-voice",
      text: "A sewage backup can move fast. I'm marking this urgent and texting the owner for approval now.",
      audioIndex: 4,
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
      text: "You're all set, Mike. Jake accepted the job and is heading your way. You'll get his ETA by text in just a moment.",
      audioIndex: 5,
    },
    { kind: "system", text: "Customer ETA text sent · Intake saved · Dispatched" },
  ];
}

export function getGasHoldInteractiveSteps(): InteractiveStep[] {
  return [
    { kind: "system", text: "Incoming call · 9:18 PM · Gas smell reported" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", HVAC_SHOP),
      audioIndex: 0,
    },
    {
      kind: "menu",
      prompt: "Main menu",
      options: [{ id: "1", label: "Press 1 — Book / emergency", customerText: "[Pressed 1]" }],
    },
    {
      kind: "ai-voice",
      text: "Comfort Air HVAC, you've reached us. I'm here with you — tell me what's happening, and whether anyone feels sick.",
      audioIndex: 1,
    },
    {
      kind: "customer-action",
      label: "Describe gas smell",
      customerText: "I smell gas near the furnace — it's faint but I'm worried.",
    },
    {
      kind: "ai-voice",
      text: "I hear you. Gas smell is serious, so I'm not sending anyone blindly. What's your name?",
      audioIndex: 2,
    },
    {
      kind: "customer-action",
      label: "Give name",
      customerText: "Tom Reyes.",
    },
    {
      kind: "ai-voice",
      text: "Thank you. What's the full property address?",
      audioIndex: 3,
    },
    {
      kind: "customer-action",
      label: "Give address",
      customerText: "1202 Maple Court, Round Rock. Everyone's out of the basement.",
    },
    {
      kind: "ai-voice",
      text: "Got it. I'm holding this as a safety call and texting the owner now, so they can decide the safest next step.",
      audioIndex: 4,
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
