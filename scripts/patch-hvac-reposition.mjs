/**
 * HVAC shop-flow repositioning ??marketing + nav copy patch.
 * Run: node scripts/patch-hvac-reposition.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const marketingPath = path.join(root, "lib", "content-marketing-en.ts");

let m = fs.readFileSync(marketingPath, "utf8");

const heroBlock = `export const heroEn = {
  badge: "Night shift for your shop line",
  headline: "They call your number.",
  headlineAccent: "You text 1 to book it.",
  brandLine: "Daytime: you answer. Nights, weekends, and missed rings: Effiroad catches the call, runs HVAC intake, and texts you to approve.",
  subhead:
    "Same shop number on Google and your trucks. Forward when you are on a job or closed. No new app for your crew ??reply 1 to approve, 2 to pass. Jobber sync is optional.",
  trustLine:
    "Not a replacement for Jobber, Housecall Pro, or ServiceTitan. The layer that stops missed calls from becoming your competitor's job.",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "See the shop flow",
  secondaryCtaHref: "/#missed-call-flow",
  heroBadges: [
    "Same shop number",
    "Text 1 to approve",
    "P1 / P2 / P3 triage",
    "Jobber optional",
  ] as const,
};`;

m = m.replace(/export const heroEn = \{[\s\S]*?\} as const,\n\};/, heroBlock);

const missedFlowBlock = `export const missedCallFlowEn = {
  id: "missed-call-flow",
  title: "How a real HVAC shop runs ??with Effiroad on the gaps",
  subtitle:
    "You still answer during the day. Effiroad only handles what you miss: overflow, after hours, and peak-season hold times.",
  steps: [
    {
      id: "day",
      title: "You answer (daytime)",
      description:
        "Business hours: you or office picks up the same shop line customers already trust.",
    },
    {
      id: "call",
      title: "Missed ring forwards",
      description:
        "On a roof, after 6pm, or when three lines ring at once ??unanswered calls route to Effiroad.",
    },
    {
      id: "triage",
      title: "HVAC triage",
      description:
        "P1 no-heat / no-cool / leak. P2 same-day comfort. P3 tune-up or quote. Name, address, and issue captured.",
    },
    {
      id: "intake",
      title: "Customer picks a time",
      description:
        "Phone intake or SMS link. They tap a real open slot ??not a callback promise.",
    },
    {
      id: "approve",
      title: "You text 1 or 2",
      description:
        "Hybrid default: P2/P3 can auto-book; P1 always texts you first. Manual: every job waits for your OK.",
    },
    {
      id: "scheduled",
      title: "Job on your board",
      description:
        "Confirmed visits hit your dashboard and calendar. Jobber Request on approve if connected. Optional crew text after you say yes.",
    },
  ],
};`;

m = m.replace(/export const missedCallFlowEn = \{[\s\S]*?\],\n\};/, missedFlowBlock);

const comparisonBlock = `export const comparisonEn = {
  id: "comparison",
  title: "Why shops pick Effiroad over AI that auto-books without you",
  subtitle:
    "Jobber AI, CallJolt, and HCP CSR AI book straight to the calendar. Effiroad texts you first ??so bad addresses and spam never become jobs.",
  headers: ["", "Effiroad", "AI auto-book", "Answering service"],
  rows: [
    ["Owner approves by text (1 / 2)", "Yes ??core product", "Rare", "Email / portal"],
    ["Wrong job never hits calendar", "Yes ??you gate every booking", "AI decides", "Message only"],
    ["HVAC P1 / P2 / P3 triage", "Built in", "Varies", "Script varies"],
    ["Customer picks real open slot", "Yes", "Often", "Rare"],
    ["Keep your shop number", "Yes", "Forward required", "Often new number"],
    ["Works without Jobber / ST / HCP", "Yes ??SMS + dashboard", "Usually needs CRM", "Separate tool"],
    ["Jobber sync after you approve", "Yes", "On intake", "Manual retype"],
    ["Go live", "~10 minutes", "Days + CRM setup", "Days + scripting"],
    ["Price (typical)", "$199/mo flat", "$99??500+ add-on", "$200??800/mo"],
  ],
};`;

m = m.replace(/export const comparisonEn = \{[\s\S]*?\],\n\};/, comparisonBlock);

const aboutBlock = `export const aboutEn = {
  id: "about",
  badge: "Built for owner-operators",
  title: "CSR fills the bucket. You decide what becomes a job.",
  subtitle:
    "Big shops split call-takers and dispatchers. On a 1?? truck crew, that is you ??Effiroad handles intake so you only approve from the truck.",
  paragraphs: [
    "Answering services leave voicemails. AI receptionists auto-book into your calendar ??including jobs you would have declined. Effiroad captures the call, runs HVAC intake, and texts you: approve or pass.",
    "Hybrid mode is the sweet spot: routine P2/P3 jobs can auto-book while no-heat P1 always waits for your text. Same number. No dispatch software swap.",
  ],
  pillars: [
    {
      label: "Catch",
      meaning: "After-hours and overflow become structured requests ??not voicemail tag.",
    },
    {
      label: "Control",
      meaning: "Text 1 or 2 from the ladder. Nothing confirms without your rules.",
    },
  ],
};`;

m = m.replace(/export const aboutEn = \{[\s\S]*?\],\n\};/, aboutBlock);

const problemBlock = `export const problemEn = {
  title: "At 6:58 AM they wake up sweating. You are writing tickets. Voicemail wins.",
  subtitle:
    "27%+ of shop calls go unanswered. No-heat callers dial the next name on Google. One saved ticket pays for the month.",
  stats: [
    { value: "27%+", label: "of shop calls unanswered" },
    { value: "$400+", label: "avg residential ticket" },
    { value: "80%", label: "of voicemail callers hang up" },
  ],
  callout: "You do not need more leads. You need to answer the line you already advertise.",
};`;

m = m.replace(/export const problemEn = \{[\s\S]*?callout: "[^"]*",\n\};/, problemBlock);

const revenueLeaksBlock = `export const revenueLeaksEn = {
  id: "revenue-leaks",
  label: "Where money leaks",
  title: "Every step maps to a moment shops lose the job",
  subtitle: "Not vague AI. Each feature closes a specific gap in the owner-operator day.",
  items: [
    {
      leak: "6 AM no-cool hits voicemail",
      feature: "Conditional forward + HVAC intake",
      result: "Structured request before they call the next shop",
      money: "$400+ ticket protected",
    },
    {
      leak: "Owner cannot approve from the truck",
      feature: "SMS 1 / 2 with ref code",
      result: "Confirm in seconds ??no app, no portal login",
      money: "Beat the next contractor",
    },
    {
      leak: "AI books jobs you would decline",
      feature: "Owner approval gate",
      result: "Bad ZIP, spam, and shaky details never hit the calendar",
      money: "Fewer dispatch mistakes",
    },
    {
      leak: "Routine jobs wait until morning",
      feature: "Hybrid P2/P3 auto-book",
      result: "Tune-ups confirm while you sleep; P1 still texts you",
      money: "More low-risk revenue",
    },
    {
      leak: "Double entry into Jobber at night",
      feature: "Approve once ??Jobber Request",
      result: "Morning board already has the job",
      money: "No retyping at 7 AM",
    },
  ] as const,
};`;

m = m.replace(/export const revenueLeaksEn = \{[\s\S]*?\] as const,\n\};/, revenueLeaksBlock);

const differentiatorsBlock = `export const differentiatorsEn = {
  title: "What only Effiroad does for small HVAC shops",
  subtitle: "Competitors auto-book. We auto-capture ??you auto-approve.",
  items: [
    {
      title: "Text 1 / 2 approval",
      description:
        "The only layer built around your thumb on a ladder ??not a dispatcher desk. Ref codes so you never mix up jobs.",
    },
    {
      title: "Hybrid by urgency",
      description:
        "P2/P3 routine can auto-book. P1 no-heat always pings you first. Matches how owners actually trust the AI.",
    },
    {
      title: "HVAC intake ??not a generic script",
      description:
        "No-heat, no-cool, gas smell, tune-up. Priority, address, and visit window before you see the alert.",
    },
    {
      title: "Real calendar slots",
      description:
        "Customers pick open times on a private link. Taken slots stay gray. Auto Book or wait for your 1 / 2.",
    },
    {
      title: "Same shop number",
      description:
        "Forward when busy or closed. Google listing and truck wrap stay the same.",
    },
    {
      title: "Jobber when you are ready",
      description:
        "Run on texts and dashboard alone. Connect Jobber once ??approved jobs become Requests automatically.",
    },
    {
      title: "Your customer data",
      description:
        "Homeowner info stays with your shop. No lead marketplace. Links expire.",
    },
  ],
};`;

m = m.replace(/export const differentiatorsEn = \{[\s\S]*?\],\n\};/, differentiatorsBlock);

const schedulingBlock = `export const schedulingModesEn = {
  id: "scheduling",
  label: "Booking",
  title: "Match how you actually run the shop",
  subtitle:
    "Most owner-operators start Hybrid: auto-book routine, manual on emergencies. Switch anytime in settings.",
  modes: [
    {
      id: "speed",
      name: "Auto Book",
      badge: null as string | null,
      tagline: "Customer picks ??job confirms instantly",
      description: "Best for peak season when you trust every intake. You get a heads-up text. Reply 9 to undo.",
      details: [
        { label: "P1 emergencies", value: "Auto confirm" },
        { label: "Owner approval", value: "Skipped" },
        { label: "Undo", value: "Reply 9 in your window" },
      ],
      bestFor: "High-volume routine ??you still review dashboard",
    },
    {
      id: "hybrid",
      name: "Hybrid",
      badge: "Recommended for HVAC",
      tagline: "P2/P3 auto-book 쨌 P1 texts you first",
      description:
        "Default for HVAC: no-heat waits for your 1 / 2. Same-day and tune-ups can confirm while you sleep.",
      details: [
        { label: "P1 no-heat / safety", value: "Always text 1 / 2" },
        { label: "P2 / P3 checked", value: "Auto confirm" },
        { label: "Change anytime", value: "Settings ??booking" },
      ],
      bestFor: "Owner-operators who want speed + control",
    },
    {
      id: "control",
      name: "Manual",
      badge: null as string | null,
      tagline: "Every job waits for your text",
      description: "Customer picks a time. You get full details. Reply 1 or 2. Safest when you are new to forwarding.",
      details: [
        { label: "All priorities", value: "SMS 1 / 2 required" },
        { label: "Alert includes", value: "Time + address + issue" },
        { label: "Also review", value: "Dashboard queue" },
      ],
      bestFor: "First week live or extra-cautious shops",
    },
  ],
  footnote: "After you approve, optional crew SMS ??one tech at a time, 1=accept 2=pass.",
};`;

m = m.replace(/export const schedulingModesEn = \{[\s\S]*?footnote: "[^"]*",\n\};/, schedulingBlock);

const howItWorksBlock = `export const howItWorksEn = {
  id: "how-it-works",
  title: "Live tonight in ~10 minutes",
  subtitle: "Pay ??cell number ??forward rules ??test call ??text 1. No sales call.",
  steps: [
    {
      step: "01",
      title: "Your cell for approvals",
      description: "New requests text this number. Email is backup only.",
    },
    {
      step: "02",
      title: "When Effiroad answers",
      description: "Evenings, weekends, or no-answer ??your hours, your rules.",
    },
    {
      step: "03",
      title: "Forward the main line",
      description: "Customers dial the same shop number. Busy / no answer ??Effiroad.",
    },
    {
      step: "04",
      title: "Test + text 1",
      description: "One test call. Reply 1. See the job on your dashboard ??Jobber if connected.",
    },
  ],
};`;

m = m.replace(/export const howItWorksEn = \{[\s\S]*?\],\n\};/, howItWorksBlock);

const faqBlock = `export const faqEn = {
  title: "Owner questions",
  items: [
    {
      q: "Do I change my phone number?",
      a: "No. Same line on Google and your trucks. You forward unanswered calls behind the scenes.",
    },
    {
      q: "How is this different from Jobber AI or CallJolt?",
      a: "They auto-book into your calendar. Effiroad texts you to approve first ??so you control what becomes a job. Jobber sync runs after you text 1.",
    },
    {
      q: "Does this replace Jobber or ServiceTitan?",
      a: "No. Effiroad is the missed-call layer. Your dispatch software stays. Jobber connect is optional.",
    },
    {
      q: "What if the AI gets something wrong?",
      a: "You text 2 to pass. Hybrid keeps P1 emergencies on manual approval by default. Nothing confirms outside your mode.",
    },
    {
      q: "What is Hybrid vs Auto Book vs Manual?",
      a: "Hybrid (default): P2/P3 can auto-book, P1 texts you. Auto Book: instant confirm. Manual: every job needs your 1 / 2.",
    },
    {
      q: "Who answers during the day?",
      a: "You do ??same as today. Effiroad only picks up forwarded calls when you miss them or after hours.",
    },
    {
      q: "Can it text my tech after I approve?",
      a: "Optional round-robin: one tech at a time, reply 1=accept 2=pass. You approve the job first.",
    },
    {
      q: "How fast to go live?",
      a: "About 10 minutes: contact, hours, forward, test call.",
    },
    {
      q: "Who is this for?",
      a: "US residential HVAC ??1 to 5 trucks, owner-operators losing after-hours and on-job calls.",
    },
  ],
};`;

m = m.replace(/export const faqEn = \{[\s\S]*?\],\n\};/, faqBlock);

const ctaBlock = `export const ctaEn = {
  eyebrow: "Your competitor answers at 7 PM. You can too.",
  title: "Forward tonight. Text 1 tomorrow.",
  subtitle: "Same number. HVAC intake. You approve every job.",
  button: CHECKOUT_CTA,
};`;

m = m.replace(/export const ctaEn = \{[\s\S]*?button: CHECKOUT_CTA,\n\};/, ctaBlock);

const navBlock = `export const navEn = {
  product: "Shop flow",
  about: "Why us",
  scheduling: "Booking",
  howItWorks: "Go live",
  pricing: "Pricing",
  getStarted: "Get started",
};`;

m = m.replace(/export const navEn = \{[\s\S]*?getStarted: "[^"]*",\n\};/, navBlock);

fs.writeFileSync(marketingPath, m, "utf8");
console.log("Patched content-marketing-en.ts");

