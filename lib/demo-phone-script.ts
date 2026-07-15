import type { DemoVertical } from "./demo-vertical-config";

/** AI voice lines — deep warm male US dispatcher; customer text only in demo. */
export const RESTORATION_AI_LINES = [
  "Hey — thanks for calling Ridgeline Restoration. You've got me. What's going on over there?",
  "I'm really glad you called. We'll take care of this. What's your name, and what's the address?",
  "Got it, Mike. Sounds like a sewage backup — I'm marking this urgent and paging the crew right now.",
  "You're all set, Mike. Someone's already heading your way. You'll get a text with their ETA in just a minute.",
] as const;

export const HVAC_AI_LINES = [
  "Comfort Air HVAC — thanks for calling. Who am I speaking with, and what's going on at the house?",
  "I'm sorry you're dealing with that. Quick safety check — do you smell gas or hear any sparking?",
  "Good — no gas smell. What's the address, and about how cold is it inside right now?",
  "Got it, Sarah. No-heat verified — I'm dispatching your on-call tech now. You'll get a text with ETA shortly.",
] as const;

export const HVAC_GAS_AI_LINES = [
  "Comfort Air HVAC — you've reached us. Tell me what's happening and if anyone is feeling sick.",
  "I hear you — gas smell is serious. I'm not sending anyone until the owner approves. Name and address?",
  "Thank you. I'm holding this as a safety call and texting the owner now — they'll decide next steps.",
] as const;

export const RESTORATION_CUSTOMER_TEXT = [
  "Water's flooding my basement — it's coming up through the floor drain.",
  "Mike Wilson, 4821 Oak Drive, Austin.",
] as const;

export const HVAC_CUSTOMER_TEXT = [
  "No heat — it's fifty-eight degrees inside and we've got kids home.",
  "No gas smell. Sarah Bennett, nine oh four Cedar Lane, Round Rock.",
] as const;

export const HVAC_GAS_CUSTOMER_TEXT = [
  "I smell gas near the furnace — it's faint but I'm worried.",
  "Tom Reyes, 1202 Maple Court, Round Rock. Everyone's out of the basement.",
] as const;

export type PhoneDemoPhase =
  | { kind: "system"; text: string; delayMs: number }
  | { kind: "customer-text"; text: string; delayMs: number }
  | { kind: "ai-voice"; text: string; audioIndex: number; delayMs: number }
  | { kind: "sms"; text: string; delayMs: number; variant?: "owner" | "crew" | "fyi" };

export const RESTORATION_PHONE_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 2:14 AM · Forwarded — you're on a job", delayMs: 900 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[0], audioIndex: 0, delayMs: 1200 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[0], delayMs: 5200 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[1], audioIndex: 1, delayMs: 1400 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[1], delayMs: 5200 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[2], audioIndex: 2, delayMs: 1400 },
  {
    kind: "sms",
    text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup · P1 · Reply 1 to dispatch",
    delayMs: 1800,
    variant: "owner",
  },
  { kind: "system", text: "Owner replied 1 · Dispatching crew", delayMs: 2600 },
  {
    kind: "sms",
    text: "CREW · Jake M · 4821 Oak Dr · Sewage P1 · Reply 1 accept · 2 pass",
    delayMs: 1400,
    variant: "crew",
  },
  { kind: "system", text: "Tech replied 1 · En route", delayMs: 2200 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[3], audioIndex: 3, delayMs: 1400 },
  { kind: "system", text: "Intake saved · Dispatched · 4 min 18 sec", delayMs: 3200 },
];

export const HVAC_PHONE_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 6:42 AM Sat · Forwarded — you're on a install", delayMs: 900 },
  { kind: "ai-voice", text: HVAC_AI_LINES[0], audioIndex: 0, delayMs: 1200 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[0], delayMs: 5200 },
  { kind: "ai-voice", text: HVAC_AI_LINES[1], audioIndex: 1, delayMs: 1400 },
  { kind: "customer-text", text: "No gas smell, no sparking.", delayMs: 3800 },
  { kind: "ai-voice", text: HVAC_AI_LINES[2], audioIndex: 2, delayMs: 1400 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[1], delayMs: 5200 },
  { kind: "ai-voice", text: HVAC_AI_LINES[3], audioIndex: 3, delayMs: 1400 },
  {
    kind: "sms",
    text: "AUTO-DISPATCH · Sarah Bennett · No heat P2 · Tech notified",
    delayMs: 1600,
    variant: "fyi",
  },
  {
    kind: "sms",
    text: "NEW JOB · Sarah Bennett · No heat · 904 Cedar Ln · Reply 1 accept",
    delayMs: 1400,
    variant: "crew",
  },
  { kind: "system", text: "Tech replied 1 · Customer ETA text sent", delayMs: 2400 },
  { kind: "system", text: "Intake saved · Auto-dispatched · 3 min 52 sec", delayMs: 3200 },
];

export const HVAC_GAS_HOLD_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 9:18 PM · Gas smell reported", delayMs: 900 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[0], audioIndex: 0, delayMs: 1200 },
  { kind: "customer-text", text: HVAC_GAS_CUSTOMER_TEXT[0], delayMs: 4800 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[1], audioIndex: 1, delayMs: 1400 },
  { kind: "customer-text", text: HVAC_GAS_CUSTOMER_TEXT[1], delayMs: 5200 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[2], audioIndex: 2, delayMs: 1400 },
  {
    kind: "sms",
    text: "GAS SMELL HOLD · Tom Reyes · 1202 Maple Ct · Reply 1 dispatch · 2 hold",
    delayMs: 1800,
    variant: "owner",
  },
  { kind: "system", text: "Owner replied 2 · Held — no crew sent", delayMs: 3200 },
  { kind: "system", text: "Safety intake saved · Awaiting owner decision", delayMs: 2800 },
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
