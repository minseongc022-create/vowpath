import type { DemoVertical } from "./demo-vertical-config";

/**
 * Receptionist lines for interactive + timeline demos.
 * Matches live address-link Retell prompt (address + visit time on SMS portal).
 */
export const RESTORATION_AI_LINES = [
  "Hi, thanks for calling Ridgeline Restoration. I'm here with you — what's going on?",
  "I'm really glad you called. We'll take care of this together. What's your name?",
  "Thanks, Mike. Just to confirm — Mike Wilson, sewage backup in the basement. Is that right?",
  "You're all set — I'll text you a secure link to confirm your address and pick your visit time. Our team's on it.",
] as const;

export const HVAC_AI_LINES = [
  "Comfort Air HVAC, thanks for calling. I'm here to help — what's going on at the house?",
  "I'm sorry you're dealing with that, especially this early. Quick safety check — do you smell gas or hear any sparking?",
  "Good — no gas smell. What's your name?",
  "Thanks, Sarah. Just to confirm — Sarah Bennett, no heat, kids home, no gas smell. Is that right?",
  "You're all set — I'll text you a secure link to confirm your address and pick your visit time. Our team's on it.",
] as const;

export const HVAC_GAS_AI_LINES = [
  "Comfort Air HVAC, you've reached us. I'm here with you — tell me what's happening, and whether anyone feels sick.",
  "I hear you. Gas smell is serious, so I'm not sending anyone blindly. What's your name?",
  "Got it. I'm holding this as a safety call and texting the owner now — they'll confirm next steps. You'll also get a secure link for the address.",
] as const;

export const RESTORATION_CUSTOMER_TEXT = [
  "Sewage is backing up in my basement — it's coming through the floor drain.",
  "Mike Wilson.",
  "Yes, that's right.",
] as const;

export const HVAC_CUSTOMER_TEXT = [
  "No heat — it's fifty-eight degrees inside and we've got kids home.",
  "No gas smell, no sparking.",
  "Sarah Bennett.",
  "Yes, that's correct.",
] as const;

export const HVAC_GAS_CUSTOMER_TEXT = [
  "I smell gas near the furnace — it's faint but I'm worried.",
  "Tom Reyes.",
] as const;

export type PhoneDemoPhase =
  | { kind: "system"; text: string; delayMs: number }
  | { kind: "customer-text"; text: string; delayMs: number }
  | { kind: "ai-voice"; text: string; audioIndex: number; delayMs: number }
  | { kind: "sms"; text: string; delayMs: number; variant?: "owner" | "crew" | "fyi" | "customer" };

/** Auto-play timeline (recording / non-interactive). */
export const RESTORATION_PHONE_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 2:14 AM · Forwarded — owner is on a job", delayMs: 700 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[0], audioIndex: 0, delayMs: 700 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[0], delayMs: 1100 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[1], audioIndex: 1, delayMs: 800 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[1], delayMs: 900 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[2], audioIndex: 2, delayMs: 800 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[2], delayMs: 900 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[3], audioIndex: 3, delayMs: 700 },
  {
    kind: "sms",
    text: "Ridgeline: Hi Mike! Request A1B2C3 received. Confirm address & pick visit time: https://link.effiroad.com/r/demo",
    delayMs: 900,
    variant: "customer",
  },
  { kind: "system", text: "Customer confirmed 4821 Oak Dr + 8–10 AM · Visit scheduled", delayMs: 1200 },
  {
    kind: "sms",
    text: "NEW JOB · Mike Wilson · Sewage backup · P1 · Reply 1 to dispatch · 2 pass",
    delayMs: 900,
    variant: "owner",
  },
  { kind: "system", text: "Owner replied 1 · Dispatching crew", delayMs: 1100 },
  {
    kind: "sms",
    text: "Effiroad: P1 job — Mike Wilson, Sewage backup, Today 8-10. Reply 1=Accept 2=Pass. Ref A1B2C3",
    delayMs: 900,
    variant: "crew",
  },
  { kind: "system", text: "Tech replied 1 · Asked for ETA minutes", delayMs: 1000 },
  {
    kind: "sms",
    text: "Ridgeline: Hi Mike! Jake is on the way — ~30 min. Live map: https://link.effiroad.com/t/demo",
    delayMs: 1000,
    variant: "customer",
  },
  { kind: "system", text: "Live map link sent · Visit in progress", delayMs: 1400 },
];

export const HVAC_PHONE_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 6:42 AM Sat · Forwarded — owner is on an install", delayMs: 700 },
  { kind: "ai-voice", text: HVAC_AI_LINES[0], audioIndex: 0, delayMs: 700 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[0], delayMs: 1100 },
  { kind: "ai-voice", text: HVAC_AI_LINES[1], audioIndex: 1, delayMs: 800 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[1], delayMs: 900 },
  { kind: "ai-voice", text: HVAC_AI_LINES[2], audioIndex: 2, delayMs: 800 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[2], delayMs: 900 },
  { kind: "ai-voice", text: HVAC_AI_LINES[3], audioIndex: 3, delayMs: 800 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[3], delayMs: 900 },
  { kind: "ai-voice", text: HVAC_AI_LINES[4], audioIndex: 4, delayMs: 700 },
  {
    kind: "sms",
    text: "Comfort Air: Hi Sarah! Request D4E5F6 received. Confirm address & pick visit time: https://link.effiroad.com/r/demo",
    delayMs: 900,
    variant: "customer",
  },
  { kind: "system", text: "Customer confirmed Cedar Ln + 9–11 AM · Auto-scheduled", delayMs: 1100 },
  {
    kind: "sms",
    text: "AUTO · Sarah Bennett · No heat · Window set · Tech notified",
    delayMs: 800,
    variant: "fyi",
  },
  {
    kind: "sms",
    text: "Effiroad: P2 job — Sarah Bennett, No heat, Today 9-11. Reply 1=Accept 2=Pass. Ref D4E5F6",
    delayMs: 900,
    variant: "crew",
  },
  { kind: "system", text: "Tech replied 1 · ETA 28 min · Live map sent", delayMs: 1400 },
];

export const HVAC_GAS_HOLD_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 9:18 PM · Gas smell reported", delayMs: 700 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[0], audioIndex: 0, delayMs: 700 },
  { kind: "customer-text", text: HVAC_GAS_CUSTOMER_TEXT[0], delayMs: 1100 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[1], audioIndex: 1, delayMs: 800 },
  { kind: "customer-text", text: HVAC_GAS_CUSTOMER_TEXT[1], delayMs: 900 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[2], audioIndex: 2, delayMs: 800 },
  {
    kind: "sms",
    text: "GAS SMELL HOLD · Tom Reyes · Reply 1 dispatch · 2 hold",
    delayMs: 900,
    variant: "owner",
  },
  { kind: "system", text: "Owner replied 2 · Held — no crew sent", delayMs: 1300 },
  { kind: "system", text: "Safety intake saved · Customer gets next-step text", delayMs: 1400 },
];

export function getPhoneDemoTimeline(vertical: DemoVertical): PhoneDemoPhase[] {
  return vertical === "hvac" ? HVAC_PHONE_TIMELINE : RESTORATION_PHONE_TIMELINE;
}

export function getVoiceAudioPrefix(vertical: DemoVertical): string {
  return vertical === "hvac" ? "voice-hvac" : "voice-ai";
}

export function getGasHoldAudioPrefix(): string {
  return "voice-hvac-gas";
}

/** Total scene runtime for recording (ms) — one full call, no loop. */
export function phoneDemoTotalMs(timeline: PhoneDemoPhase[]): number {
  let cursor = 400;
  for (const phase of timeline) cursor += phase.delayMs;
  return cursor + 6000;
}

/** @deprecated Use getPhoneDemoTimeline("restoration") */
export const PHONE_DEMO_TIMELINE = RESTORATION_PHONE_TIMELINE;
export const VOICE_DEMO_AI_LINES = RESTORATION_AI_LINES;
export const VOICE_DEMO_CUSTOMER_TEXT = RESTORATION_CUSTOMER_TEXT;
