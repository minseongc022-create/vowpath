/** Shared demo animation scripts — used by IntakeCallDemo, recording pages, and hero videos. */

export type DemoRole = "caller" | "ai" | "system" | "sms";

export type DemoStep = {
  role: DemoRole;
  text: string;
  /** ms to wait BEFORE showing this bubble */
  delay: number;
};

export const VOICE_EMERGENCY_DEMO: DemoStep[] = [
  { role: "system", text: "Incoming call · 2:14 AM", delay: 500 },
  {
    role: "ai",
    text: "Hey, thanks for calling Ridgeline Restoration. What's going on?",
    delay: 900,
  },
  {
    role: "caller",
    text: "Water's flooding my basement — it's coming up through the floor drain.",
    delay: 2200,
  },
  {
    role: "ai",
    text: "I'm really glad you called — we'll take care of this. What's your name?",
    delay: 1500,
  },
  { role: "caller", text: "Mike Wilson.", delay: 1600 },
  {
    role: "ai",
    text: "Thanks, Mike. What's the full property address — street, city, and state?",
    delay: 1400,
  },
  { role: "caller", text: "4821 Oak Drive, Austin, Texas.", delay: 1800 },
  {
    role: "ai",
    text: "A sewage backup can move fast. I'm marking this urgent and texting the owner for approval now.",
    delay: 1400,
  },
  {
    role: "sms",
    text: "NEW JOB · Mike Wilson · 4821 Oak Dr · Sewage backup, rising · P1 · Reply 1 to dispatch · 2 pass",
    delay: 1100,
  },
  { role: "system", text: "Owner replied 1 · Crew dispatched", delay: 2000 },
  {
    role: "ai",
    text: "You're all set, Mike — a tech is on the way. You'll get a text with their ETA shortly.",
    delay: 1400,
  },
  { role: "system", text: "Intake saved · Dispatched · 4 min 12 sec", delay: 1200 },
];

export const ESTIMATE_DEMO: DemoStep[] = [
  { role: "system", text: "Incoming call · 10:32 AM", delay: 500 },
  {
    role: "ai",
    text: "Hi there, thanks for calling Ridgeline Restoration! What's going on?",
    delay: 900,
  },
  {
    role: "caller",
    text: "Hi, I need a free estimate for some mold in the basement — nothing urgent.",
    delay: 2000,
  },
  {
    role: "ai",
    text: "Absolutely — we do free estimates all the time. Want me to text you a quick form, or walk through it on the phone?",
    delay: 1500,
  },
  { role: "caller", text: "Text me the form, that'd be easier.", delay: 1600 },
  {
    role: "ai",
    text: "Perfect — just sent that. You're in good hands. Fill it out when you get a sec and our team will reach out!",
    delay: 1400,
  },
  {
    role: "sms",
    text: "Ridgeline: Hi! Thanks for calling! Finish here (~1 min): link.effiroad.com/r/…",
    delay: 1000,
  },
  { role: "system", text: "Estimate request logged · Owner notified", delay: 1800 },
];

export const DISPATCH_DEMO: DemoStep[] = [
  { role: "system", text: "Dashboard · Live", delay: 400 },
  {
    role: "sms",
    text: "NEW JOB · Sarah Bennett · No heat, Denver CO · P1 · Reply 1 dispatch · 2 pass",
    delay: 1200,
  },
  { role: "system", text: "Owner replied: 1", delay: 1800 },
  {
    role: "ai",
    text: "Good news, Sarah — a technician is on the way. You'll get a text with their ETA shortly.",
    delay: 1200,
  },
  { role: "system", text: "Crew dispatched · Calendar updated · Customer notified", delay: 1500 },
  {
    role: "sms",
    text: "Comfort Air: Your tech is en route — ETA ~45 min. Reply STOP to opt out.",
    delay: 1200,
  },
  { role: "system", text: "3 min 40 sec · call to dispatch", delay: 2000 },
];

export type DemoSceneId = "voice" | "estimate" | "dispatch";

export const DEMO_SCENES: Record<
  DemoSceneId,
  { title: string; subtitle: string; steps: DemoStep[]; statusTime: string }
> = {
  voice: {
    title: "Voice Intake",
    subtitle: "Emergency call → intake → dispatch",
    steps: VOICE_EMERGENCY_DEMO,
    statusTime: "2:14 AM",
  },
  estimate: {
    title: "Free Estimate",
    subtitle: "Conversational estimate → text link",
    steps: ESTIMATE_DEMO,
    statusTime: "10:32 AM",
  },
  dispatch: {
    title: "Smart Dispatch",
    subtitle: "Owner SMS approve → crew out",
    steps: DISPATCH_DEMO,
    statusTime: "Live",
  },
};
