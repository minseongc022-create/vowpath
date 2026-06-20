import { SITE } from "./constants";
import { getCheckoutCta } from "./marketing-constants";

const CHECKOUT_CTA = getCheckoutCta();

export const heroEn = {
  badge: "Missed calls → calendar → contracts",
  headline: "Catch the call.",
  headlineAccent: "Keep the contract.",
  brandLine:
    "Vowpath auto-books clear HVAC jobs from your same shop line — then turns completed visits into maintenance plans so recurring revenue doesn't walk out the door.",
  subhead:
    "Overflow, after-hours, and peak-season rings land on your calendar. P1 still pings you. Unclear intakes wait for 1 / 2. When the truck rolls, Agreement Keeper offers your PM plan by text.",
  trustLine: "Built for 1–5 truck owner-operators · Jobber optional",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "See how it works",
  secondaryCtaHref: "/#missed-call-flow",
  heroBadges: [
    "Auto calendar",
    "Crew SMS dispatch",
    "PM plan offers",
    "Jobber optional",
  ] as const,
};

export const missedCallFlowEn = {
  id: "missed-call-flow",
  title: "How a real HVAC shop runs — with Vowpath on the gaps",
  subtitle:
    "You still answer during the day. Vowpath only handles what you miss: overflow, after hours, and peak-season hold times.",
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
        "On a roof, after 6pm, or when three lines ring at once — unanswered calls route to Vowpath.",
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
        "Phone intake or SMS link. They tap a real open slot — not a callback promise.",
    },
    {
      id: "approve",
      title: "Calendar confirms (auto)",
      description:
        "Clear jobs land on your calendar instantly. P1 still books — you get an urgent SMS. Messy address or name? Held for your 1 / 2.",
    },
    {
      id: "scheduled",
      title: "Job on your board",
      description:
        "Confirmed visits hit dashboard and Jobber (if connected). Crew gets a text when enabled. Reply 9 to undo within your window.",
    },
    {
      id: "pm",
      title: "Offer the PM plan",
      description:
        "Mark complete → customer gets your maintenance plan by SMS. Renewals tracked in Agreement Keeper.",
    },
  ],
};

export const approvalLoopEn = {
  id: "approval-loop",
  label: "Smart exceptions",
  title: "Auto-book the routine. Ping you for what actually needs a human.",
  summary:
    "Competitors auto-book everything — including bad addresses. Vowpath auto-books clear jobs like they do, but holds unclear intakes and flags P1 so you can cancel from the truck.",
  tags: ["Auto calendar", "P1 urgent SMS", "Hold on unclear", "Reply 9 undo"] as const,
  smsExample: {
    customer: "John Smith",
    issue: "No Cooling",
    window: "Tomorrow 2PM",
    approveLabel: "Routine = FYI only",
    declineLabel: "Unclear = Reply 1 · 2",
  },
  nodes: [
    { id: "customer", title: "Customer picks slot", caption: "Real open time" },
    { id: "vowpath", title: "Vowpath", caption: "Auto confirm" },
    { id: "owner", title: "Your phone", caption: "FYI or 1 / 2" },
    { id: "customer-out", title: "Job scheduled", caption: "SMS + Jobber" },
  ] as const,
  edges: [
    "HVAC triage + intake",
    "Calendar confirms instantly",
    "Urgent / unclear → your text",
  ] as const,
};

export const aboutEn = {
  id: "about",
  badge: "Built for owner-operators",
  title: "More booked jobs. Fewer thumbs on every alert.",
  subtitle:
    "Big shops have CSRs and dispatchers. On a 1–5 truck crew, missed calls and slow callbacks cost tickets — Vowpath auto-books the clear stuff so you keep working.",
  paragraphs: [
    "Answering services leave voicemails. Generic AI books into your calendar — including jobs you would have declined. Vowpath captures the call, triages HVAC urgency, and puts clear requests on your calendar while you stay on the ladder.",
    "You still get control where it counts: P1 no-heat triggers an urgent text (job already booked — reply 2 to cancel). Fuzzy address or name? We hold for your 1 / 2. Same number. No dispatch software swap.",
  ],
  pillars: [
    {
      label: "Capture",
      meaning: "After-hours and overflow become calendar slots — not voicemail tag at 7 AM.",
    },
    {
      label: "Exceptions",
      meaning: "Auto-book by default. You only text back for urgent or unclear jobs.",
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
      feature: "Auto Book default + smart holds",
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
  title: "What HVAC shops get with Vowpath",
  subtitle: "Auto-book speed — with triage and exceptions built for owner-operators.",
  items: [
    {
      title: "Auto calendar (default)",
      description:
        "Customers pick real open slots. Clear jobs confirm instantly — you get a heads-up, not a homework assignment.",
    },
    {
      title: "P1 still books — you get urgent SMS",
      description:
        "No-heat lands on the calendar and crew gets notified. You can cancel from the truck if it looks wrong.",
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
        "Owner SMS, email backup, Job Cards, and the Vowpath dashboard. Nothing else to buy or connect.",
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
  footnote: "Connect or skip in settings. Vowpath works either way.",
};

export const comparisonEn = {
  id: "comparison",
  title: "Auto-book speed — with HVAC triage and owner exceptions",
  subtitle:
    "Jobber AI and CallJolt auto-book everything. Vowpath does too for clear jobs — but holds messy intakes and flags P1 so bad bookings do not slip through.",
  headers: ["", "Vowpath", "AI auto-book", "Answering service"],
  rows: [
    ["Auto-book to calendar", "Yes — default", "Yes", "No — message only"],
    ["HVAC P1 / P2 / P3 triage", "Built in", "Varies", "Script varies"],
    ["Hold unclear address / name", "Yes", "Rare", "N/A"],
    ["P1 urgent owner alert", "Yes — job booked + SMS", "Sometimes", "Email / portal"],
    ["Customer picks real open slot", "Yes", "Often", "Rare"],
    ["Keep your shop number", "Yes", "Forward required", "Often new number"],
    ["Works without Jobber / ST / HCP", "Yes — SMS + dashboard", "Usually needs CRM", "Separate tool"],
    ["Jobber sync on confirm", "Yes", "On intake", "Manual retype"],
    ["Go live", "~10 minutes", "Days + CRM setup", "Days + scripting"],
    ["Price (typical)", "$199/mo flat", "$99–$500+ add-on", "$200–$800/mo"],
  ],
};

export const featuresEn = {
  title: "How each feature puts money back in your pocket",
  subtitle: "Missed-call capture, auto calendar, crew text — tied to real shop moments.",
  items: [
    {
      title: "Auto calendar + booking rules",
      description:
        "Private SMS links show real availability — visit length, gaps, and crew capacity built in. Default Auto Book confirms clear jobs; Hybrid or Manual when you want more gates.",
      tag: "Core",
    },
    {
      title: "After-hours capture",
      description: "AI intake runs nights and weekends. Jobs confirm per your booking mode — not voicemail.",
      tag: "Core",
    },
    {
      title: "Visit length · gaps · crews",
      description:
        "Set how long each job takes, minutes between visits, and how many crews can run at once. The calendar only shows times that fit your rules.",
      tag: "Core",
    },
    {
      title: "Smart owner SMS",
      description:
        "Routine jobs = FYI text. P1 = urgent alert. Unclear intake = reply 1 / 2. Ref codes on every message.",
      tag: "Core",
    },
    {
      title: "Crew text dispatch",
      description: "On confirm, round-robin to techs: reply 1=accept 2=pass. Optional — on by default when you add techs.",
      tag: "Core",
    },
    {
      title: "Missed-call analytics",
      description: "See what would've hit voicemail — and what Vowpath turned into bookings.",
      tag: "Core",
    },
    {
      title: "Customer confirmation texts",
      description: "Homeowners know: received, scheduled, or pending your review.",
      tag: "Included",
    },
    {
      title: "Dashboard · email · Jobber",
      description:
        "Every job tracked in one place. Connect Jobber and confirmed visits sync — no double entry.",
      tag: "Included",
    },
  ],
};

export const trustRoiEn = {
  title: "The math is simple",
  subtitle: "Vowpath is built around moments where one delayed response can lose the job.",
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
      label: "Vowpath Unlimited",
      value: SITE.monthlyPrice + "/mo",
      hint: "Or Flex from " + SITE.flexBasePrice + "/mo",
    },
  ],
  footnote: "The promise is specific: fewer missed calls, more auto-confirmed routine jobs, and owner texts only when it is urgent or unclear.",
};

export const aiDispatcherEn = {
  id: "ai-dispatcher",
  label: "Vowpath AI",
  title: "Ask your shop what is happening",
  subtitle:
    "The chat is not a toy assistant. It reads your calls, bookings, approvals, settings, and automation rules so you can run the shop from a truck seat.",
  cards: [
    {
      title: "Ask what came in",
      description: "Get operational answers without digging through menus:",
      items: [
        '"What happened yesterday?"',
        '"Any urgent no-cool calls?"',
        '"How many bookings this week?"',
      ],
    },
    {
      title: "Find revenue risk",
      description: "See what still needs attention before the homeowner moves on:",
      items: [
        '"Show pending approvals."',
        '"Which jobs need me?"',
        '"What came in after hours?"',
      ],
    },
    {
      title: "Change booking rules",
      description: "Plain English changes become guarded admin actions:",
      items: [
        '"Switch to Hybrid."',
        '"Auto-book P2 and P3 only."',
        '"Go back to manual approval."',
      ],
    },
    {
      title: "Create automations",
      description: "Let the AI enforce your shop policy while you work:",
      items: [
        '"No-cool tune-ups can auto-book."',
        '"Weekends always need approval."',
        '"P1 should text me every time."',
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
      title: "When Vowpath answers",
      description: "Evenings, weekends, or no-answer — your hours, your rules.",
    },
    {
      step: "03",
      title: "Forward the main line",
      description: "Customers dial the same shop number. Busy / no answer → Vowpath.",
    },
    {
      step: "04",
      title: "Test + auto-book",
      description: "One test call. Pick a slot. Job lands on dashboard — Jobber if connected.",
    },
  ],
};

export const schedulingModesEn = {
  id: "scheduling",
  label: "Booking",
  title: "Smart auto-book — with owner gates where it matters",
  subtitle:
    "No mode switches. Clear routine jobs confirm while you work. Emergencies and fuzzy intakes always wait for your OK.",
  modes: [
    {
      id: "auto",
      name: "Smart auto-book",
      badge: "Default" as string | null,
      tagline: "Fast when it's clear · you decide when it's not",
      description:
        "Customer picks a visit time. If the intake is routine and complete, the job lands on your calendar. P1 or unclear details? You get a text to approve (1) or pass (2).",
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
  title: "Built for shops like yours",
  items: [
    { stat: "~10 min", label: "to go live" },
    { stat: "Auto", label: "calendar by default" },
    { stat: "24/7", label: "overflow coverage" },
    { stat: "$400+", label: "one saved call can cover the month" },
  ],
  badges: ["Residential HVAC", "Same shop number", "Jobber optional"],
  testimonials: [
    {
      quote:
        "I forward after 6pm only. First week two no-cool jobs landed on the calendar before I saw the text — would've been voicemail at 7am.",
      name: "Mike R.",
      detail: "6-tech shop, Austin TX",
      label: "Early beta example",
    },
    {
      quote:
        "I don't want another system to learn. Forward, calendar fills, Jobber gets the request. I only text back when it's P1 or the address looks wrong.",
      name: "Sarah L.",
      detail: "Owner-operator, Phoenix",
      label: "Early beta example",
    },
    {
      quote:
        "We still dispatch in ServiceTitan. Vowpath is the night shift that actually books slots.",
      name: "Tom K.",
      detail: "12 trucks, Dallas",
      label: "Early beta example",
    },
  ],
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
      description: "Customers still dial your shop. Unanswered → Vowpath.",
      time: "5 min",
    },
    {
      step: "04",
      title: "Pick a booking mode",
      description: "Auto Book is default. Switch to Hybrid or Manual when you want.",
      time: "1 min",
    },
  ],
};

export const pricingEn = {
  title: "One no-heat call at 2 AM pays for the month",
  subtitle: "Unlimited for busy shops. Flex when nights are quieter.",
  compare: [
    { label: "After-hours answering", amount: "Included" },
    { label: "Auto calendar + booking links", amount: "Included" },
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
  title: "Put Vowpath on your line",
  subtitle: `Unlimited ${SITE.monthlyPrice}/mo or Flex ${SITE.flexBasePrice}/mo + ${SITE.flexPerBooking} per approved booking`,
  canceledMessage: "Checkout canceled. Pick a plan below to try again.",
  checkoutError: "Couldn't start checkout. Try again or sign up to continue.",
  demoNotice: "Payments aren't live yet. Pick a plan and sign up to finish setup.",
  afterPay: "After checkout → hours, forwarding, mode — ~10 minutes",
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
      a: "They auto-book everything. Vowpath auto-books clear jobs too — but holds unclear intakes and sends urgent SMS on P1 so you can cancel bad bookings from the truck.",
    },
    {
      q: "Does this replace Jobber or ServiceTitan?",
      a: "No. Vowpath is the missed-call layer. Your dispatch software stays. Jobber connect is optional.",
    },
    {
      q: "What if the AI gets something wrong?",
      a: "Unclear address or name? Job waits for your 1 / 2. Already auto-booked? Reply 2 to cancel or 9 to undo within your window. Switch to Manual anytime.",
    },
    {
      q: "What is Auto Book vs Hybrid vs Manual?",
      a: "Auto Book (default): clear jobs confirm instantly; P1 books with urgent SMS; messy intakes hold. Hybrid: P1 waits for 1 / 2. Manual: every job needs your text.",
    },
    {
      q: "Who answers during the day?",
      a: "You do — same as today. Vowpath only picks up forwarded calls when you miss them or after hours.",
    },
    {
      q: "Can it text my tech after a job confirms?",
      a: "Yes — optional round-robin on confirm: one tech at a time, reply 1=accept 2=pass. Add tech numbers in settings.",
    },
    {
      q: "What is Agreement Keeper?",
      a: "When you mark a job complete, Vowpath can SMS your maintenance plan offer. Track renewals, import CSVs, and get reminder texts before contracts lapse.",
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
    "Most shops lose PM revenue because nobody follows up after the truck leaves. Vowpath texts your plan when a job is marked complete — then tracks renewals so contracts don't quietly expire.",
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
  eyebrow: "Your competitor books at 7 PM. You can too.",
  title: "Forward tonight. Wake up to a fuller calendar.",
  subtitle: "Same number. HVAC triage. Auto-book by default — you text back only when it matters.",
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
  tagline: "Stop losing customers to missed calls.",
  brandMeaning: "Missed call → HVAC intake → auto calendar → booked job. Jobber optional.",
  subline: "US residential HVAC - works with Jobber, HCP, and ServiceTitan",
};
