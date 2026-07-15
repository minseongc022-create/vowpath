/** AI voice lines for the landing demo — warm male US dispatcher, customer text only. */
export const VOICE_DEMO_AI_LINES = [
  "Hey there — thanks so much for calling Ridgeline Restoration! I'm right here with you... what's going on?",
  "Oh, I'm really glad you called, okay? We're gonna take care of this together. Can I get your name and the address for me?",
  "Got it, Mike — okay, that sounds like a sewage backup. I'm flagging this urgent and getting your team alerted right now, alright?",
  "You're in good hands, Mike — I promise. A tech is on the way, and you'll get a text with their ETA in just a minute, okay?",
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

export const PHONE_DEMO_TIMELINE: PhoneDemoPhase[] = [
  { kind: "system", text: "Incoming call · 2:14 AM", delayMs: 600 },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[0],
    audioIndex: 0,
    delayMs: 900,
  },
  {
    kind: "customer-text",
    text: VOICE_DEMO_CUSTOMER_TEXT[0],
    delayMs: 4500,
  },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[1],
    audioIndex: 1,
    delayMs: 1200,
  },
  {
    kind: "customer-text",
    text: VOICE_DEMO_CUSTOMER_TEXT[1],
    delayMs: 4500,
  },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[2],
    audioIndex: 2,
    delayMs: 1200,
  },
  {
    kind: "sms",
    text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup · P1 · Reply 1 to dispatch",
    delayMs: 1600,
  },
  { kind: "system", text: "Owner replied 1 · Crew dispatched", delayMs: 2200 },
  {
    kind: "ai-voice",
    text: VOICE_DEMO_AI_LINES[3],
    audioIndex: 3,
    delayMs: 1200,
  },
  { kind: "system", text: "Intake saved · Dispatched · 4 min 12 sec", delayMs: 2400 },
];
