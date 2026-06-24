import { SITE } from "./constants";
import { getCheckoutCta } from "./marketing-constants";

const CHECKOUT_CTA = getCheckoutCta();

export const heroEn = {
  badge: "AI phone · analytics · ops assistant",
  headline: "AI that answers when you can't.",
  headlineAccent: "Books the job. Runs the shop with you.",
  brandLine:
    "Vowroad is not a generic answering service. Your main line stays the same — when you miss a ring, our AI phone layer captures HVAC intake, books real arrival windows, and keeps the homeowner in the loop until your tech is on the way.",
  subhead:
    "Core: AI phone + SMS link intake and smart booking. Built in: missed-call analytics and Vowroad AI — your pocket ops assistant for approvals, calendar, and shop settings.",
  trustLine: "US residential HVAC · 1–5 truck shops · Jobber optional",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "See the full flow",
  secondaryCtaHref: "/#missed-call-flow",
  heroBadges: [
    "AI phone intake",
    "Owner SMS 1 / 2",
    "Shop analytics",
    "Vowroad AI assistant",
  ] as const,
};

export const productStackEn = {
  id: "product-stack",
  label: "What Vowroad is",
  title: "One platform — three layers",
  subtitle:
    "Most tools only answer the phone. Vowroad starts there, then shows you what you captured and lets you run the shop without opening ten menus.",
  layers: [
    {
      id: "phone",
      tier: "core" as const,
      badge: "Main",
      label: "AI phone layer",
      title: "Catch every ring you miss",
      description:
        "Overflow, after-hours, and peak-season calls forward to Vowroad. Customers talk or tap a text link — name, address, issue, and a real arrival window.",
      points: [
        "Same shop number on Google",
        "HVAC triage (P1 / P2 / P3)",
        "Phone or SMS link intake",
        "Smart auto-book + owner 1 / 2",
      ],
    },
    {
      id: "analytics",
      tier: "sub" as const,
      badge: null,
      label: "AI analytics",
      title: "See what almost slipped away",
      description:
        "Dashboard KPIs, missed-call prevention, and recovery estimates — so you know what would have hit voicemail and what turned into booked work.",
      points: [
        "Leads, emergencies, confirmations",
        "Missed-call analytics page",
        "Trend charts + drill-downs",
        "Recovery estimates (not accounting)",
      ],
    },
    {
      id: "assistant",
      tier: "sub" as const,
      badge: null,
      label: "Vowroad AI",
      title: "Your ops assistant in your pocket",
      description:
        "Ask what came in, what needs approval, or what is on the calendar — and change booking rules in plain English when you are on a roof.",
      points: [
        "Morning briefing on open",
        "Pending approvals + urgent calls",
        "Guarded settings changes",
        "Optional daily SMS briefing",
      ],
    },
  ],
  footnote:
    "Jobber sync, crew dispatch texts, and maintenance-plan offers are built in — connect what you use, skip what you do not.",
};

export const missedCallFlowEn = {
  id: "missed-call-flow",
  title: "From ring to doorstep — without losing the homeowner",
  subtitle:
    "High level only: your customer experience from the first call until your tech arrives. You stay in control; Vowroad handles the gaps.",
  steps: [
    {
      id: "call",
      title: "Customer calls your line",
      description:
        "They dial the same number on your truck and Google listing — no new number to explain.",
    },
    {
      id: "forward",
      title: "You miss it → Vowroad answers",
      description:
        "On a job, after hours, or when lines stack up — unanswered calls forward to the AI phone layer.",
    },
    {
      id: "intake",
      title: "Intake + arrival window",
      description:
        "Phone or SMS link. HVAC triage, address capture, and a real open slot — not a vague callback promise.",
    },
    {
      id: "approve",
      title: "Confirm or hold",
      description:
        "Clear routine jobs can auto-confirm. Emergencies and messy details wait for your text: 1 = yes, 2 = pass.",
    },
    {
      id: "dispatch",
      title: "Crew gets the job",
      description:
        "Optional tech dispatch by SMS — round-robin offer, accept or pass. Jobber Request when you connect.",
    },
    {
      id: "onway",
      title: "On the way text",
      description:
        "Tech replies with minutes out or taps On my way — homeowner gets an ETA without you typing it twice.",
    },
    {
      id: "arrival",
      title: "Tech arrives",
      description:
        "Visit happens in your arrival window. Mark complete → optional maintenance-plan offer by text.",
    },
  ],
};

export const approvalLoopEn = {
  id: "approval-loop",
  label: "Smart exceptions",
  title: "Auto-book the routine. Ping you for what actually needs a human.",
  summary:
    "Competitors auto-book everything — including bad addresses. Vowroad auto-books clear routine jobs, but holds P1 emergencies and fuzzy intakes for your 1 / 2 before anything confirms.",
  tags: ["Routine auto-confirms", "P1 → 1 / 2", "Unclear → 1 / 2", "Reply 9 undo"] as const,
  smsExample: {
    customer: "John Smith",
    issue: "No Cooling",
    window: "Tomorrow 2PM",
    approveLabel: "Routine = auto-confirmed",
    declineLabel: "P1 or unclear = Reply 1 · 2",
  },
  nodes: [
    { id: "customer", title: "Customer picks slot", caption: "Real open time" },
    { id: "vowroad", title: "Vowroad", caption: "Routine confirms" },
    { id: "owner", title: "Your phone", caption: "P1 / unclear → 1 / 2" },
    { id: "customer-out", title: "Job scheduled", caption: "SMS + Jobber" },
  ] as const,
  edges: [
    "HVAC triage + intake",
    "Clear P2/P3 confirm instantly",
    "P1 or fuzzy details → your text",
  ] as const,
};

export const aboutEn = {
  id: "about",
  badge: "Built for owner-operators",
  title: "More than an AI phone bot",
  subtitle:
    "Generic AI answers and hangs up. Vowroad is the phone layer plus shop analytics plus an assistant that knows your bookings — built for US HVAC crews who live on their cell.",
  paragraphs: [
    "The AI phone layer captures what you miss: after-hours no-heat, overflow rings, and peak-season hold times. It triages HVAC urgency, collects intake, and puts clear jobs on your calendar while you stay on the ladder.",
    "Analytics show what would have been voicemail and what became booked work. Vowroad AI lets you ask what needs attention and adjust rules from the truck — without learning another dispatch system.",
  ],
  pillars: [
    {
      label: "AI phone",
      meaning: "Forward when busy or closed. Intake, triage, and real arrival windows on your line.",
    },
    {
      label: "AI + you",
      meaning: "Auto-book when it is clear. Text 1 / 2 when it is urgent or fuzzy. Crew and customer texts through confirm.",
    },
  ],
};

export const problemEn = {
  title: "At 6:58 AM they wake up sweating. You are writing tickets. Voicemail wins.",
  subtitle:
    "27%+ of shop calls go unanswered. No-heat callers dial the next name on Google. One saved ticket pays for the month.",
  stats: [
    { value: "27%+", label: "of shop calls unanswered" },
    { value: "$400+", label: "avg residential ticket" },
    { value: "80%", label: "of voicemail callers hang up" },
  ],
  callout: "You do not need more leads. You need to answer the line you already advertise.",
};

export const revenueLeaksEn = {
  id: "revenue-leaks",
  label: "Revenue leaks",
  title: "Every feature closes a place where revenue leaks out",
  subtitle:
    "Not vague AI promises. Each workflow is tied to a specific moment where HVAC shops lose calls, approvals, or booked jobs.",
  items: [
    {
      leak: "Missed after-hours calls",
      feature: "AI phone + SMS link intake",
      result: "Turns voicemail risk into a structured booking request",
      money: "$400+ ticket protected",
    },
    {
      leak: "Slow owner response",
      feature: "Auto calendar + instant confirm",
      result: "Homeowner books before they dial the next shop on Google",
      money: "Minutes, not hours",
    },
    {
      leak: "Customers bouncing to the next shop",
      feature: "Secure private booking links",
      result:
        "Shop-branded calendar on a one-time SMS link — open times only. Clear jobs confirm instantly; unclear ones wait for your 1 / 2",
      money: "Same instant-book UX homeowners expect",
    },
    {
      leak: "Owner buried in tune-up texts",
      feature: "Smart auto-book + owner exceptions",
      result: "Routine P2/P3 confirm while you work; only urgent or messy intakes ping you",
      money: "More jobs without more thumb time",
    },
    {
      leak: "Double entry into Jobber at night",
      feature: "Confirm once → Jobber Request",
      result: "Morning board already has the job — no retyping at 7 AM",
      money: "One source of truth",
    },
  ] as const,
};

export const differentiatorsEn = {
  title: "What HVAC shops get with Vowroad",
  subtitle: "Auto-book speed — with triage and exceptions built for owner-operators.",
  items: [
    {
      title: "Auto calendar (default)",
      description:
        "Customers pick real open slots. Clear jobs confirm instantly — you get a heads-up, not a homework assignment.",
    },
    {
      title: "P1 urgent → your 1 / 2 first",
      description:
        "No-heat and no-cool trigger an urgent text. Reply 1 to confirm or 2 to pass — nothing locks in until you OK it.",
    },
    {
      title: "HVAC intake — not a generic script",
      description:
        "No-heat, no-cool, gas smell, tune-up. P1 / P2 / P3 before anyone hits your calendar.",
    },
    {
      title: "Hold unclear intakes",
      description:
        "Bad address or fuzzy name? Job waits for your 1 / 2 — competitors would have auto-booked it.",
    },
    {
      title: "Same shop number",
      description: "Forward when busy or closed. Google listing and truck wrap stay the same.",
    },
    {
      title: "Jobber when you connect",
      description:
        "Confirmed jobs become Requests automatically. Run on SMS + dashboard alone until you are ready.",
    },
    {
      title: "Your customer data",
      description:
        "Homeowner info stays with your shop. No lead marketplace. Links expire.",
    },
  ],
};

export const jobberEn = {
  id: "jobber",
  label: "Optional",
  title: "Already on Jobber? Plug it in.",
  subtitle:
    "Jobber isn't required. Most shops run on texts and the dashboard. If Jobber is how you dispatch, connect once and stop retyping.",
  points: [
    {
      title: "No Jobber? You're covered",
      description:
        "Owner SMS, email backup, Job Cards, and the Vowroad dashboard. Nothing else to buy or connect.",
    },
    {
      title: "Confirmed jobs → Jobber",
      description:
        "When a visit confirms, the request lands in Jobber automatically. Customer details, issue, and window — already filled in.",
    },
    {
      title: "Calendar stays current",
      description:
        "Confirmed visits show on your Jobber schedule. One source of truth instead of copy-paste from a text thread.",
    },
  ],
  footnote: "Connect or skip in settings. Vowroad works either way.",
};

export const comparisonEn = {
  id: "comparison",
  title: "Auto-book speed — with HVAC triage and owner exceptions",
  subtitle:
    "Jobber AI and CallJolt auto-book everything. Vowroad does too for clear jobs — but holds messy intakes and flags P1 so bad bookings do not slip through.",
  headers: ["", "Vowroad", "AI auto-book", "Answering service"],
  rows: [
    ["Auto-book to calendar", "Yes — default", "Yes", "No — message only"],
    ["HVAC P1 / P2 / P3 triage", "Built in", "Varies", "Script varies"],
    ["Hold unclear address / name", "Yes", "Rare", "N/A"],
    ["P1 urgent owner alert", "Yes — job booked + SMS", "Sometimes", "Email / portal"],
    ["Customer picks real open slot", "Yes", "Often", "Rare"],
    ["Keep your shop number", "Yes", "Forward required", "Often new number"],
    ["Works without Jobber / ST / HCP", "Yes — SMS + dashboard", "Usually needs CRM", "Separate tool"],
    ["Jobber sync on confirm", "Yes", "On intake", "Hand retyped"],
    ["Go live", "~10 minutes", "Days + CRM setup", "Days + scripting"],
    ["Price (typical)", "$199/mo flat", "$99–$500+ add-on", "$200–$800/mo"],
  ],
};

export const featuresEn = {
  title: "Everything that ships today",
  subtitle: "AI phone is the core. Analytics and Vowroad AI are built in — not upsells on a generic call bot.",
  items: [
    {
      title: "AI phone + link intake",
      description:
        "Forwarded calls and SMS booking links. HVAC triage, verified address, and customer-picked arrival windows.",
      tag: "Core",
    },
    {
      title: "Smart auto-book + owner SMS",
      description:
        "Clear P2/P3 jobs can confirm instantly. P1 and fuzzy intakes ping you: 1 = approve, 2 = pass, 9 = undo.",
      tag: "Core",
    },
    {
      title: "Shop analytics dashboard",
      description:
        "KPI cards, trends, missed-call prevention, and drill-downs to calls and bookings — see what almost slipped away.",
      tag: "Analytics",
    },
    {
      title: "Vowroad AI assistant",
      description:
        "Ask what came in, what is urgent, and what is pending. Change booking rules with guarded confirmations.",
      tag: "Assistant",
    },
    {
      title: "Crew dispatch + on my way",
      description:
        "Optional round-robin tech SMS on confirm. Tech replies with ETA — customer gets an on-the-way text.",
      tag: "Included",
    },
    {
      title: "Calendar · email · Jobber",
      description:
        "Dashboard calendar, owner email backup, and optional Jobber sync on approve — no double entry at 7 AM.",
      tag: "Included",
    },
    {
      title: "Agreement Keeper",
      description:
        "After you mark complete, optional maintenance-plan SMS offer and renewal tracking.",
      tag: "Included",
    },
    {
      title: "Customer portal links",
      description:
        "Homeowners reschedule, update details, or cancel from secure SMS links — private, expiring.",
      tag: "Included",
    },
  ],
};

export const trustRoiEn = {
  title: "The math is simple",
  subtitle: "Vowroad is built around moments where one delayed response can lose the job.",
  rows: [
    {
      label: "Avg residential ticket",
      value: "$400+",
      hint: "No-heat / no-cool territory",
    },
    {
      label: "Missed calls / month",
      value: "8–15",
      hint: "Nights, weekends, peak",
    },
    {
      label: "Vowroad Unlimited",
      value: SITE.monthlyPrice + "/mo",
      hint: "Or Flex from " + SITE.flexBasePrice + "/mo",
    },
  ],
  footnote: "The promise is specific: fewer missed calls, more auto-confirmed routine jobs, and owner texts only when it is urgent or unclear.",
};

export const aiDispatcherEn = {
  id: "ai-dispatcher",
  label: "Vowroad AI",
  title: "Your pocket ops assistant",
  subtitle:
    "Not a chatbot on your website — an assistant that reads your shop's calls, bookings, and settings so you can run the business from the truck.",
  cards: [
    {
      title: "Morning pulse",
      description: "Opens with what matters today:",
      items: [
        '"What came in overnight?"',
        '"Any P1 still open?"',
        '"What is on the calendar?"',
      ],
    },
    {
      title: "Revenue at risk",
      description: "Surface jobs before the homeowner moves on:",
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
        '"Adjust visit length."',
        '"Turn off after-hours AI."',
      ],
    },
    {
      title: "Shop memory",
      description: "Teach Vowroad how you talk to customers:",
      items: [
        '"Remember we do not do commercial."',
        '"Our service area is …"',
        '"Add a workflow for weekends."',
      ],
    },
  ],
};

export const howItWorksEn = {
  id: "how-it-works",
  title: "Live tonight in ~10 minutes",
  subtitle: "Pay → cell number → forward rules → test call → see a job on your calendar.",
  steps: [
    {
      step: "01",
      title: "Your cell for alerts",
      description: "FYI and exception texts hit this number. Email is backup only.",
    },
    {
      step: "02",
      title: "When Vowroad answers",
      description: "Evenings, weekends, or no-answer — your hours, your rules.",
    },
    {
      step: "03",
      title: "Forward the main line",
      description: "Customers dial the same shop number. Busy / no answer → Vowroad.",
    },
    {
      step: "04",
      title: "Test call + dashboard",
      description: "One test ring. Routine jobs auto-confirm; P1 or unclear waits for your 1 / 2.",
    },
  ],
};

export const schedulingModesEn = {
  id: "scheduling",
  label: "Booking policy",
  title: "Routine jobs confirm instantly. Urgent or unclear waits for you.",
  subtitle:
    "One smart policy — no Speed / Hybrid / Manual switches. Clear P2/P3 lands on your calendar. P1 emergencies and messy intakes need your text: 1 = yes, 2 = pass.",
  modes: [
    {
      id: "auto",
      name: "Smart auto-book",
      badge: "Built in" as string | null,
      tagline: "Fast when it's clear · you decide when it's not",
      description:
        "Customer picks a visit time. Routine jobs with complete info confirm right away. P1 or unclear name/address? You get a text before anything is locked in.",
      details: [
        { label: "P2 / P3 · clear info", value: "Auto confirm" },
        { label: "P1 emergency", value: "Your 1 / 2 first" },
        { label: "Fuzzy name / address", value: "Your 1 / 2 first" },
        { label: "Changed your mind", value: "Reply 9 to undo" },
      ],
      bestFor: "Owner-operators who want speed without blind auto-dispatch",
    },
  ],
  footnote: "On confirm, crew SMS goes out when techs are set up — round-robin, 1=accept 2=pass.",
};

export const dataTrustEn = {
  id: "data-trust",
  label: "Your data",
  title: "Customer info stays with your shop",
  subtitle: "Private booking links. No lead resale. Optional sync to tools you already use.",
  points: [
    {
      title: "Shop-owned records",
      description: "Name, phone, and address go to your dashboard - not a lead marketplace.",
    },
    {
      title: "Private links",
      description: "Booking links expire. Homeowners see open times only.",
    },
    {
      title: "Works with your stack",
      description: "Jobber, Housecall Pro, and ServiceTitan stay your dispatch source of truth.",
    },
  ],
  footnote: "See how we handle data in our",
};

export const socialProofEn = {
  title: "Built for real HVAC shops",
  items: [
    { stat: "~10 min", label: "typical go-live" },
    { stat: "3 layers", label: "phone · analytics · AI" },
    { stat: "24/7", label: "forward when you want" },
    { stat: "$400+", label: "one saved call can cover the month" },
  ],
  badges: ["US residential HVAC", "Same shop number", "Jobber optional"],
  testimonials: [] as Array<{
    quote: string;
    name: string;
    detail: string;
    label?: string;
  }>,
};

export const signupFlowEn = {
  title: "Up and running in ~10 minutes",
  subtitle: "No sales call. Pick a plan, set hours, forward calls, test once.",
  steps: [
    {
      step: "01",
      title: "Choose a plan",
      description: "Unlimited or Flex. Stripe checkout.",
      time: "1 min",
    },
    {
      step: "02",
      title: "Set your hours",
      description: "Evenings, weekends, busy-only — your forward rules.",
      time: "2 min",
    },
    {
      step: "03",
      title: "Forward the main line",
      description: "Customers still dial your shop. Unanswered → Vowroad.",
      time: "5 min",
    },
    {
      step: "04",
      title: "Test call + dashboard",
      description: "One test ring. See intake, analytics, and Vowroad AI on your phone.",
      time: "2 min",
    },
  ],
};

export const pricingEn = {
  title: "One no-heat call at 2 AM pays for the month",
  subtitle: "Unlimited for busy shops. Flex when nights are quieter.",
  compare: [
    { label: "AI phone + link intake", amount: "Included" },
    { label: "Shop analytics + Vowroad AI", amount: "Included" },
    { label: "Owner SMS (FYI + exceptions)", amount: "Included" },
    { label: "Jobber sync", amount: "Optional", highlight: true },
  ],
  plans: [
    {
      id: "unlimited" as const,
      name: "Unlimited",
      badge: "Most popular",
      description: "Heavy evenings and peak season. Flat rate.",
      price: SITE.monthlyPrice,
      period: "/mo",
      usageLine: "No per-booking fees",
      features: [
        "Unlimited forward windows",
        "Auto calendar + crew text",
        "Smart owner SMS exceptions",
        "Jobber connect optional",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — Unlimited`,
    },
    {
      id: "flex" as const,
      name: "Flex",
      badge: "Lighter volume",
      description: "Pay per confirmed booking. Quiet months stay cheap.",
      price: SITE.flexBasePrice,
      period: "/mo",
      usageLine: `+ ${SITE.flexPerBooking} per approved booking`,
      features: [
        "Same intake and auto-book flow",
        "Custom forward hours",
        "Per confirmed booking only",
        "Jobber connect optional",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Flex`,
    },
  ],
  tip: `Confirming 9+ jobs a month? Unlimited (${SITE.monthlyPrice}) usually wins.`,
  footnote: "No charge for spam, wrong numbers, or jobs you cancel.",
};

export const getStartedEn = {
  eyebrow: "Get started",
  title: "Put Vowroad on your line",
  subtitle: `Unlimited ${SITE.monthlyPrice}/mo or Flex ${SITE.flexBasePrice}/mo + ${SITE.flexPerBooking} per approved booking`,
  canceledMessage: "Checkout canceled. Pick a plan below to try again.",
  checkoutError: "Couldn't start checkout. Try again or sign up to continue.",
  demoNotice: "Payments aren't live yet. Pick a plan and sign up to finish setup.",
  afterPay: "After checkout → set hours & forwarding → test call (~10 min)",
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
      q: "How is this different from Jobber AI or CallJolt?",
      a: "They auto-book everything. Vowroad auto-books clear routine jobs too — but P1 emergencies and unclear intakes wait for your 1 / 2 before confirming.",
    },
    {
      q: "Does this replace Jobber or ServiceTitan?",
      a: "No. Vowroad is the missed-call layer. Your dispatch software stays. Jobber connect is optional.",
    },
    {
      q: "What if the AI gets something wrong?",
      a: "Unclear address or name? Job waits for your 1 / 2. Already auto-booked? Reply 2 to cancel or 9 to undo within your window. Tighten rules anytime in settings or ask Vowroad AI.",
    },
    {
      q: "Is this just an AI answering service?",
      a: "No. The AI phone layer is the core — but you also get shop analytics (missed calls, KPIs, trends) and Vowroad AI to ask what is happening and change rules from your phone.",
    },
    {
      q: "Who answers during the day?",
      a: "You do — same as today. Vowroad only picks up forwarded calls when you miss them or after hours.",
    },
    {
      q: "Can it text my tech after a job confirms?",
      a: "Yes — optional round-robin on confirm: one tech at a time, reply 1=accept 2=pass. Add tech numbers in settings.",
    },
    {
      q: "What is Agreement Keeper?",
      a: "When you mark a job complete, Vowroad can SMS your maintenance plan offer. Track renewals, import CSVs, and get reminder texts before contracts lapse.",
    },
    {
      q: "How fast to go live?",
      a: "About 10 minutes: contact, hours, forward, test call.",
    },
    {
      q: "Who is this for?",
      a: "US residential HVAC — 1 to 5 trucks, owner-operators losing after-hours and on-job calls.",
    },
  ],
};

export const agreementKeeperEn = {
  id: "agreement-keeper",
  label: "Agreement Keeper",
  title: "Book the job. Offer the plan. Renew on autopilot.",
  subtitle:
    "Most shops lose PM revenue because nobody follows up after the truck leaves. Vowroad texts your plan when a job is marked complete — then tracks renewals so contracts don't quietly expire.",
  steps: [
    {
      title: "Job completes",
      description: "You mark the visit done in dashboard or Jobber sync.",
    },
    {
      title: "SMS plan offer",
      description: "Customer gets a one-tap link to enroll in your default maintenance plan.",
    },
    {
      title: "Renewal radar",
      description: "Import existing PM spreadsheets. See who's renewing in 30 days.",
    },
    {
      title: "Reminder texts",
      description: "You and the customer get SMS nudges before renewal — no spreadsheet hunting.",
    },
  ],
  bullets: [
    "Offer after complete (on by default)",
    "CSV import for legacy PM lists",
    "Owner + customer renewal reminders",
    "Est. MRR on your dashboard",
  ] as const,
};

export const ctaEn = {
  eyebrow: "Your line. Your calendar. Your assistant.",
  title: "Forward tonight. Wake up to booked work.",
  subtitle: "AI phone intake, shop analytics, and Vowroad AI — one subscription for owner-operators who miss calls on the job.",
  button: CHECKOUT_CTA,
};

export const navEn = {
  product: "How it works",
  about: "Why us",
  scheduling: "Booking",
  howItWorks: "Go live",
  pricing: "Pricing",
  getStarted: "Get started",
};

export const footerEn = {
  privacy: "Privacy",
  terms: "Terms",
  contact: "Contact",
  tagline: "AI phone, analytics, and ops assistant for HVAC shops.",
  brandMeaning: "Missed call → AI intake → booked window → tech on the way. Jobber optional.",
  subline: "US residential HVAC — works with Jobber; HCP and ServiceTitan stay your dispatch tools",
};
