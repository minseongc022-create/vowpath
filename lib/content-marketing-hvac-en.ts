/**
 * HVAC vertical marketing copy — US English.
 * Only contains claims backed by implemented features.
 */
export const hvacHero = {
  eyebrow: "Built for HVAC shops · 1–15 technicians",
  headline: "Never lose a no-heat call at 2 AM again",
  subhead:
    "Effiroad answers every call 24/7, qualifies the job, and dispatches your on-call tech automatically — in under 90 seconds for no-heat emergencies. Gas smell? Always held for your approval.",
  primaryCta: "Start free trial",
  secondaryCta: "See how it works",
  trustPills: [
    "24/7 AI intake",
    "No-heat auto-dispatch",
    "Gas smell always held",
    "Owner SMS in 30s",
  ] as const,
};

export const hvacProblem = {
  title: "Your phone rings at midnight. You're on another call.",
  body: "No-heat calls in January are $1,500–$3,000 jobs. Missing one means the customer calls your competitor, who answers. Effiroad is the layer between your phone and those missed calls.",
  points: [
    "Calls after hours go to voicemail — and to the next shop",
    "No-heat in winter is a P1 emergency — 90 seconds matters",
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
  unlimited: {
    name: "Unlimited",
    price: "$199/mo",
    description: "Unlimited calls, dispatches, and SMS. No per-job fees.",
    features: [
      "24/7 AI phone intake",
      "No-heat auto-dispatch",
      "Owner SMS with 1/2 hold",
      "Dashboard + analytics",
      "Optional Jobber sync",
    ],
  },
  flex: {
    name: "Flex",
    price: "$49/mo + $18/dispatch",
    description: "Low base, pay per confirmed dispatch.",
    features: [
      "Same intake and dispatch features",
      "Billed per auto-confirmed job",
      "Cancel anytime",
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
];

export const hvacSeoMeta = {
  title: "Effiroad for HVAC — AI Intake & Dispatch for HVAC Companies",
  description:
    "Effiroad answers every HVAC call 24/7, dispatches no-heat emergencies automatically in under 90 seconds, and holds gas smell calls for owner approval. $199/mo, no CRM needed.",
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
