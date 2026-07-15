/** AI voice lines — deep warm male US dispatcher; customer text only in demo. */
export const VOICE_DEMO_AI_LINES = [
  "Hey — thanks for calling Ridgeline Restoration. You've got me. What's going on over there?",
  "I'm really glad you called. We'll take care of this. What's your name, and what's the address?",
  "Got it, Mike. Sounds like a sewage backup — I'm marking this urgent and paging the crew right now.",
  "You're all set, Mike. Someone's already heading your way. You'll get a text with their ETA in just a minute.",
] as const;

export const VOICE_DEMO_CUSTOMER_TEXT = [
  "Water's flooding my basement — it's coming up through the floor drain.",
  "Mike Wilson, 4821 Oak Drive, Austin.",
] as const;

export type PhoneDemoPhase =
  | { kind: "system"; text: string; delayMs: number }
  | { kind: "customer-text"; text: string; delayMs: number }
  | { kind: "ai-voice"; text: string; audioIndex: number; delayMs: number }
  | { kind: "sms"; text: string; delayMs: number };

/** Full intake flow: ring → answer → intake → owner SMS → dispatch → close */
export const PHONE_DEMO_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 2:14 AM", delayMs: 800 },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[0],
    audioIndex: 0,
    delayMs: 1200,
  },
  {
    kind: "customer-text",
    text: VOICE_DEMO_CUSTOMER_TEXT[0],
    delayMs: 5200,
  },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[1],
    audioIndex: 1,
    delayMs: 1400,
  },
  {
    kind: "customer-text",
    text: VOICE_DEMO_CUSTOMER_TEXT[1],
    delayMs: 5200,
  },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[2],
    audioIndex: 2,
    delayMs: 1400,
  },
  {
    kind: "sms",
    text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup · P1 · Reply 1 to dispatch",
    delayMs: 1800,
  },
  { kind: "system", text: "Owner replied 1 · Crew dispatched", delayMs: 2800 },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[3],
    audioIndex: 3,
    delayMs: 1400,
  },
  { kind: "system", text: "Intake saved · Dispatched · 4 min 12 sec", delayMs: 3200 },
];

/** Total scene runtime for recording (ms) — one full call, no loop. */
export function phoneDemoTotalMs(): number {
  let cursor = 400;
  for (const phase of PHONE_DEMO_TIMELINE) cursor += phase.delayMs;
  return cursor + 6000;
}
