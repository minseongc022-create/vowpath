import type { DemoVertical } from "./demo-vertical-config";

/** Receptionist voice lines — warm US dispatcher; customer text only in demo. One question per turn. */
export const RESTORATION_AI_LINES = [
  "Hey, thanks for calling Ridgeline Restoration. What's going on?",
  "I'm really glad you called — we'll take care of this. What's your name?",
  "Thanks, Mike. What's the full property address — street, city, and state?",
  "A sewage backup can move fast. I'm marking this urgent and texting the owner for approval now.",
  "You're all set, Mike. Jake accepted the job and is heading your way. You'll get his ETA by text in just a moment.",
] as const;

export const HVAC_AI_LINES = [
  "Comfort Air HVAC, thanks for calling. What's going on at the house?",
  "I'm sorry you're dealing with that, especially this early. Quick safety check — do you smell gas or hear any sparking?",
  "Good — no gas smell. What's your name?",
  "Thanks, Sarah. What's the full service address?",
  "Got it. That's a verified no-heat call, so I'm dispatching your on-call tech now. You'll get an ETA text shortly.",
] as const;

export const HVAC_GAS_AI_LINES = [
  "Comfort Air HVAC, you've reached us. Tell me what's happening — and whether anyone feels sick.",
  "I hear you. Gas smell is serious, so I'm not sending anyone blindly. What's your name?",
  "Thank you. What's the full property address?",
  "Got it. I'm holding this as a safety call and texting the owner now, so they can decide the safest next step.",
] as const;

export const RESTORATION_CUSTOMER_TEXT = [
  "Water's flooding my basement — it's coming up through the floor drain.",
  "Mike Wilson.",
  "4821 Oak Drive, Austin, Texas.",
] as const;

export const HVAC_CUSTOMER_TEXT = [
  "No heat — it's fifty-eight degrees inside and we've got kids home.",
  "No gas smell, no sparking.",
  "Sarah Bennett.",
  "904 Cedar Lane, Round Rock, Texas.",
] as const;

export const HVAC_GAS_CUSTOMER_TEXT = [
  "I smell gas near the furnace — it's faint but I'm worried.",
  "Tom Reyes.",
  "1202 Maple Court, Round Rock. Everyone's out of the basement.",
] as const;

export type PhoneDemoPhase =
  | { kind: "system"; text: string; delayMs: number }
  | { kind: "customer-text"; text: string; delayMs: number }
  | { kind: "ai-voice"; text: string; audioIndex: number; delayMs: number }
  | { kind: "sms"; text: string; delayMs: number; variant?: "owner" | "crew" | "fyi" };

export const RESTORATION_PHONE_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 2:14 AM · Forwarded — owner is on a job", delayMs: 900 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[0], audioIndex: 0, delayMs: 900 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[0], delayMs: 1300 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[1], audioIndex: 1, delayMs: 1000 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[1], delayMs: 1200 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[2], audioIndex: 2, delayMs: 1000 },
  { kind: "customer-text", text: RESTORATION_CUSTOMER_TEXT[2], delayMs: 1400 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[3], audioIndex: 3, delayMs: 1000 },
  {
    kind: "sms",
    text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup · P1 · Reply 1 to dispatch · 2 pass",
    delayMs: 1000,
    variant: "owner",
  },
  { kind: "system", text: "Owner replied 1 · Dispatching crew", delayMs: 1500 },
  {
    kind: "sms",
    text: "CREW · Jake M · 4821 Oak Dr · Sewage P1 · Reply 1 accept · 2 pass",
    delayMs: 1000,
    variant: "crew",
  },
  { kind: "system", text: "Tech replied 1 · En route · ETA 32 min", delayMs: 1700 },
  { kind: "ai-voice", text: RESTORATION_AI_LINES[4], audioIndex: 4, delayMs: 900 },
  { kind: "system", text: "Customer ETA text sent · Intake saved · Dispatched", delayMs: 1800 },
];

export const HVAC_PHONE_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 6:42 AM Sat · Forwarded — owner is on an install", delayMs: 900 },
  { kind: "ai-voice", text: HVAC_AI_LINES[0], audioIndex: 0, delayMs: 900 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[0], delayMs: 1300 },
  { kind: "ai-voice", text: HVAC_AI_LINES[1], audioIndex: 1, delayMs: 1000 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[1], delayMs: 1200 },
  { kind: "ai-voice", text: HVAC_AI_LINES[2], audioIndex: 2, delayMs: 1000 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[2], delayMs: 1200 },
  { kind: "ai-voice", text: HVAC_AI_LINES[3], audioIndex: 3, delayMs: 1000 },
  { kind: "customer-text", text: HVAC_CUSTOMER_TEXT[3], delayMs: 1300 },
  { kind: "ai-voice", text: HVAC_AI_LINES[4], audioIndex: 4, delayMs: 1000 },
  {
    kind: "sms",
    text: "AUTO-DISPATCH · Sarah Bennett · No heat P2 · Tech notified",
    delayMs: 900,
    variant: "fyi",
  },
  {
    kind: "sms",
    text: "NEW JOB · Sarah Bennett · No heat · 904 Cedar Ln · Reply 1 accept",
    delayMs: 900,
    variant: "crew",
  },
  { kind: "system", text: "Tech replied 1 · En route · ETA 28 min", delayMs: 1700 },
  { kind: "system", text: "Customer ETA text sent · Intake saved · Auto-dispatched", delayMs: 1800 },
];

export const HVAC_GAS_HOLD_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 9:18 PM · Gas smell reported", delayMs: 900 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[0], audioIndex: 0, delayMs: 900 },
  { kind: "customer-text", text: HVAC_GAS_CUSTOMER_TEXT[0], delayMs: 1300 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[1], audioIndex: 1, delayMs: 1000 },
  { kind: "customer-text", text: HVAC_GAS_CUSTOMER_TEXT[1], delayMs: 1200 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[2], audioIndex: 2, delayMs: 1000 },
  { kind: "customer-text", text: HVAC_GAS_CUSTOMER_TEXT[2], delayMs: 1400 },
  { kind: "ai-voice", text: HVAC_GAS_AI_LINES[3], audioIndex: 3, delayMs: 1000 },
  {
    kind: "sms",
    text: "GAS SMELL HOLD · Tom Reyes · 1202 Maple Ct · Reply 1 dispatch · 2 hold",
    delayMs: 1000,
    variant: "owner",
  },
  { kind: "system", text: "Owner replied 2 · Held — no crew sent", delayMs: 1700 },
  { kind: "system", text: "Safety intake saved · Customer gets next-step text", delayMs: 1800 },
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
