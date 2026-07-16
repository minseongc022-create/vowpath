import { SITE } from "./constants";
import { TRIAL_DAYS } from "./billing-cohort";
import { getCheckoutCta } from "./marketing-constants";

const CHECKOUT_CTA = getCheckoutCta();

/** Vertical-neutral — shown identically on every landing page above the vertical-specific
 *  sections below it. Keep this short: the pitch that's true for any home-service shop. */
export const heroEn = {
  badge: "The Road to Efficiency",
  headline: "Never miss another emergency job.",
  headlineAccent: "Answer. Dispatch. Document — around the clock.",
  brandLine:
    "When your crew can't pick up, Effiroad answers like a trained receptionist — calm, polite, and thorough. It talks naturally with callers, collects address and loss details, and dispatches your team while the customer is still on the line.",
  subhead:
    "Natural US voice on every call. Respectful intake. Complete info before dispatch — built for independent home service companies.",
  trustLine: "1–15 crew shops · No CRM required",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "See how it works",
  secondaryCtaHref: "/#how-it-works",
  heroBadges: [
    "Natural, human-like phone voice",
    "Polite intake — every caller",
    "Complete info before dispatch",
    "Go live in ~10 minutes",
  ] as const,
};

export const quickFaqEn = {
  id: "quick-qa",
  label: "Quick answers",
  title: "Why Effiroad — not another answering service",
  subtitle:
    "The questions owners ask first — and how we're built differently from typical answering services and CRM add-ons.",
  items: [
    {
      q: "Why Effiroad instead of a per-minute answering service?",
      a: "Flat monthly price — no per-minute rounding, no surprise live-agent transfer fees. Same natural voice every call, not a rotating receptionist who rushes through a script.",
    },
    {
      q: "Does the AI actually sound human?",
      a: "Yes. Warm US voice, conversational pacing, and polite follow-ups — like a trained shop receptionist, not a rigid phone tree or form-with-a-voice.",
    },
    {
      q: "Will it collect complete job info before dispatch?",
      a: "Address, loss type, urgency, and insurance details — verified on the call. Clear standard water jobs dispatch while they wait. Fire, Cat-3, and fuzzy details wait for your 1 / 2.",
    },
    {
      q: "How is this different from a CRM add-on receptionist?",
      a: "Conversational intake tuned for trades — not checkbox questions. Works with or without your CRM. Three forwarding paths plus a dedicated-number fallback when carriers block overflow.",
    },
    {
      q: "Do I have to change my phone number?",
      a: "Usually no — forward unanswered calls from your existing line. If forwarding won't work on your carrier, use your Effiroad dedicated number — same AI quality, not a downgrade.",
    },
    {
      q: "What do contractors complain about elsewhere?",
      a: "Bill shock, inconsistent agents, message-only on complex calls, and weeks of onboarding. Effiroad: transparent pricing, instant AI pickup, real dispatch, and ~10-minute go-live.",
    },
  ],
} as const;

export const callExperienceEn = {
  id: "call-experience",
  label: "Phone experience",
  title: "Sounds human. Collects everything. Dispatches right.",
  subtitle:
    "Homeowners in a panic don't want a form or hold music — they want someone calm who gets the address right and gets a tech rolling.",
  points: [
    {
      title: "Natural, human-like voice",
      body: "Warm US tone with conversational pacing — not robotic menus or bored agents reading a script. Same professional voice on every call, 2 AM or 2 PM.",
    },
    {
      title: "Polite, respectful intake",
      body: "Listens first, asks one question at a time, and confirms details back — the way a good receptionist would. No press-1 screening or abrupt transfers.",
    },
    {
      title: "Complete info before dispatch",
      body: "Verified address, loss type, active leak status, and insurance-ready notes — captured on the call, not a vague \"we'll call you back.\"",
    },
    {
      title: "Dispatch while they wait",
      body: "Clear standard jobs roll to your crew with SMS. Fire, Cat-3, and unclear intakes ping you: 1 = go, 2 = pass — not blind auto-book or message-only.",
    },
  ],
  contrast: {
    title: "What we fixed that reviews flag elsewhere",
    theirs: [
      "Per-minute billing and surprise transfer fees",
      "Rigid form-style questions — \"a form with a voice\"",
      "Complex calls default to message-taking only",
      "Weeks of onboarding and enterprise-only pricing",
    ],
    ours: [
      "Flat monthly — predictable every storm season",
      "Conversational intake tuned for water, fire, mold, HVAC",
      "Real dispatch on clear jobs — you approve the edge cases",
      "Go live in ~10 minutes — test call built into setup",
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
        "After-hours, storm surge, and no-answer overflow forward to Effiroad. Callers talk or tap a text link — loss type, address, insurance info, and how fast they need you.",
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
        "Dashboard KPIs, missed-call prevention, and recovery estimates — know what would have hit voicemail and what turned into a signed work order.",
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
    "Fire, mold, or fuzzy details → your text",
  ] as const,
};

export const aboutEn = {
  id: "about",
  badge: "The Road to Efficiency",
  title: "Efficiency is the Road to Limitless Success",
  subtitle:
    "In restoration, the first company to answer often owns the entire claim — mitigation, drying, and rebuild. Effiroad is the efficient path from ring to rolling truck.",
  paragraphs: [
    "Efficiency means fewer steps between a missed ring and a crew on site: intake, triage, owner SMS when the loss is big, and homeowner updates without opening ten apps.",
    "Road is the through-line — from the first call to dispatch, on-the-way texts, and optional CRM sync. Built for US owner-operators who live on their cell between jobs.",
    "Effiroad is not just software. It is the efficient path your company takes every day — from emergency call to signed work order and long-term adjuster relationships.",
  ],
  pillars: [
    {
      label: "Efficiency",
      meaning: "Auto-dispatch clear water losses. Text 1 / 2 when it's fire, mold, or Cat-3. Run ops from your phone.",
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
  title: "What restoration companies get with Effiroad",
  subtitle: "Dispatch speed — with loss triage and owner exceptions built in.",
  items: [
    {
      title: "Auto-dispatch (default)",
      description:
        "Standard water losses with complete address and contact info dispatch to on-call crew — you get a heads-up, not a homework assignment.",
    },
    {
      title: "Fire / Cat-3 → your 1 / 2 first",
      description:
        "Structure fire, sewage backup, and large commercial losses trigger an urgent text. Reply 1 to dispatch or 2 to pass.",
    },
    {
      title: "Restoration intake — not a generic script",
      description:
        "Water, fire, smoke, mold, sewage. Loss category and urgency captured before anyone rolls.",
    },
    {
      title: "Hold unclear intakes",
      description:
        "Bad address or vague loss details? Job waits for your 1 / 2 — competitors would have dispatched blind.",
    },
    {
      title: "Your number or ours — your call",
      description:
        "Keep your company number and forward busy/no-answer calls to Effiroad, or use the dedicated number we give you as your main line. Either way you never miss a call.",
    },
    {
      title: "Optional CRM sync",
      description:
        "Confirmed jobs can sync to Jobber or your existing tool. Run on SMS + dashboard alone until you're ready.",
    },
    {
      title: "Your customer data, your company",
      description:
        "Homeowner name, phone, address, and loss notes are stored exclusively in your dashboard — never sold, never shared, never pooled into a lead marketplace. Intake links expire after use.",
    },
  ],
};

export const jobberEn = {
  id: "integrations",
  label: "Optional",
  title: "Already using Jobber or a CRM? Plug it in.",
  subtitle:
    "No CRM is required. Most restoration shops run on texts and the dashboard. If Jobber is how you track jobs, connect once and stop retyping.",
  points: [
    {
      title: "No CRM? You're covered",
      description:
        "Owner SMS, email backup, Job Cards, and the Effiroad dashboard. Nothing else to buy or connect.",
    },
    {
      title: "Confirmed jobs → your CRM",
      description:
        "When a loss confirms, the request lands in Jobber automatically. Customer, address, loss type — already filled in.",
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
    "Independent reviews flag billing surprises, rigid scripts, and weeks-long setup elsewhere. Effiroad is built for 1–15 crew shops that need accurate intake, friendly voice, and go-live in minutes — not enterprise sales calls.",
  headers: ["", "Effiroad", "Typical answering service", "CRM add-on / enterprise AI"],
  rows: [
    ["Phone setup", "3 paths + one-tap codes + dedicated fallback", "Help docs + onboarding call", "Admin portal / CRM-only / multi-week"],
    ["Forwarding if stuck", "Switch to dedicated number in-app", "Email support", "CSM / sales process"],
    ["Call voice quality", "Natural US voice + consistent tuning", "Human variance or transfer fees", "Varies; rigid scripted Q&A"],
    ["Intake accuracy", "Address + loss triage + insurance fields", "Script-dependent; operator variance", "Form-style Q&A; complex → message"],
    ["Job dispatch", "Auto-dispatch clear jobs + crew SMS", "Message / schedule add-on fees", "Calendar booking only"],
    ["Pricing", `Flat ${SITE.monthlyPrice}/mo — no per-minute`, "Per-minute + overages + transfer fees", "Custom / add-on / $1K+ enterprise"],
    ["Works without CRM", "Yes — SMS + dashboard", "Yes", "Often CRM- or platform-locked"],
    ["Test before go-live", "Built-in test call verify", "Call your own line manually", "Demo / pilot required"],
    ["Go live", "~10 minutes", "Days + scripting", "Days to weeks"],
  ],
};

export const competitorWinEn = {
  id: "why-we-win",
  label: "What reviews say elsewhere",
  title: "We fixed what contractors complain about",
  subtitle:
    "Common pain points from public reviews and trade forums — and how Effiroad is built differently.",
  pillars: [
    {
      title: "Setup that finishes",
      body: "Three forwarding paths with one-tap codes — and a dedicated-number fallback with the same AI quality when carriers block overflow.",
    },
    {
      title: "Accurate intake, not voicemail",
      body: "Address, urgency, loss type, and insurance-ready notes — captured on the call, not a vague callback promise.",
    },
    {
      title: "Dispatch while they wait",
      body: "Clear jobs can roll to your crew with SMS. Fire, Cat-3, and fuzzy details wait for your 1 / 2 — not blind auto-book.",
    },
    {
      title: "Friendly, consistent voice",
      body: "Same natural US voice every call — no rotating agents, no press-1 screening, no per-transfer surprise bills.",
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
      fix: "Flat monthly price. No live-agent transfer fees. Same AI voice and script every time. Test call built into setup.",
    },
    {
      name: "Per-minute virtual receptionists",
      pains: [
        "Per-minute billing with 60-second rounding — hangups still bill",
        "Bill shock in busy season from unpredictable usage",
        "Inconsistent script following on live calls in reviews",
      ],
      fix: "No per-minute clock. Predictable flat rate. AI answers instantly — professional tone without hold music or bored agents.",
    },
    {
      name: "CRM add-on AI receptionists",
      pains: [
        "Rigid form-style questions — 'a form with a voice'",
        "Complex calls default to message-taking; business-name confusion",
        "CRM-locked; extra monthly fee; forwarding setup still on you",
      ],
      fix: "Works with or without your CRM. Conversational intake tuned for trades. Three forwarding paths + dedicated number fallback (same quality).",
    },
    {
      name: "Enterprise trade AI platforms",
      pains: [
        "Enterprise pricing ($1K–$3K/mo cited in reviews); multi-week onboarding",
        "Platform-locked for full value; overkill for 1–15 crew shops",
        "No public pricing; sales call required to compare",
      ],
      fix: "Transparent flat pricing for owner-operators. Go live in ~10 minutes. Optional CRM sync — no single platform required.",
    },
  ],
  footnote:
    "Based on patterns from public review sites, trade forums, and independent contractor comparisons (2024–2026). No endorsement implied.",
};

export const featuresEn = {
  title: "Everything that ships today",
  subtitle: "AI phone is the core. Analytics and Effiroad AI are built in — not upsells on a generic call bot.",
  items: [
    {
      title: "AI phone + link intake",
      description:
        "Forwarded calls and SMS intake links. Water / fire / mold triage, verified address, and insurance-ready notes.",
      tag: "Core",
    },
    {
      title: "Smart dispatch + owner SMS",
      description:
        "Clear standard losses can dispatch instantly. Fire, Cat-3, and unclear intakes ping you: 1 = go, 2 = pass, 9 = undo.",
      tag: "Core",
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
      title: "Crew dispatch + on my way",
      description:
        "Optional round-robin crew SMS on confirm. Tech replies with ETA — homeowner gets an on-the-way text.",
      tag: "Included",
    },
    {
      title: "Calendar · email · optional CRM",
      description:
        "Dashboard calendar, owner email backup, and optional Jobber sync — no double entry after a storm.",
      tag: "Included",
    },
    {
      title: "Update & reschedule links",
      description:
        "Homeowners update details or reschedule from secure SMS links — private, expiring.",
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
      hint: "Fire / rebuild much higher",
    },
    {
      label: "Missed calls / month",
      value: "10–25",
      hint: "Nights, storms, weekends",
    },
    {
      label: "Effiroad Unlimited",
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
      description: "One test ring. Standard water auto-dispatches; fire or unclear waits for your 1 / 2.",
    },
  ],
};

export const schedulingModesEn = {
  id: "scheduling",
  label: "Dispatch policy",
  title: "Standard water dispatches fast. Fire, mold, and Cat-3 wait for you.",
  subtitle:
    "One smart policy — no manual switches. Clear water losses roll to on-call crew. Fire, sewage, and unclear intakes need your text: 1 = go, 2 = pass.",
  modes: [
    {
      id: "auto",
      name: "Smart auto-dispatch",
      badge: "Built in" as string | null,
      tagline: "Fast when it's clear · you decide when it's not",
      description:
        "Caller reports a standard water loss with complete info? Crew gets the text right away. Fire, Cat-3, or fuzzy address? You approve before anyone rolls.",
      details: [
        { label: "Standard water · clear info", value: "Auto dispatch" },
        { label: "Fire / structure loss", value: "Your 1 / 2 first" },
        { label: "Cat-3 / sewage", value: "Your 1 / 2 first" },
        { label: "Changed your mind", value: "Reply 9 to undo" },
      ],
      bestFor: "Owner-operators who want speed without blind dispatch on big losses",
    },
  ],
  footnote: "On confirm, crew SMS goes out when techs are set up — round-robin, 1=accept 2=pass.",
};

export const dataTrustEn = {
  id: "data-trust",
  label: "Your data",
  title: "Customer and claim info stays with your company",
  subtitle: "Private intake links. No lead resale. Optional sync to tools you already use.",
  points: [
    {
      title: "Company-owned records",
      description: "Name, phone, address, and loss notes go to your dashboard — not a lead marketplace.",
    },
    {
      title: "Private links",
      description: "Intake links expire. Homeowners see only what they need to submit.",
    },
    {
      title: "Works with your stack",
      description:
        "Optional Jobber sync when you connect. Effiroad fills the gap on missed emergency calls and intake.",
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
  badges: ["US water · fire · mold", "Same company number", "No CRM required"],
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
      description: "Unlimited or Flex. Paddle checkout.",
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
  subtitle: "Unlimited for busy shops and storm season. Flex when nights are quieter.",
  compare: [
    { label: "AI phone + link intake", amount: "Included" },
    { label: "Shop analytics + Effiroad AI", amount: "Included" },
    { label: "Owner SMS (FYI + exceptions)", amount: "Included" },
    { label: "CRM / Jobber sync", amount: "Optional", highlight: true },
  ],
  plans: [
    {
      id: "unlimited" as const,
      name: "Unlimited",
      badge: "Most popular",
      description: "Heavy nights and storm season. Flat rate.",
      price: SITE.monthlyPrice,
      period: "/mo",
      usageLine: "No per-dispatch fees",
      features: [
        "Unlimited forward windows",
        "Auto dispatch + crew text",
        "Smart owner SMS exceptions",
        "CRM connect optional",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — Unlimited`,
    },
    {
      id: "flex" as const,
      name: "Flex",
      badge: "Lighter volume",
      description: "Pay per confirmed dispatch. Quiet months stay cheap.",
      price: SITE.flexBasePrice,
      period: "/mo",
      usageLine: `+ ${SITE.flexPerBooking} per approved dispatch`,
      features: [
        "Same intake and dispatch flow",
        "Custom forward hours",
        "Per confirmed dispatch only",
        "CRM connect optional",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Flex`,
    },
  ],
  tip: `Confirming 9+ dispatches a month? Unlimited (${SITE.monthlyPrice}) usually wins.`,
  footnote: "No charge for spam, wrong numbers, or jobs you cancel.",
  guarantees: [
    "30-day money-back guarantee",
    "Cancel anytime — no contracts",
    "No setup fees",
  ] as const,
};

export const getStartedEn = {
  eyebrow: "Get started",
  title: "Put Effiroad on your emergency line",
  subtitle: `For restoration and HVAC companies — Unlimited ${SITE.monthlyPrice}/mo or Flex ${SITE.flexBasePrice}/mo + ${SITE.flexPerBooking} per approved dispatch`,
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
      q: "Do I change my phone number?",
      a: "No. Same line on Google and your trucks. You forward unanswered calls behind the scenes.",
    },
    {
      q: "How is this different from an answering service?",
      a: "Answering services take messages. Effiroad captures loss type and address, dispatches standard water jobs, and texts you 1 / 2 on fire, Cat-3, or unclear intakes.",
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
  ],
};

export const agreementKeeperEn = {
  id: "agreement-keeper",
  label: "Follow-up",
  title: "Finish mitigation. Stay top of mind for rebuild.",
  subtitle:
    "After a job completes, optional SMS keeps your company in front of the homeowner for reconstruction and referrals.",
  steps: [
    {
      title: "Job completes",
      description: "You mark mitigation done in dashboard.",
    },
    {
      title: "SMS follow-up",
      description: "Customer gets a link for rebuild estimate or referral request.",
    },
    {
      title: "Pipeline view",
      description: "See open rebuild opportunities in dashboard.",
    },
    {
      title: "Reminder texts",
      description: "Optional nudges before adjuster deadlines — no spreadsheet hunting.",
    },
  ],
  bullets: [
    "Optional post-mitigation follow-up",
    "Rebuild pipeline tracking",
    "Owner reminders",
    "Est. rebuild revenue on dashboard",
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
