import { SITE } from "./constants";
import { getCheckoutCta } from "./marketing-constants";

const CHECKOUT_CTA = getCheckoutCta();

/**
 * HVAC vertical marketing copy — US English.
 * Only contains claims backed by implemented features.
 */
export const hvacHero = {
  eyebrow: "HVAC phone → truck · 1–15 technicians",
  headline: "Never lose a no-heat call at 2 AM again",
  subhead:
    "Effiroad answers every call 24/7 with a calm US voice, qualifies the job, and rolls clear no-heat / no-cool to your on-call tech. Gas smell or sparking? Always held for your 1 / 2. Homeowners get ETA SMS + a live map — better than voicemail or a tired night receptionist.",
  primaryCta: "Start free trial",
  secondaryCta: "See how it works",
  trustPills: [
    "Calm natural US voice",
    "No-heat auto-dispatch",
    "Gas smell always held",
    "Owner 1 / 2 + reply 9 undo",
  ] as const,
};

export const hvacProblem = {
  title: "Your phone rings at midnight. You're on another call.",
  body: "No-heat calls in January are $1,500–$3,000 jobs. Missing one means the customer calls your competitor, who answers. Effiroad is the layer between your phone and those missed calls.",
  points: [
    "Calls after hours go to voicemail — and to the next shop",
    "No-heat in winter is a P1 emergency — every minute matters",
    "Gas smell calls need a human to decide — auto-dispatch is wrong",
  ],
};

export const hvacDispatchPolicy = {
  title: "Smarter than blind auto-dispatch",
  description:
    "ServiceAgent dispatches everything automatically. Effiroad knows the difference.",
  rows: [
    {
      scenario: "No heat / no cooling · verified address · clear intake",
      action: "Auto-dispatch on-call tech + owner FYI SMS",
      badge: "auto",
    },
    {
      scenario: "Gas smell · sparking · electrical concern",
      action: "Owner SMS hold — reply 1 to dispatch, 2 to hold",
      badge: "hold",
    },
    {
      scenario: "Low confidence intake OR unverified address",
      action: "Owner SMS hold — never dispatch blind",
      badge: "hold",
    },
    {
      scenario: "Maintenance / tune-up / routine scheduling",
      action: "Auto-confirm + customer slot selection",
      badge: "auto",
    },
  ],
};

export const hvacHowItWorks = {
  title: "How Effiroad works for HVAC",
  steps: [
    {
      number: "1",
      title: "Forward your overflow calls",
      description:
        "Keep your main number. Forward to Effiroad only when busy or after hours — a 30-second change in your carrier settings.",
    },
    {
      number: "2",
      title: "AI answers and qualifies",
      description:
        "Effiroad asks what's going on, captures the address, and classifies the issue — no heat, gas smell, routine maintenance, or something else.",
    },
    {
      number: "3",
      title: "Smart dispatch or owner hold",
      description:
        "Clear no-heat emergencies dispatch automatically. Gas smell or ambiguous calls text you first — reply 1 to send, 2 to hold.",
    },
    {
      number: "4",
      title: "Customer gets a confirmation",
      description:
        "Customer receives an SMS with their request details. You see everything in the dashboard.",
    },
  ],
};

export const hvacPricing = {
  title: "Simple pricing for HVAC shops",
  note: "Choose dispatch billing (recommended) or Voice minute plans on the pricing page.",
  pro: {
    name: "Pro",
    price: `${SITE.proPrice}/mo`,
    description: `${SITE.proIncludedDispatches} dispatches/mo · free estimates · gas smell always held. Only approved jobs count.`,
    features: [
      "High-quality natural US voice",
      "Free estimates (press 2) — never billed",
      "No-heat auto-dispatch",
      "Gas / electrical → owner 1 / 2",
      "Only approved/scheduled jobs bill",
      "No CRM required",
      "Optional Jobber sync",
    ],
  },
  flex: {
    name: "Flex",
    price: `${SITE.flexBasePrice}/mo + ${SITE.flexPerBooking}/dispatch`,
    description: "Low base · free estimates · pay only per approved dispatch.",
    features: [
      "Same intake + owner holds as Pro",
      "Free estimates on every plan",
      "Billed only when a job is approved/scheduled",
      "Cancel anytime",
    ],
  },
  voice: {
    name: "Voice Starter",
    price: `${SITE.voiceStarterPrice}/mo · ${SITE.voiceStarterIncludedMinutes} min`,
    description: `Per-minute option · then ${SITE.voiceStarterOveragePerMinute}/min · same holds, no live-agent transfer fees.`,
    features: [
      "Included talk-minutes + clear overage",
      "Same AI intake + owner 1 / 2",
      "Free estimates never billed",
      "No CRM required",
    ],
  },
};

export const hvacFaq = [
  {
    q: "Does this replace my CRM (ServiceTitan, Fieldedge, Housecall Pro)?",
    a: "No. Effiroad is an intake and dispatch layer on top of what you already use — it handles the phone and first-contact, then pushes job info to your existing workflow. No CRM migration required.",
  },
  {
    q: "What happens when a customer calls about gas smell?",
    a: "Effiroad flags gas smell as a safety hold and texts you immediately with the caller's name, address, and what they reported. It does not auto-dispatch — you decide.",
  },
  {
    q: "Can I still answer calls myself if I want to?",
    a: "Yes. Forward to Effiroad only on overflow (busy) or after-hours — your daytime calls still ring you directly.",
  },
  {
    q: "How long does setup take?",
    a: "About 10 minutes: set your answer hours, forward your overflow, and configure your on-call tech. See the HVAC onboarding guide.",
  },
  {
    q: "Do estimate calls count toward my plan?",
    a: "No. Press 2 estimate intakes are free on every plan. Only approved or scheduled emergency dispatches count toward included jobs or per-dispatch fees.",
  },
  {
    q: "When does HVAC auto-dispatch vs wait for me?",
    a: "Clear P1 no-heat / no-cool with solid intake confidence can auto-schedule after the customer confirms address + visit time on the SMS link — then your on-call tech gets the crew SMS. Gas smell, sparking, electrical/CO concerns, low confidence, or fuzzy details always wait for your 1 / 2. Never blind-roll a safety call.",
  },
  {
    q: "Why confirm the street address on a link after the phone call?",
    a: "Misheard addresses are a top after-hours failure. Effiroad collects and reads back the address on the call, then texts a link where the homeowner confirms or edits with typed/map search and picks a window — fast on the phone, accurate before a truck rolls.",
  },
];

export const hvacSeoMeta = {
  title: "Effiroad for HVAC — AI Intake & Dispatch for HVAC Companies",
  description:
    `Effiroad answers every HVAC call 24/7 with a natural US voice, auto-dispatches verified no-heat emergencies, and holds gas smell for your 1 / 2. From ${SITE.proPrice}/mo Pro or Flex for lighter months — no CRM needed.`,
  ogTitle: "Effiroad — Never Lose a No-Heat Call at 2 AM",
  ogDescription:
    "AI-powered call intake and dispatch built for HVAC shops. No-heat auto-dispatch. Gas smell always held.",
  keywords: [
    "HVAC AI answering service",
    "no heat dispatch automation",
    "HVAC after hours intake",
    "HVAC missed call recovery",
    "HVAC tech dispatch software",
    "Effiroad HVAC",
  ],
};

export const problemHvac = {
  id: "problem",
  title: "At 6 AM the heat dies. You're already on another job. The next shop answers.",
  subtitle:
    "Industry studies show a large share of HVAC emergency calls go unanswered after hours. Customers don't leave voicemail — they call the next name on Google. One saved no-heat job pays for the month.",
  stats: [
    { value: "20–47%", label: "of after-hours calls go unanswered (industry studies)" },
    { value: "$1,500+", label: "avg no-heat/no-cool job" },
    { value: "~85%", label: "of callers try the next company if you don't answer (industry studies)" },
  ],
  callout: "You don't need more leads. You need to answer the line you already advertise.",
};

export const productStackHvac = {
  id: "product-stack",
  label: "What Effiroad is",
  title: "One platform — three layers",
  subtitle:
    "Answering services take a message. Effiroad qualifies the job, triages urgency, alerts you when it matters, and gets a tech rolling — without voicemail roulette.",
  layers: [
    {
      id: "phone",
      tier: "core" as const,
      badge: "Main",
      label: "AI phone layer",
      title: "Catch every emergency you miss on the job",
      description:
        "After-hours, overflow, and no-answer calls forward to Effiroad. Menu: press 1 = service (then phone AI or text link), press 2 = estimate — or say “text link” for an SMS form. Issue type, address, and how urgent it is.",
      points: [
        "Same company number on Google",
        "No-heat / no-cool / gas smell triage",
        "Phone or SMS link intake",
        "Auto-dispatch + owner 1 / 2 on safety calls",
      ],
    },
    {
      id: "analytics",
      tier: "sub" as const,
      badge: null,
      label: "AI analytics",
      title: "See what almost went to the next shop",
      description:
        "Dashboard KPIs, missed-call prevention, and recovery estimates — know what would have hit voicemail and what turned into a booked job.",
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
        "Pending approvals + gas-smell flags",
        "Guarded settings changes",
        "Optional daily SMS briefing",
      ],
    },
  ],
  footnote:
    "Optional CRM sync, crew round-robin texts, and secure update/reschedule links are built in — connect what you use, skip what you don't.",
};

export const missedCallFlowHvac = {
  id: "missed-call-flow",
  title: "From ring to on-site — without losing the job",
  subtitle:
    "What the customer experiences from the first call until your tech arrives. You stay in control; Effiroad handles the gaps.",
  steps: [
    {
      id: "call",
      title: "Customer calls your line",
      description:
        "Same number on your trucks and Google — no new number to explain when their heat just died.",
    },
    {
      id: "forward",
      title: "You miss it → Effiroad answers",
      description:
        "On a job, after hours, or when the phone's ringing off the hook — unanswered calls forward to the AI phone layer.",
    },
    {
      id: "intake",
      title: "Intake + issue triage",
      description:
        "Phone or SMS link. No-heat, no-cool, gas smell, or routine maintenance — captured before anyone rolls.",
    },
    {
      id: "approve",
      title: "Dispatch or hold",
      description:
        "Clear no-heat/no-cool calls can auto-dispatch. Gas smell, sparking, or fuzzy details wait for your text: 1 = go, 2 = pass.",
    },
    {
      id: "dispatch",
      title: "Tech gets the job",
      description:
        "Optional round-robin tech SMS — accept or pass. Job Card ready with notes for the visit.",
    },
    {
      id: "onway",
      title: "On the way text",
      description:
        "Tech replies with ETA — customer gets an on-the-way message without you typing it twice.",
    },
    {
      id: "arrival",
      title: "Tech on site",
      description:
        "Work starts in the window you promised. Mark complete in dashboard — the customer relationship stays with you.",
    },
  ],
};

export const approvalLoopHvac = {
  id: "approval-loop",
  label: "Smart dispatch",
  title: "Auto-dispatch the clear jobs. Ping you for what needs a human.",
  summary:
    "Generic AI forwards a message. Effiroad auto-dispatches standard no-heat/no-cool jobs with complete info — but holds gas smell, sparking, and unclear addresses for your 1 / 2 before anyone rolls.",
  tags: ["No-heat / no-cool = auto-dispatch", "Gas smell / electrical → 1 / 2", "Unclear → 1 / 2", "Reply 9 undo"] as const,
  smsExample: {
    customer: "Sarah Bennett",
    issue: "No heat overnight",
    window: "Tonight · on-call",
    approveLabel: "Standard no-heat = auto-dispatched",
    declineLabel: "Gas smell / electrical / unclear = Reply 1 · 2",
  },
  nodes: [
    { id: "customer", title: "Caller reports issue", caption: "Address + issue type" },
    { id: "effiroad", title: "Effiroad", caption: "Standard dispatches" },
    { id: "owner", title: "Your phone", caption: "Safety / unclear → 1 / 2" },
    { id: "customer-out", title: "Tech en route", caption: "SMS + Job Card" },
  ] as const,
  edges: [
    "HVAC triage + intake",
    "Clear no-heat/no-cool dispatches fast",
    "Gas smell or fuzzy details → your text",
  ] as const,
};

export const aiDispatcherHvac = {
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
        '"Any gas-smell calls still open?"',
        '"Who\'s on the way?"',
      ],
    },
    {
      title: "Jobs at risk",
      description: "Surface calls before the customer moves on:",
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
        '"We don\'t service commercial rooftop units."',
        '"Our service area is …"',
        '"Gas smell always needs my approval."',
      ],
    },
  ],
};

export const schedulingModesHvac = {
  id: "scheduling",
  label: "Dispatch policy",
  title: "Standard no-heat and no-cool dispatch fast. Gas smell waits for you.",
  subtitle:
    "One smart policy — no manual switches. Clear no-heat/no-cool calls roll to the on-call tech. Gas smell, electrical, and unclear intakes need your text: 1 = go, 2 = pass.",
  modes: [
    {
      id: "auto",
      name: "Smart auto-dispatch",
      badge: "Built in" as string | null,
      tagline: "Fast when it's clear · you decide when it's not",
      description:
        "Caller reports a standard no-heat or no-cool issue with complete info? Tech gets the text right away. Gas smell, sparking, or fuzzy address? You approve before anyone rolls.",
      details: [
        { label: "No heat / no cool · clear info", value: "Auto dispatch" },
        { label: "Gas smell / electrical", value: "Your 1 / 2 first" },
        { label: "Unverified address", value: "Your 1 / 2 first" },
        { label: "Changed your mind", value: "Reply 9 to undo" },
      ],
      bestFor: "Owner-operators who want speed without blind dispatch on safety calls",
    },
  ],
  footnote: "On confirm, tech SMS goes out when your crew is set up — round-robin, 1=accept 2=pass.",
};

export const comparisonHvac = {
  id: "comparison",
  title: "Why HVAC shops pick Effiroad",
  subtitle:
    "ServiceAgent auto-dispatches everything. Call centers take messages. Effiroad auto-dispatches clear no-heat/no-cool calls — and holds gas smell, electrical, and messy intakes so bad rolls don't slip through.",
  headers: ["", "Effiroad", "Generic AI call bots", "Human call centers"],
  rows: [
    ["Clear no-heat auto-dispatch", "Yes — tech SMS + owner FYI", "Often blind auto", "No — message only"],
    ["Hold gas smell / electrical", "Hardcoded hold · reply 1 / 2", "Often blind auto", "Message / escalate"],
    ["Reply 9 undo", "Yes", "Rare", "No"],
    ["Call voice quality", "Natural US voice, every call", "Varies", "Human variance"],
    ["HVAC-specific intake", "Built in", "Partial", "Manual notes"],
    ["Works without CRM", "Yes — SMS + dashboard", "Often CRM-locked", "Separate tool"],
    ["Pricing", `Flex from ${SITE.flexBasePrice} · Pro ${SITE.proPrice}`, "Credits / usage", "$300–2K/mo"],
    ["Go live", "~10 minutes", "Days", "Days + scripting"],
  ],
};

export const featuresHvac = {
  title: "Everything that ships today",
  subtitle: "AI phone is the core. Analytics and Effiroad AI are built in — not upsells on a generic call bot.",
  items: [
    {
      title: "AI phone + link intake",
      description:
        "Forwarded calls and SMS intake links. No-heat / no-cool / gas smell triage, verified address, and job-ready notes.",
      tag: "Core",
    },
    {
      title: "Smart dispatch + owner SMS",
      description:
        "Clear standard calls can dispatch instantly. Gas smell, electrical, and unclear intakes ping you: 1 = go, 2 = pass, 9 = undo.",
      tag: "Core",
    },
    {
      title: "Shop analytics dashboard",
      description:
        "KPI cards, trends, missed-call prevention, and drill-downs — see what almost went to the next shop.",
      tag: "Analytics",
    },
    {
      title: "Effiroad AI assistant",
      description:
        "Ask what came in overnight, what's urgent, and what's pending. Change dispatch rules with guarded confirmations.",
      tag: "Assistant",
    },
    {
      title: "Tech dispatch + on my way",
      description:
        "Optional round-robin tech SMS on confirm. Tech replies with ETA — customer gets an on-the-way text.",
      tag: "Included",
    },
    {
      title: "Calendar · email · optional CRM",
      description:
        "Dashboard calendar, owner email backup, and optional Jobber sync — no double entry after a busy day.",
      tag: "Included",
    },
    {
      title: "Update & reschedule links",
      description:
        "Customers update details or reschedule from secure SMS links — private, expiring, redacted after the job.",
      tag: "Included",
    },
    {
      title: "Call recordings + transcripts",
      description:
        "Review what was said on intake calls. Useful for training and quality control.",
      tag: "Included",
    },
  ],
};

export const trustRoiHvac = {
  id: "results",
  title: "Real results. Simple math.",
  subtitle: "Effiroad is built around moments where one missed ring loses a job to the next shop.",
  rows: [
    {
      label: "Avg no-heat/no-cool job",
      value: "$1,500–$3,000",
      hint: "Bigger systems much higher",
    },
    {
      label: "Missed calls / month",
      value: "10–25",
      hint: "Nights, weekends, peak season",
    },
    {
      label: "Effiroad Pro",
      value: SITE.monthlyPrice + "/mo",
      hint: "Or Flex from " + SITE.flexBasePrice + "/mo",
    },
  ],
  footnote: "One saved emergency call often covers months of subscription. The promise: fewer missed rings, faster dispatch on standard calls, owner texts only when it's a safety issue or unclear.",
};

export const socialProofHvac = {
  title: "Built for independent HVAC companies — live in minutes",
  items: [
    { stat: "~10 min", label: "typical go-live" },
    { stat: "24/7", label: "emergency intake" },
    { stat: "3 layers", label: "phone · analytics · AI" },
    { stat: "$3,000+", label: "one saved call can cover the month" },
  ],
  badges: ["US HVAC service", "Same company number", "No CRM required"],
  // No paying customers yet — do not add placeholder/fabricated testimonials here.
  // Add real ones (with permission) once shops are live on the platform.
  testimonials: [] as Array<{
    quote: string;
    name: string;
    detail: string;
    label?: string;
  }>,
};

export const aboutHvac = {
  id: "about",
  badge: "The Road to Efficiency",
  title: "Efficiency is the Road to Limitless Success",
  subtitle:
    "In HVAC, the first company to answer usually gets the job — same day, same call. Effiroad is the efficient path from ring to rolling truck.",
  paragraphs: [
    "Efficiency means fewer steps between a missed ring and a tech on site: intake, triage, owner SMS when it's a safety call, and customer updates without opening ten apps.",
    "Road is the through-line — from the first call to dispatch, on-the-way texts, and optional CRM sync. Built for US owner-operators who live on their cell between jobs.",
    "Effiroad is not just software. It is the efficient path your company takes every day — from an emergency call to a booked job and repeat customers.",
  ],
  pillars: [
    {
      label: "Efficiency",
      meaning: "Auto-dispatch clear no-heat/no-cool calls. Text 1 / 2 when it's gas smell or electrical. Run ops from your phone.",
    },
    {
      label: "Road",
      meaning: "Every step connected — forward, intake, approve, dispatch, on-site — without dead ends.",
    },
  ],
};

export const demoSummaryHvac = {
  title: "What you just saw — HVAC in plain English",
  subtitle:
    "We answer when you're on a job or off the clock — on the schedule you set. No-heat after pick-time; gas smell waits for you.",
  steps: [
    {
      title: "Schedule-based answering",
      body: "Set nights, weekends, storm weeks. Forward unanswered calls — your main number stays on the truck and Google.",
    },
    {
      title: "No-heat after pick-time",
      body: "Verified no-heat with name → SMS to confirm address + pick a window → once confirmed, on-call tech gets crew SMS. You get an FYI text + live map after accept.",
    },
    {
      title: "Gas smell = your call",
      body: "Gas odor, sparking, or unclear intake → owner SMS hold. Reply 1 to dispatch, 2 to hold. Never blind roll.",
    },
    {
      title: "Live in ~10 minutes",
      body: "Sign up, set on-call hours, forward your line, run one test call. Jobber sync optional.",
    },
  ],
} as const;
