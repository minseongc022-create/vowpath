import { SITE } from "./constants";
import { TRIAL_DAYS } from "./billing-cohort";
import { getCheckoutCta } from "./marketing-constants";
import {
  planVolumeGuideEn,
  pricingVolumeTipEn,
  PRICING_GUARANTEES_EN,
  PRICING_TRANSPARENCY_FOOTNOTE_EN,
} from "./plan-volume-guide";
import {
  proUsageLine,
  scaleUsageLine,
  voiceProUsageLine,
  voiceStarterUsageLine,
} from "./plan-pricing";

const CHECKOUT_CTA = getCheckoutCta();

/** Vertical-neutral — shown identically on every landing page above the vertical-specific
 *  sections below it. Keep this short: the pitch that's true for any home-service shop. */
export const heroEn = {
  badge: "The Road to Efficiency",
  headline: "Never miss another emergency job.",
  headlineAccent: "Answer. Dispatch. Document — around the clock.",
  brandLine:
    "When your crew can't pick up, Effiroad answers like a trained receptionist — clear cinematic US voice, calm and thorough. Then smart dispatch: clear jobs roll to your on-call tech; risky or unclear intakes wait for your text — reply 1 to send, 2 to pass.",
  subhead:
    "Built for independent restoration and home-service shops. Keep your main number or use a dedicated Effiroad line. Auto crew texts, live ETA map, owner control — no CRM required.",
  trustLine: "1–15 crew shops · No CRM required · Forward or dedicated number",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "See how it works",
  secondaryCtaHref: "/#how-it-works",
  heroBadges: [
    "Thick clear US male voice",
    "Keep your number — or ours",
    "Auto crew SMS + live ETA map",
    "Owner 1 / 2 on risky jobs",
  ] as const,
};

export const quickFaqEn = {
  id: "quick-qa",
  label: "Quick answers",
  title: "Why Effiroad beats typical answering services",
  subtitle:
    "The questions owners ask first — and how we're built differently from hybrids, per-minute VRs, and CRM add-ons.",
  items: [
    {
      q: "Why Effiroad instead of a typical answering service?",
      a: "We don't just take a message. Clear jobs auto-text your crew (accept/pass). Risky jobs wait for your 1 / 2. Customers get ETA SMS + a free live map — answering services rarely do any of that.",
    },
    {
      q: "Does the AI actually sound human?",
      a: "Yes — thick, clear US male voice, natural pacing, polite follow-ups. Tuned for phone clarity so callers hear every word, not a muddy, thin, or robotic script.",
    },
    {
      q: "Will it collect complete job info before dispatch?",
      a: "Address, issue type, urgency, and trade-specific notes (insurance for restoration, system details for HVAC) — verified on the call or SMS link. Clear jobs dispatch while they wait; edge cases wait for you.",
    },
    {
      q: "How is this different from a CRM add-on receptionist?",
      a: "Works with or without Jobber. Conversational intake by trade — not checkbox questions. Three forwarding paths plus a dedicated Effiroad number with the same AI quality.",
    },
    {
      q: "Do I have to change my phone number?",
      a: "No. Keep your main number and forward busy/no-answer — or use your Effiroad dedicated number as the after-hours (or main) line. Same cinematic voice and dispatch either way; dedicated is recommended when carriers block overflow.",
    },
    {
      q: "What do contractors complain about elsewhere?",
      a: "Bill shock, inconsistent agents, message-only on complex calls, CRM lock-in, weeks of onboarding. Effiroad: clear plans, instant AI pickup, real crew dispatch + live map, ~10-minute go-live.",
    },
  ],
} as const;

export const callExperienceEn = {
  id: "call-experience",
  label: "Phone experience",
  title: "Sounds cinematic. Collects everything. Dispatches right.",
  subtitle:
    "Homeowners in a panic don't want a form or hold music — they want someone clear and calm who gets the address right and gets a tech rolling.",
  points: [
    {
      title: "Thick, clear US male voice",
      body: "Phone-tuned masculine US voice — grounded and clear, not muddy, thin, or robotic. Same professional voice on every call, 2 AM or 2 PM.",
    },
    {
      title: "Polite, respectful intake",
      body: "Listens first, asks one question at a time, and confirms details back — the way a good receptionist would. Short main menu (1 = service, 2 = estimate) then straight to AI — no second keypad, no live-agent transfer fees.",
    },
    {
      title: "Complete info before dispatch",
      body: "Name and issue on the call; address confirmed on a secure SMS link with typed/map search (not misheard street numbers). Then pick the visit window — no verbal calendar slots.",
    },
    {
      title: "Schedule, then roll the truck",
      body: "Once address + time are confirmed, clear jobs can schedule and text your crew (accept/pass). Risky or unclear intakes ping you: 1 = go, 2 = pass — then live ETA map for the homeowner.",
    },
  ],
  contrast: {
    title: "What we fixed that reviews flag elsewhere",
    theirs: [
      "Per-minute billing and surprise transfer fees",
      "Rigid form-style questions — \"a form with a voice\"",
      "Complex calls default to message-taking only",
      "No crew texting / no live customer map",
    ],
    ours: [
      "Clear plans: dispatch billing or Voice per-minute — no surprise transfer fees",
      "Conversational intake tuned for restoration + HVAC",
      "Real auto crew dispatch on clear jobs — you approve the edge cases",
      "On-my-way SMS + free live ETA map (no app install)",
    ],
  },
} as const;

export const productStackEn = {
  id: "product-stack",
  label: "What Effiroad is",
  title: "One platform — three layers",
  subtitle:
    "Answering services take a message. Effiroad captures the loss, triages urgency, alerts you when it matters, and gets a tech rolling — without voicemail roulette.",
  layers: [
    {
      id: "phone",
      tier: "core" as const,
      badge: "Main",
      label: "AI phone layer",
      title: "Catch every emergency you miss on site",
      description:
        "After-hours, storm surge, and no-answer overflow forward to Effiroad. Short menu: press 1 = service AI, press 2 = estimate AI — or say “text link” for an SMS form. Loss type, address, and how fast they need you.",
      points: [
        "Same company number on Google",
        "Water / fire / mold / sewage triage",
        "Phone or SMS link intake",
        "Smart dispatch + owner 1 / 2",
      ],
    },
    {
      id: "analytics",
      tier: "sub" as const,
      badge: null,
      label: "AI analytics",
      title: "See what almost went to the franchise",
      description:
        "Dashboard KPIs and missed-call prevention — know what would have hit voicemail and what turned into a booked emergency job.",
      points: [
        "Emergencies, pending dispatch, confirmations",
        "Missed-call analytics page",
        "Trend charts + drill-downs",
        "Recovery estimates (not accounting)",
      ],
    },
    {
      id: "assistant",
      tier: "sub" as const,
      badge: null,
      label: "Effiroad AI",
      title: "Your ops assistant in your pocket",
      description:
        "Ask what came in overnight, what's waiting on your 1 / 2, or who's on the way — and change dispatch rules in plain English from the truck.",
      points: [
        "Morning briefing on open",
        "Pending approvals + Cat-3 flags",
        "Guarded settings changes",
        "Optional daily SMS briefing",
      ],
    },
  ],
  footnote:
    "Optional CRM sync, crew round-robin texts, and secure update/reschedule links are built in — connect what you use, skip what you don't.",
};

export const missedCallFlowEn = {
  id: "missed-call-flow",
  title: "From ring to on-site — without losing the claim",
  subtitle:
    "What the homeowner experiences from the first call until your crew arrives. You stay in control; Effiroad handles the gaps.",
  steps: [
    {
      id: "call",
      title: "Homeowner calls your line",
      description:
        "Same number on your trucks and Google — no new number to explain when they're standing in ankle-deep water.",
    },
    {
      id: "forward",
      title: "You miss it → Effiroad answers",
      description:
        "On a job, after hours, or when three lines ring at once — unanswered calls forward to the AI phone layer.",
    },
    {
      id: "intake",
      title: "Intake + loss triage",
      description:
        "Phone or SMS link. Water category, active leak, address, and insurance carrier — not a vague “we'll call you back.”",
    },
    {
      id: "approve",
      title: "Dispatch or hold",
      description:
        "Standard water losses can auto-dispatch. Large fire jobs, Cat-3 sewage, or fuzzy details wait for your text: 1 = go, 2 = pass.",
    },
    {
      id: "dispatch",
      title: "Crew gets the loss",
      description:
        "Optional round-robin crew SMS — accept or pass. Job Card ready with notes for mitigation.",
    },
    {
      id: "onway",
      title: "On the way text",
      description:
        "Tech replies with ETA — homeowner gets an on-the-way message without you typing it twice.",
    },
    {
      id: "arrival",
      title: "Crew on site",
      description:
        "Mitigation starts in the window you promised. Mark complete in dashboard — full claim relationship stays with you.",
    },
  ],
};

export const approvalLoopEn = {
  id: "approval-loop",
  label: "Smart dispatch",
  title: "Auto-dispatch the clear losses. Ping you for what needs a human.",
  summary:
    "Generic AI forwards a message. Effiroad auto-dispatches standard water jobs with complete info — but holds fire losses, Cat-3 sewage, and unclear addresses for your 1 / 2 before anyone rolls.",
  tags: ["Standard water = auto-dispatch", "Fire / Cat-3 → 1 / 2", "Unclear → 1 / 2", "Reply 9 undo"] as const,
  smsExample: {
    customer: "Sarah Mitchell",
    issue: "Basement flooding",
    window: "Tonight · on-call",
    approveLabel: "Standard loss = auto-dispatched",
    declineLabel: "Fire / Cat-3 / unclear = Reply 1 · 2",
  },
  nodes: [
    { id: "customer", title: "Caller reports loss", caption: "Address + loss type" },
    { id: "effiroad", title: "Effiroad", caption: "Standard dispatches" },
    { id: "owner", title: "Your phone", caption: "Big loss / unclear → 1 / 2" },
    { id: "customer-out", title: "Crew en route", caption: "SMS + Job Card" },
  ] as const,
  edges: [
    "Restoration triage + intake",
    "Clear water loss dispatches fast",
    "Fire, Cat-3, P1 mold, or fuzzy details → your text",
  ] as const,
};

export const aboutEn = {
  id: "about",
  badge: "The Road to Efficiency",
  title: "Efficiency is the Road to Limitless Success",
  subtitle:
    "In restoration, the first company to answer usually wins the mitigation job. Effiroad is the efficient path from ring to rolling truck.",
  paragraphs: [
    "Efficiency means fewer steps between a missed ring and a crew on site: intake, triage, owner SMS when the loss is big, and homeowner updates without opening ten apps.",
    "Road is the through-line — from the first call to dispatch, on-the-way texts, and optional CRM sync. Built for US owner-operators who live on their cell between jobs.",
    "Effiroad is not just software. It is the efficient path your company takes every day — from emergency call to crew rolling.",
  ],
  pillars: [
    {
      label: "Efficiency",
      meaning: "Auto-dispatch clear water losses. Text 1 / 2 when it's fire, Cat-3, P1 mold, or unclear.",
    },
    {
      label: "Road",
      meaning: "Every step connected — forward, intake, approve, dispatch, on-site — without dead ends.",
    },
  ],
};

export const problemEn = {
  id: "problem",
  title: "At 11 PM the pipe bursts. You're still on a fire job. Servpro answers.",
  subtitle:
    "Industry studies show a large share of restoration calls go unanswered after hours. Homeowners don't leave voicemail — they call the next name on Google. One saved mitigation pays for the year.",
  stats: [
    { value: "20–47%", label: "of after-hours calls go unanswered (industry studies)" },
    { value: "$8,000+", label: "avg water loss job" },
    { value: "~85%", label: "of callers try the next company if you don't answer (industry studies)" },
  ],
  callout: "You don't need more leads. You need to answer the line you already advertise.",
};

export const revenueLeaksEn = {
  id: "revenue-leaks",
  label: "Revenue leaks",
  title: "Every feature closes a place where revenue leaks out",
  subtitle:
    "Not vague AI promises. Each workflow is tied to a moment where restoration companies lose calls, dispatch delays, or entire claims.",
  items: [
    {
      leak: "Missed calls while crews are on site",
      feature: "AI phone + SMS link intake",
      result: "Turns voicemail into a structured emergency request",
      money: "$8,000+ job protected",
    },
    {
      leak: "Slow response loses the claim",
      feature: "Auto-dispatch + instant crew text",
      result: "Homeowner books you before they dial the franchise",
      money: "Minutes, not hours",
    },
    {
      leak: "Callers bouncing to national brands",
      feature: "Secure private intake links",
      result:
        "Branded SMS link — loss details captured fast. Standard jobs dispatch; complex ones wait for your 1 / 2",
      money: "First responder wins the claim",
    },
    {
      leak: "Owner buried in repeat questions",
      feature: "Smart dispatch + owner exceptions",
      result: "Standard water dispatches while you work; only fire / Cat-3 / unclear ping you",
      money: "More jobs without more thumb time",
    },
    {
      leak: "No visibility on overnight losses",
      feature: "Missed-call analytics + Effiroad AI",
      result: "See what came in at 2 AM and what almost went to a competitor",
      money: "Recovery you can measure",
    },
  ] as const,
};

export const differentiatorsEn = {
  id: "differentiators",
  title: "What shops get with Effiroad — and competitors usually don't",
  subtitle: "Real product features shipping today — not a message-taker with a fancy demo.",
  items: [
    {
      title: "Keep your number — or use ours",
      description:
        "Forward busy/no-answer from your main line, or make your Effiroad dedicated number the after-hours (or primary) line. Same AI quality either way; dedicated is recommended when carriers block overflow.",
    },
    {
      title: "Auto crew dispatch (accept / pass)",
      description:
        "Clear jobs text your on-call techs in order. They reply 1 = yes, 2 = pass. No reply? We move to the next tech automatically.",
    },
    {
      title: "Live ETA map for homeowners",
      description:
        "When a tech is on the way, the customer gets SMS with ETA plus a free live map link (browser GPS — no paid map API, no app install).",
    },
    {
      title: "Trade-aware rules (restoration vs HVAC)",
      description:
        "Water can auto-roll; fire/Cat-3 wait for you. HVAC: clear no-heat/no-cool can auto; gas smell or sparking always holds. Rules don't mix across trades.",
    },
    {
      title: "Owner 1 / 2 + undo 9",
      description:
        "Risky or unclear intakes ping your phone. Reply 1 to dispatch, 2 to pass, 9 to undo a bad auto-roll — competitors often book blind or only leave a message.",
    },
    {
      title: "SMS link intake",
      description:
        "Caller prefers text? They get a short form link — same triage, address verify, and dispatch path as the phone AI.",
    },
    {
      title: "Optional Jobber sync",
      description:
        "Confirmed jobs can push to Jobber. Run on SMS + dashboard alone until you're ready — no CRM lock-in.",
    },
  ],
};

export const jobberEn = {
  id: "integrations",
  label: "Optional",
  title: "Already using Jobber or a CRM? Plug it in.",
  subtitle:
    "No CRM is required. Most restoration shops run on texts and the dashboard. If Jobber is how you track jobs: Connect → Jobber login → Allow Access — saved automatically, no extra Confirm step.",
  points: [
    {
      title: "No CRM? You're covered",
      description:
        "Owner SMS, email backup, Job Cards, and the Effiroad dashboard. Nothing else to buy or connect.",
    },
    {
      title: "One-tap Jobber connect",
      description:
        "Settings → Connect Jobber → log in → Allow Access. Confirmed jobs push customer, address, and loss type into Jobber — no retyping.",
    },
    {
      title: "No re-typing",
      description:
        "Confirmed jobs push to your schedule automatically — one-way, on confirm. No copy-paste from a text thread at 6 AM.",
    },
  ],
  footnote: "Connect or skip in settings. Effiroad works either way.",
};

export const comparisonEn = {
  id: "comparison",
  title: "Why shops pick Effiroad over typical alternatives",
  subtitle:
    "Independent reviews flag billing surprises, rigid scripts, and weeks-long setup elsewhere. Effiroad ships cinematic voice, auto crew texting, live ETA map, and trade-aware holds — go live in minutes.",
  headers: ["", "Effiroad", "Typical answering service", "CRM add-on / enterprise AI"],
  rows: [
    ["Phone voice", "Thick clear US male AI every call", "Human variance or transfers", "Often rigid / form-like"],
    ["Your number options", "Forward main line OR dedicated Effiroad #", "Usually their number only", "Depends on CRM"],
    ["Address accuracy", "Typed/map confirm on SMS link — not STT", "Often verbal / misheard", "Varies"],
    ["Crew auto-dispatch", "Round-robin SMS · 1=yes / 2=pass", "Callback / message only", "Calendar book or blind"],
    ["Live ETA map", "Free customer map link on the way", "Rare", "Rare / paid add-on"],
    ["Risky jobs", "Owner SMS 1 / 2 — never blind", "Script / message only", "Often blind auto-book"],
    ["Trade-aware rules", "Restoration ≠ HVAC policies", "One generic script", "One generic script"],
    ["Works without CRM", "Yes — SMS + dashboard", "Yes", "Often CRM-locked"],
    ["Pricing", `Dispatch from ${SITE.flexBasePrice}/mo · Voice from ${SITE.voiceStarterPrice}/mo`, "Per-minute + transfer fees", "Add-on / $1K+ enterprise"],
    ["Go live", "~10 minutes", "Days + scripting", "Days to weeks"],
  ],
};

export const competitorWinEn = {
  id: "why-we-win",
  label: "What reviews say elsewhere",
  title: "We fixed what contractors complain about — and shipped more",
  subtitle:
    "Common pain points from public reviews and trade forums — plus Effiroad advantages answering services and CRM bots usually lack.",
  pillars: [
    {
      title: "Your number, your way",
      body: "Keep the main line with forwarding — or run a dedicated Effiroad number with the same cinematic AI. Recommended dedicated path when carriers block overflow.",
    },
    {
      title: "Auto crew + live map",
      body: "Clear jobs text techs (1/2). On the way: homeowner gets ETA SMS + free live map — not just \"someone will call you back.\"",
    },
    {
      title: "Trade-aware holds",
      body: "Restoration and HVAC rules stay separate. Clear P1 water / no-heat can move after address+time confirm; gas, fire, Cat-3, P1 mold, commercial, and fuzzy details wait for your 1 / 2.",
    },
    {
      title: "Address on the link",
      body: "Phone STT mishears street numbers. Effiroad texts a secure typed/map address confirm + visit window — fewer wrong-truck rolls than pure verbal intake.",
    },
  ],
  competitors: [
    {
      name: "AI + live-agent hybrids",
      pains: [
        "AI transfers to live agents without consent — extra charges",
        "Billing surprises from add-ons and spam-call overages",
        "Receptionist quality varies call to call",
      ],
      fix: "Clear published pricing — no live-agent transfer fees. Same cinematic AI voice every time. Real crew dispatch + live map built in.",
    },
    {
      name: "Per-minute virtual receptionists",
      pains: [
        "Per-minute billing with 60-second rounding — hangups still bill",
        "Message-taking when the call gets complex",
        "No auto tech texting or customer live map",
      ],
      fix: "Dispatch plans bill per approved job — or Voice plans with clear minutes. Instant AI answer, crew SMS, live ETA map.",
    },
    {
      name: "CRM add-on AI receptionists",
      pains: [
        "Rigid form-style questions — 'a form with a voice'",
        "CRM-locked; forwarding still on you",
        "Blind book or message-only on edge cases",
      ],
      fix: "Works with or without Jobber. Conversational trade intake. Owner 1/2 holds + dedicated-number fallback.",
    },
    {
      name: "Enterprise trade AI platforms",
      pains: [
        "Enterprise pricing; multi-week onboarding",
        "Platform-locked for full value",
        "Overkill for 1–15 crew shops",
      ],
      fix: "Transparent pricing for owner-operators. ~10-minute go-live. Optional CRM sync — no single platform required.",
    },
  ],
  footnote:
    "Based on patterns from public review sites, trade forums, and independent contractor comparisons (2024–2026). No endorsement implied.",
};

export const featuresEn = {
  title: "Everything that ships today — and beats a message-taker",
  subtitle:
    "AI phone is the core. Auto crew dispatch, live ETA map, trade rules, and analytics are built in — not upsells on a generic call bot.",
  items: [
    {
      title: "AI phone + link intake",
      description:
        "Forwarded calls and SMS intake links. Trade-aware triage, verified address, and dispatch-ready notes.",
      tag: "Core",
    },
    {
      title: "Main number or dedicated line",
      description:
        "Keep your company number with forwarding — or use your Effiroad dedicated number. Same cinematic voice either way.",
      tag: "Core",
    },
    {
      title: "Smart dispatch + owner SMS",
      description:
        "Clear jobs can auto-roll. Risky or unclear intakes ping you: 1 = go, 2 = pass, 9 = undo.",
      tag: "Core",
    },
    {
      title: "Auto crew texting",
      description:
        "Round-robin / on-call SMS. Techs reply 1 = accept, 2 = pass. No reply? Next tech automatically.",
      tag: "Included",
    },
    {
      title: "Live ETA map",
      description:
        "Tech opens a GPS link; homeowner gets ETA SMS + free live map — no app install, no paid map fees.",
      tag: "Included",
    },
    {
      title: "Shop analytics dashboard",
      description:
        "KPI cards, trends, missed-call prevention, and drill-downs — see what almost went to the franchise.",
      tag: "Analytics",
    },
    {
      title: "Effiroad AI assistant",
      description:
        "Ask what came in overnight, what's urgent, and what's pending. Change dispatch rules with guarded confirmations.",
      tag: "Assistant",
    },
    {
      title: "Calendar · email · optional Jobber",
      description:
        "Dashboard calendar, owner email backup, and optional Jobber sync — no double entry after a storm.",
      tag: "Included",
    },
    {
      title: "Update & reschedule links",
      description:
        "Homeowners update details or pick a time from private SMS links — secret tokens, expiring access, details redacted after the job.",
      tag: "Included",
    },
    {
      title: "Call recordings + transcripts",
      description:
        "Review what was said on intake calls. Useful for adjusters and quality control.",
      tag: "Included",
    },
  ],
};

export const trustRoiEn = {
  id: "results",
  title: "Real results. Simple math.",
  subtitle: "Effiroad is built around moments where one missed ring loses a five-figure claim.",
  rows: [
    {
      label: "Avg water mitigation job",
      value: "$8,000+",
      hint: "Fire / large losses much higher",
    },
    {
      label: "Missed calls / month",
      value: "10–25",
      hint: "Nights, storms, weekends",
    },
    {
      label: "Effiroad Pro",
      value: SITE.monthlyPrice + "/mo",
      hint: "Or Flex from " + SITE.flexBasePrice + "/mo",
    },
  ],
  footnote: "One saved emergency call often covers months of subscription. The promise: fewer missed rings, faster dispatch on standard losses, owner texts only when the claim is big or unclear.",
};

export const aiDispatcherEn = {
  id: "ai-dispatcher",
  label: "Effiroad AI",
  title: "Your pocket ops assistant",
  subtitle:
    "Not a chatbot on your website — an assistant that reads your company's calls, dispatches, and settings so you can run ops from the truck.",
  cards: [
    {
      title: "Morning pulse",
      description: "Opens with what matters today:",
      items: [
        '"What came in overnight?"',
        '"Any fire losses still open?"',
        '"Who\'s on the way?"',
      ],
    },
    {
      title: "Revenue at risk",
      description: "Surface losses before the homeowner moves on:",
      items: [
        '"Show pending approvals."',
        '"What needs my 1 or 2?"',
        '"Missed calls this week?"',
      ],
    },
    {
      title: "Change rules safely",
      description: "Plain English → preview → confirm:",
      items: [
        '"Who gets owner SMS?"',
        '"Adjust on-call rotation."',
        '"Turn off after-hours AI."',
      ],
    },
    {
      title: "Company memory",
      description: "Teach Effiroad how you operate:",
      items: [
        '"We don\'t do commercial over 10k sq ft."',
        '"Our service area is …"',
        '"Cat-3 always needs my approval."',
      ],
    },
  ],
};

export const howItWorksEn = {
  id: "how-it-works",
  title: "Live tonight in ~10 minutes",
  subtitle: "Pay → cell number → forward rules → test call → see a loss on your dashboard.",
  steps: [
    {
      step: "01",
      title: "Your cell for alerts",
      description: "FYI and exception texts hit this number. Email is backup only.",
    },
    {
      step: "02",
      title: "When Effiroad answers",
      description: "After hours, storm overflow, or no-answer — your hours, your rules.",
    },
    {
      step: "03",
      title: "Forward the main line",
      description: "Homeowners dial the same company number. Busy / no answer → Effiroad.",
    },
    {
      step: "04",
      title: "Test call + dashboard",
      description:
        "Press 1 = emergency intake/dispatch (AI on the call). Press 2 = free estimate AI ($0 — never billed). Say “text link” for an SMS form. Only approved/scheduled emergency jobs count toward your dispatch plan.",
    },
  ],
};

export const schedulingModesEn = {
  id: "scheduling",
  label: "Dispatch policy",
  title: "Standard water dispatches fast. Fire, Cat-3, and P1 mold wait for you.",
  subtitle:
    "One smart policy — no manual switches. Clear water losses roll to on-call crew. Fire, sewage, P1 mold, and unclear intakes need your text: 1 = go, 2 = pass.",
  modes: [
    {
      id: "auto",
      name: "Smart auto-dispatch",
      badge: "Built in" as string | null,
      tagline: "Fast when it's clear · you decide when it's not",
      description:
        "Caller reports a standard water loss with complete info? Crew gets the text right away. Fire, Cat-3, P1 mold, or fuzzy address? You approve before anyone rolls.",
      details: [
        { label: "Standard water · clear info", value: "Auto dispatch" },
        { label: "Fire / structure loss", value: "Your 1 / 2 first" },
        { label: "Cat-3 / sewage", value: "Your 1 / 2 first" },
        { label: "P1 mold", value: "Your 1 / 2 first" },
        { label: "Changed your mind", value: "Reply 9 to undo" },
      ],
      bestFor: "Owner-operators who want speed without blind dispatch on big losses",
    },
  ],
  footnote: "On confirm, crew SMS goes out when techs are set up — round-robin, 1=accept 2=pass.",
};

export const dataTrustEn = {
  id: "data-trust",
  label: "Security & privacy",
  title: "Built so customers trust the link — and you keep the data",
  subtitle:
    "Expiring private links, live-map access that ends with the job, and shop-owned records — no lead marketplace.",
  points: [
    {
      title: "Expiring private links",
      description:
        "Intake and pick-time links are secret and time-limited. After a job is done or cancelled, sensitive details drop off and the link expires soon.",
    },
    {
      title: "Live map that locks down",
      description:
        "Customers see tech ETA only while the visit is active. When the tech arrives or the job closes, location sharing stops and the tracking link dies.",
    },
    {
      title: "Your records, not ours to sell",
      description:
        "Name, phone, address, and call notes stay in your dashboard. Encrypted in transit. Never sold as leads.",
    },
  ],
  footnote: "See how we handle data in our",
};

export const socialProofEn = {
  title: "Built for independent restoration companies — live in minutes",
  items: [
    { stat: "~10 min", label: "typical go-live" },
    { stat: "24/7", label: "emergency intake" },
    { stat: "3 layers", label: "phone · analytics · AI" },
    { stat: "$8,000+", label: "one saved call can cover the year" },
  ],
  badges: [
    "US water · fire · mold",
    "Expiring private links",
    "Live map ends with the job",
    "No CRM required",
  ],
  // No paying customers yet — do not add placeholder/fabricated testimonials here.
  // Add real ones (with permission) once shops are live on the platform.
  testimonials: [] as Array<{
    quote: string;
    name: string;
    detail: string;
    label?: string;
  }>,
};

export const signupFlowEn = {
  title: "Up and running in ~10 minutes",
  subtitle: "No sales call. Pick a plan, set on-call hours, forward calls, test once.",
  steps: [
    {
      step: "01",
      title: "Choose a plan",
      description: "Dispatch plans or Voice minute plans. Lemon Squeezy checkout.",
      time: "1 min",
    },
    {
      step: "02",
      title: "Set on-call hours",
      description: "Nights, weekends, storm-only — your forward rules.",
      time: "2 min",
    },
    {
      step: "03",
      title: "Forward the main line",
      description: "Homeowners still dial your company. Unanswered → Effiroad.",
      time: "5 min",
    },
    {
      step: "04",
      title: "Test call + dashboard",
      description: "One test ring. See intake, analytics, and Effiroad AI on your phone.",
      time: "2 min",
    },
  ],
};

export const pricingEn = {
  title: "One water loss at 2 AM pays for the year",
  subtitle:
    "Pick how you pay: per approved emergency dispatch, or included talk-minutes. Free estimate calls on every plan — no per-estimate fee. No live-agent transfer add-ons.",
  billingTracks: {
    dispatch: {
      id: "dispatch" as const,
      label: "Per approved dispatch",
      hint: "Only bill when a real emergency job is approved — our recommended model",
    },
    voice: {
      id: "voice" as const,
      label: "Per minute",
      hint: "Included talk-minutes + clear overage — like answering services, without transfer fees",
    },
  },
  compare: [
    { label: "AI phone + link intake", amount: "Included" },
    { label: "Free estimate calls (press 2)", amount: "Included — $0 each", highlight: true },
    { label: "Billing choice", amount: "Dispatch track or Voice minutes", highlight: true },
    { label: "Owner control", amount: "1 / 2 hold + 9 undo on every plan", highlight: true },
  ],
  plans: [
    {
      id: "lite" as const,
      name: "Lite",
      badge: "Quiet months",
      description: "Lowest base for slow months. Pay only when you approve a real dispatch — estimates stay free.",
      price: SITE.liteBasePrice,
      period: "/mo",
      usageLine: `+ ${SITE.litePerBooking} per approved dispatch (estimates $0)`,
      volumeGuide: planVolumeGuideEn("lite"),
      features: [
        "Free estimate calls included ($0)",
        "Smart hold: fire / Cat-3 / unclear → your 1 / 2",
        `+ ${SITE.litePerBooking} only when you approve a dispatch`,
        "Natural US voice · CRM optional",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Lite`,
    },
    {
      id: "flex" as const,
      name: "Flex",
      badge: "Most popular",
      description: "Best for independents. Clear jobs auto-dispatch; risky ones wait for you. Pay when a job is approved.",
      price: SITE.flexBasePrice,
      period: "/mo",
      usageLine: `+ ${SITE.flexPerBooking} per approved dispatch (estimates $0)`,
      volumeGuide: planVolumeGuideEn("flex"),
      features: [
        "Free estimate calls included ($0)",
        "Vertical intake + clear-job auto-dispatch",
        `Lower per-dispatch (${SITE.flexPerBooking}) than Lite`,
        "Owner 1 / 2 hold · reply 9 undo · CRM optional",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — Flex`,
    },
    {
      id: "pro" as const,
      name: "Pro",
      badge: "Growing shops",
      description: "Flat rate with a real monthly dispatch budget. Same smart holds — no CRM required.",
      price: SITE.proPrice,
      period: "/mo",
      usageLine: proUsageLine(false),
      volumeGuide: planVolumeGuideEn("pro"),
      features: [
        "Free estimate calls included ($0)",
        "Same 1 / 2 holds on every plan — no CRM required",
        `${SITE.proIncludedDispatches} emergency dispatches/mo included`,
        "Predictable overage — alerts first",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Pro`,
    },
    {
      id: "scale" as const,
      name: "Scale",
      badge: "Storm season",
      description: "High-volume nights on dispatch billing. Same quality intake and owner holds.",
      price: SITE.scalePrice,
      period: "/mo",
      usageLine: scaleUsageLine(false),
      volumeGuide: planVolumeGuideEn("scale"),
      features: [
        "Free estimate calls included ($0)",
        "Same intake + owner holds as every plan",
        `${SITE.scaleIncludedDispatches} emergency dispatches/mo included`,
        "Lower overage than Pro · built for CAT spikes",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Scale`,
    },
  ],
  voicePlans: [
    {
      id: "voice_starter" as const,
      name: "Voice Starter",
      badge: "Light after-hours",
      description:
        "Per-minute track for quieter lines. Included talk time, then a clear overage rate — no live-agent transfer fees.",
      price: SITE.voiceStarterPrice,
      period: "/mo",
      usageLine: voiceStarterUsageLine(false),
      volumeGuide: planVolumeGuideEn("voice_starter"),
      features: [
        "Free estimate calls included ($0)",
        `${SITE.voiceStarterIncludedMinutes} talk-minutes/mo included`,
        `Then ${SITE.voiceStarterOveragePerMinute}/min · rounded up per call`,
        "Same 1 / 2 holds · no CRM required",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — Voice Starter`,
    },
    {
      id: "voice_pro" as const,
      name: "Voice Pro",
      badge: "Busy nights",
      description:
        "Higher included minutes for storm weeks and multi-crew shops that prefer minute billing over per-dispatch.",
      price: SITE.voiceProPrice,
      period: "/mo",
      usageLine: voiceProUsageLine(false),
      volumeGuide: planVolumeGuideEn("voice_pro"),
      features: [
        "Free estimate calls included ($0)",
        `${SITE.voiceProIncludedMinutes} talk-minutes/mo included`,
        `Then ${SITE.voiceProOveragePerMinute}/min · alerts before overage`,
        "Same intake + owner holds as dispatch plans",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Voice Pro`,
    },
  ],
  tip: pricingVolumeTipEn(),
  footnote: PRICING_TRANSPARENCY_FOOTNOTE_EN,
  guarantees: PRICING_GUARANTEES_EN,
};

export const getStartedEn = {
  eyebrow: "Get started",
  title: "Put Effiroad on your emergency line",
  subtitle: `For restoration and HVAC companies — dispatch plans or Voice minute plans. See effiroad.com/#pricing`,
  canceledMessage: "Checkout canceled. Pick a plan below to try again.",
  checkoutError: "Couldn't start checkout. Try again or sign up to continue.",
  demoNotice: "Payments aren't live yet. Pick a plan and sign up to finish setup.",
  afterPay: "After checkout → set on-call & forwarding → test call (~10 min)",
  payLabel: (price: string, period: string) => `Subscribe — ${price}${period}`,
  signupLabel: "Sign up and continue",
};

export const faqEn = {
  title: "Owner questions",
  items: [
    {
      q: "Do estimate calls cost extra?",
      a: "No. Free estimate intake (press 2 on the menu) is included on every plan at $0 — dispatch track and Voice minute track alike.",
    },
    {
      q: "Dispatch billing or per-minute — which should I pick?",
      a: "Most restoration shops prefer dispatch (Lite/Flex/Pro/Scale): you pay when an emergency job is approved, not for every talk minute. Choose Voice Starter or Voice Pro if you want answering-service-style included minutes with a published overage rate and no live-agent transfer fees.",
    },
    {
      q: "What am I billed for on Flex or Lite?",
      a: "The monthly base, plus a fee only when you approve or schedule an emergency dispatch. Missed spam, cancelled jobs, and free estimate requests are not billed.",
    },
    {
      q: "How do Voice minute plans work?",
      a: `Voice Starter includes ${SITE.voiceStarterIncludedMinutes} minutes/mo then ${SITE.voiceStarterOveragePerMinute}/min; Voice Pro includes ${SITE.voiceProIncludedMinutes} then ${SITE.voiceProOveragePerMinute}/min. Each call rounds up to the next full minute. Free estimate (press 2) calls do not count toward included minutes. Same AI intake and owner 1 / 2 holds — dispatch approvals are not charged again on Voice plans.`,
    },
    {
      q: "Do I change my phone number?",
      a: "No. Same line on Google and your trucks. You forward unanswered calls behind the scenes.",
    },
    {
      q: "How is this different from an answering service?",
      a: "Answering services take messages (and often add transfer/overage fees). Effiroad captures loss type and address, dispatches standard water jobs, and texts you 1 / 2 on fire, Cat-3, or unclear intakes — on either billing track.",
    },
    {
      q: "Does this replace Jobber or Xactimate?",
      a: "No. Effiroad is the missed-call and intake layer. Your estimating and CRM tools stay. Jobber connect is optional.",
    },
    {
      q: "What if the AI gets something wrong?",
      a: "Unclear address or loss type? Dispatch waits for your 1 / 2. Already auto-dispatched? Reply 2 to cancel or 9 to undo. Tighten rules anytime in settings or ask Effiroad AI.",
    },
    {
      q: "Does it actually book the job, or just take a message?",
      a: "It books it. On a clear standard water loss, Effiroad captures the intake, dispatches your crew, and texts the homeowner a confirmation — no message for you to call back on. It only waits on your 1 / 2 for the cases that genuinely need a human call: fire, Cat-3, commercial, or anything it couldn't verify.",
    },
    {
      q: "Why an AI instead of a live answering service?",
      a: "A person picks up on ring three, on a good night — an AI picks up on ring one, every night, on the tenth simultaneous storm call as calmly as the first. It never mishears an address because it's 3 AM, and it applies your exact priority rules the same way every time. You still make every real judgment call by text; the AI just never lets a 2 AM emergency sit in voicemail while it decides.",
    },
    {
      q: "Is this just an AI answering service?",
      a: "No. You get emergency intake, crew dispatch texts, missed-call analytics, and Effiroad AI to ask what's happening and change rules from your phone.",
    },
    {
      q: "Who answers during the day?",
      a: "You do — same as today. Effiroad only picks up forwarded calls when you miss them or after hours.",
    },
    {
      q: "Can it text my crew when a loss confirms?",
      a: "Yes — optional round-robin on confirm: one tech at a time, reply 1=accept 2=pass. Add crew numbers in settings.",
    },
    {
      q: "Does it handle insurance info?",
      a: "Intake captures carrier name, claim number when provided, and loss details — ready for your Job Card and adjuster follow-up.",
    },
    {
      q: "How fast to go live?",
      a: "About 10 minutes: contact, on-call hours, forward, test call.",
    },
    {
      q: "Who is this for?",
      a: "US independent restoration — water, fire, mold — 1 to 15 crew companies losing after-hours and on-job emergency calls.",
    },
    {
      q: "What happens during a storm surge when ten calls come in at once?",
      a: "Effiroad handles simultaneous calls — each caller goes through intake independently. You get one SMS summary per confirmed loss, not ten texts at 2 AM. Standard water jobs dispatch automatically; anything requiring your judgment queues for your 1 / 2 reply.",
    },
    {
      q: "Is there a risk-free way to try it?",
      a: `Yes. Start with a ${TRIAL_DAYS}-day free trial — phone, SMS, and dispatch included, no credit card required. Every paid plan also includes a 30-day money-back guarantee. Cancel anytime — no contracts, no cancellation fees.`,
    },
    {
      q: "Do you record calls? Who can access them?",
      a: "Calls are recorded for quality and compliance — useful for adjuster documentation. Only you and your team have access from the dashboard. Recordings are stored securely and are never shared or sold.",
    },
    {
      q: "How secure are the customer links and live map?",
      a: "Every SMS link uses a long secret token (not a guessable ID). Pick-time and booking links expire; after a job is completed or cancelled, personal details are hidden and the link closes soon. The live tech map only works while the visit is active — when the tech arrives or the job ends, location sharing stops and that link stops working.",
    },
    {
      q: "When does restoration need my 1 / 2 approval?",
      a: "Clear P1 water with solid name/issue confidence can move forward after the customer confirms address + visit time. Fire, Cat-3 sewage, commercial/multi-unit, P1 mold, low-confidence intake, or out-of-area always wait for your text: reply 1 to dispatch, 2 to pass. Reply 9 undoes an auto step. That risk split is intentional — blind auto-dispatch on fire/sewage is how shops get burned.",
    },
    {
      q: "Why confirm address on a link instead of the phone?",
      a: "Wrong-address rolls are one of the costliest failures in after-hours dispatch. Speech recognition mishears street numbers. Effiroad collects name and issue on the call, then texts a secure link where the homeowner types or map-searches the address and picks a visit window — same accuracy playbook top restoration dispatch stacks use.",
    },
  ],
};

export const agreementKeeperEn = {
  id: "agreement-keeper",
  label: "Optional follow-up",
  title: "Sell PM plans after the job — optional",
  subtitle:
    "For shops that offer annual maintenance agreements. After a job completes, Effiroad can text a PM offer link to customers who opted in at intake.",
  steps: [
    {
      title: "Job completes",
      description: "You mark the job done in the dashboard.",
    },
    {
      title: "PM offer SMS",
      description: "Customer gets a link to accept your maintenance plan (marketing opt-in required).",
    },
    {
      title: "Agreement list",
      description: "Track active PM contracts and renewal dates in the dashboard.",
    },
    {
      title: "Renewal reminders",
      description: "Optional owner and customer nudges before renewal — no spreadsheet hunting.",
    },
  ],
  bullets: [
    "Optional post-job PM offer",
    "Maintenance agreement tracking",
    "Renewal reminders",
    "Tune-up schedule on dashboard",
  ] as const,
};

export const ctaEn = {
  eyebrow: "Your line. Your dispatch. Your assistant.",
  title: "Forward tonight. Wake up to captured losses.",
  subtitle: "24/7 AI intake, crew dispatch, and Effiroad AI — one subscription for restoration owners who miss calls on the job.",
  button: CHECKOUT_CTA,
};

export const navEn = {
  features: "Features",
  howItWorks: "How it works",
  pricing: "Pricing",
  why: "Why Effiroad",
  product: "Features",
  about: "Why Effiroad",
  scheduling: "Dispatch",
  getStarted: "Get started",
};

export const footerEn = {
  privacy: "Privacy",
  terms: "Terms",
  refund: "Refunds",
  contact: "Contact",
  tagline: "AI phone, dispatch, and ops assistant for restoration companies.",
  brandMeaning: "Missed call → AI intake → crew dispatch → claim captured. No CRM required.",
  subline: "US water · fire · mold restoration · Same company number · No CRM required",
};
