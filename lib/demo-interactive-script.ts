import type { DemoVertical } from "./demo-vertical-config";
import {
  HVAC_AI_LINES,
  HVAC_GAS_AI_LINES,
  RESTORATION_AI_LINES,
} from "./demo-phone-script";

/** Matches live Twilio main menu (lib/twilio-xml.ts twimlGatherMainMenu). */
export const PRODUCTION_MAIN_MENU =
  "Thank you for calling {shop}. To book service or report an emergency, say service or press 1. For a free estimate, say estimate or press 2.";

/** Sample customer portal / map links shown in interactive demo (not live tokens). */
export const DEMO_LINK_INTAKE_URL = "https://link.effiroad.com/r/demo";
export const DEMO_LIVE_MAP_URL = "https://link.effiroad.com/t/demo";

/** How the UI pauses between taps — only menu→Retell uses a real ring. */
export type DemoTransition = "retell-connect" | "soft" | "sms";

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
        transition?: DemoTransition;
      }[];
    }
  | {
      kind: "customer-action";
      label: string;
      customerText: string;
      transition?: DemoTransition;
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
      role?: "owner" | "tech";
      transition?: DemoTransition;
    };

const RESTORATION_SHOP = "Ridgeline Restoration";
const HVAC_SHOP = "Comfort Air HVAC";

export function getInteractiveDemoSteps(vertical: DemoVertical): InteractiveStep[] {
  if (vertical === "hvac") {
    return getHvacInteractiveSteps();
  }
  return getRestorationInteractiveSteps();
}

/**
 * Production flow:
 * Press 1 → phone vs text link · Press 2 → estimate channel · Say “text link” → SMS
 * Phone: name + address + issue (read-back) → SMS confirm/edit address + pick-time
 * Then owner/crew → live map
 */
function getRestorationInteractiveSteps(): InteractiveStep[] {
  const ESTIMATE_START = 22;
  const LINK_START = 27;

  return [
    { kind: "system", text: "Incoming call · 2:14 AM · Forwarded — owner is on a job" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", RESTORATION_SHOP),
    },
    {
      kind: "menu",
      prompt: "Main menu — same as live calls",
      options: [
        {
          id: "1",
          label: "Press 1 / say service — then phone or text link",
          customerText: "[Pressed 1 — service]",
          transition: "soft",
        },
        {
          id: "2",
          label: "Press 2 / say estimate — then phone or text link",
          customerText: "[Pressed 2 — free estimate]",
          jumpTo: ESTIMATE_START,
          transition: "retell-connect",
        },
        {
          id: "link",
          label: "Say “text link” — SMS form, call ends",
          customerText: "Text me the link please.",
          jumpTo: LINK_START,
          transition: "sms",
        },
      ],
    },
    {
      kind: "ai-voice",
      text:
        `Hi — thanks for calling ${RESTORATION_SHOP}. ` +
        `Say text link or press 1, and we'll text you a quick form — about a minute on your phone. ` +
        `Say talk on the phone or press 2, and we'll walk through it with you right here.`,
    },
    {
      kind: "menu",
      prompt: "Service — phone AI or text link",
      options: [
        {
          id: "ch-link",
          label: "Press 1 / say text link — SMS form",
          customerText: "Text link please.",
          jumpTo: LINK_START,
          transition: "sms",
        },
        {
          id: "ch-phone",
          label: "Press 2 / say talk on the phone — AI on this call",
          customerText:
            "Sewage is backing up in my basement — it's coming through the floor drain.",
          transition: "retell-connect",
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
      label: "Caller says name",
      customerText: "Mike Wilson.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: RESTORATION_AI_LINES[2],
      audioIndex: 2,
    },
    {
      kind: "customer-action",
      label: "Caller says address",
      customerText: "4821 Oak Drive, Austin.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: RESTORATION_AI_LINES[3],
      audioIndex: 3,
    },
    {
      kind: "customer-action",
      label: "Caller confirms read-back",
      customerText: "Yes, that's right.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: RESTORATION_AI_LINES[4],
      audioIndex: 4,
    },
    {
      kind: "sms",
      text: `${RESTORATION_SHOP}: Hi Mike! Request A1B2C3 received. Confirm address & pick visit time: ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    {
      kind: "customer-action",
      label: "Customer confirms address + picks 8:00–10:00 AM",
      customerText: "[Confirmed 4821 Oak Dr, Austin TX · Today 8:00–10:00 AM]",
      transition: "sms",
    },
    { kind: "system", text: "Visit scheduled · Risky sewage job needs owner approval" },
    {
      kind: "sms",
      text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup · P1 · Reply 1 to dispatch · 2 pass",
      variant: "owner",
    },
    {
      kind: "owner-action",
      label: "Reply 1 — Dispatch",
      systemText: "Owner replied 1 · Offering to crew",
      role: "owner",
      transition: "sms",
    },
    {
      kind: "sms",
      text: `Effiroad: P1 job — Mike Wilson, Sewage backup, Today 8-10. Reply 1=Accept 2=Pass. Ref A1B2C3`,
      variant: "crew",
    },
    {
      kind: "owner-action",
      label: "Reply 1 — Accept job",
      systemText: "Tech accepted · Reply ETA minutes for live map",
      role: "tech",
      transition: "sms",
    },
    {
      kind: "owner-action",
      label: "Reply 30 — On my way",
      systemText: "ETA 30 min · Customer live map sent",
      role: "tech",
      transition: "sms",
    },
    {
      kind: "sms",
      text: `${RESTORATION_SHOP}: Hi Mike! Jake is on the way — ~30 min. Live map: ${DEMO_LIVE_MAP_URL}`,
      variant: "customer",
    },
    {
      kind: "system",
      text: "Live map active while en route · Ends when the visit finishes",
    },
    // ESTIMATE_START = 22
    {
      kind: "ai-voice",
      text: "I'm glad you called — happy to help with your estimate. What's your name?",
    },
    {
      kind: "customer-action",
      label: "Caller says name",
      customerText: "Jordan Lee.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: "Thanks, Jordan. Tell me a bit about the project — what's going on at the property?",
    },
    {
      kind: "customer-action",
      label: "Caller describes the project",
      customerText: "Basement water damage last week — need a written estimate for insurance.",
      transition: "soft",
    },
    {
      kind: "sms",
      text: "ESTIMATE · Jordan Lee · Basement water · Reply from dashboard to send quote",
      variant: "owner",
    },
    // LINK_START = 27
    {
      kind: "ai-voice",
      text: `Perfect — I'm texting you a secure link from ${RESTORATION_SHOP}. It takes about a minute on your phone.`,
    },
    {
      kind: "sms",
      text: `${RESTORATION_SHOP}: Hi! Thanks for calling! Finish here (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Link sent · Owner notified when the form is submitted" },
  ];
}

function getHvacInteractiveSteps(): InteractiveStep[] {
  const ESTIMATE_START = 22;
  const LINK_START = 27;

  return [
    { kind: "system", text: "Incoming call · 6:42 AM Sat · Forwarded — owner is on an install" },
    {
      kind: "ai-voice",
      text: PRODUCTION_MAIN_MENU.replace("{shop}", HVAC_SHOP),
    },
    {
      kind: "menu",
      prompt: "Main menu — same as live calls",
      options: [
        {
          id: "1",
          label: "Press 1 / say service — then phone or text link",
          customerText: "[Pressed 1 — service]",
          transition: "soft",
        },
        {
          id: "2",
          label: "Press 2 / say estimate — then phone or text link",
          customerText: "[Pressed 2 — free estimate]",
          jumpTo: ESTIMATE_START,
          transition: "retell-connect",
        },
        {
          id: "link",
          label: "Say “text link” — SMS form, call ends",
          customerText: "I'd like the text link please.",
          jumpTo: LINK_START,
          transition: "sms",
        },
      ],
    },
    {
      kind: "ai-voice",
      text:
        `Hi — thanks for calling ${HVAC_SHOP}. ` +
        `Say text link or press 1, and we'll text you a quick form — about a minute on your phone. ` +
        `Say talk on the phone or press 2, and we'll walk through it with you right here.`,
    },
    {
      kind: "menu",
      prompt: "Service — phone AI or text link",
      options: [
        {
          id: "ch-link",
          label: "Press 1 / say text link — SMS form",
          customerText: "Text link please.",
          jumpTo: LINK_START,
          transition: "sms",
        },
        {
          id: "ch-phone",
          label: "Press 2 / say talk on the phone — AI on this call",
          customerText: "No heat — it's fifty-eight degrees inside and we've got kids home.",
          transition: "retell-connect",
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
      label: "Caller answers safety check",
      customerText: "No gas smell, no sparking.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[2],
      audioIndex: 2,
    },
    {
      kind: "customer-action",
      label: "Caller says name",
      customerText: "Sarah Bennett.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[3],
      audioIndex: 3,
    },
    {
      kind: "customer-action",
      label: "Caller says address",
      customerText: "910 Cedar Lane.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[4],
      audioIndex: 4,
    },
    {
      kind: "customer-action",
      label: "Caller confirms read-back",
      customerText: "Yes, that's correct.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: HVAC_AI_LINES[5],
      audioIndex: 5,
    },
    {
      kind: "sms",
      text: `${HVAC_SHOP}: Hi Sarah! Request D4E5F6 received. Confirm address & pick visit time: ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    {
      kind: "customer-action",
      label: "Customer confirms address + picks 9:00–11:00 AM",
      customerText: "[Confirmed 904 Cedar Ln, Round Rock TX · Today 9:00–11:00 AM]",
      transition: "sms",
    },
    { kind: "system", text: "Clear no-heat · Auto-scheduled · Crew offered" },
    {
      kind: "sms",
      text: "AUTO · Sarah Bennett · No heat · Window 9-11 · Tech notified",
      variant: "fyi",
    },
    {
      kind: "sms",
      text: `Effiroad: P2 job — Sarah Bennett, No heat, Today 9-11. Reply 1=Accept 2=Pass. Ref D4E5F6`,
      variant: "crew",
    },
    {
      kind: "owner-action",
      label: "Reply 1 — Accept job",
      systemText: "Tech accepted · ETA 28 min",
      role: "tech",
      transition: "sms",
    },
    {
      kind: "sms",
      text: `${HVAC_SHOP}: Hi Sarah! Alex is on the way — ~28 min. Live map: ${DEMO_LIVE_MAP_URL}`,
      variant: "customer",
    },
    {
      kind: "system",
      text: "Live map active while en route · Ends when the visit finishes",
    },
    // ESTIMATE_START = 22
    {
      kind: "ai-voice",
      text: "I'm glad you called — happy to help with your estimate. What's your name?",
    },
    {
      kind: "customer-action",
      label: "Caller says name",
      customerText: "Chris Park.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: "Thanks, Chris. What's the project — new system, replacement, or something else?",
    },
    {
      kind: "customer-action",
      label: "Caller describes the project",
      customerText: "Replace a 15-year-old AC — want a free written quote.",
      transition: "soft",
    },
    {
      kind: "sms",
      text: "ESTIMATE · Chris Park · AC replacement · Reply from dashboard to send quote",
      variant: "owner",
    },
    // LINK_START = 25
    {
      kind: "ai-voice",
      text: `Perfect — I'm texting you a secure link from ${HVAC_SHOP}. It takes about a minute on your phone.`,
    },
    {
      kind: "sms",
      text: `${HVAC_SHOP}: Hi! Thanks for calling! Finish here (~1 min): ${DEMO_LINK_INTAKE_URL}`,
      variant: "customer",
    },
    { kind: "system", text: "Link sent · Owner notified when the form is submitted" },
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
      prompt: "Main menu — then phone or text",
      options: [
        {
          id: "1",
          label: "Press 1 / say service — then talk on the phone",
          customerText: "[Pressed 1 → 2 talk on phone]",
          transition: "retell-connect",
        },
      ],
    },
    {
      kind: "ai-voice",
      text: HVAC_GAS_AI_LINES[0],
      audioIndex: 0,
    },
    {
      kind: "customer-action",
      label: "Caller describes the smell",
      customerText: "I smell gas near the furnace — it's faint but I'm worried.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: HVAC_GAS_AI_LINES[1],
      audioIndex: 1,
    },
    {
      kind: "customer-action",
      label: "Caller says name",
      customerText: "Tom Reyes.",
      transition: "soft",
    },
    {
      kind: "ai-voice",
      text: HVAC_GAS_AI_LINES[2],
      audioIndex: 2,
    },
    {
      kind: "sms",
      text: "GAS SMELL HOLD · Tom Reyes · Reply 1 dispatch · 2 hold",
      variant: "owner",
    },
    {
      kind: "owner-action",
      label: "Reply 2 — Hold (no crew)",
      systemText: "Owner replied 2 · Held — no crew sent",
      role: "owner",
      transition: "sms",
    },
    { kind: "system", text: "Safety intake saved · Customer gets next-step text" },
  ];
}
