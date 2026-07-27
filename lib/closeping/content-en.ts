import { CLOSEPING, CLOSEPING_ROUTES } from "./constants";

export const closePingSeo = {
  title: `${CLOSEPING.name} — ${CLOSEPING.tagline}`,
  description: CLOSEPING.description,
  ogTitle: "Stop losing estimates in your notes app",
  ogDescription:
    "ClosePing sends polite SMS follow-ups at 48 hours, 7 days, and 14 days — until homeowners book or you close the file.",
};

export const closePingHero = {
  eyebrow: "For HVAC · Roofing · Plumbing · Remodeling",
  title: "They said yes to the estimate.\nThen life happened.",
  subtitle:
    "48% of contractors never follow up after sending a quote. ClosePing sends branded SMS nudges at 48h, 7d, and 14d — so warm leads don't die in your inbox.",
  cta: "Start 14-day free trial",
  ctaHref: CLOSEPING_ROUTES.signup,
  secondaryCta: "See how it works",
  secondaryHref: "#how-it-works",
  proof: "One recovered job pays for months of ClosePing",
};

export const closePingStats = [
  { value: "48%", label: "of salespeople never follow up after the first contact" },
  { value: "80%", label: "of closed deals need 5+ touches — not one call" },
  { value: "$4K+", label: "avg monthly revenue leak from unanswered quotes" },
];

export const closePingProblem = {
  title: "You're not bad at sales. You're out of hours.",
  items: [
    {
      title: "“I'll text them tonight”",
      body: "Night never comes. The homeowner gets two other bids while you're still on the ladder.",
    },
    {
      title: "CRM open, follow-up zero",
      body: "ServiceTitan and Jobber are powerful — but if the quote never leaves draft, close rate doesn't move.",
    },
    {
      title: "Forty open estimates in Notes",
      body: "You mean to follow up Friday. Friday becomes never. That's not laziness — it's capacity.",
    },
  ],
};

export const closePingFeatures = [
  {
    icon: "📋",
    title: "Add quotes in 60 seconds",
    body: "Name, phone, job description, amount. Or bulk-import from CSV. No dispatch software required.",
  },
  {
    icon: "📱",
    title: "Send + auto-chase",
    body: "One tap texts the customer your estimate. ClosePing nudges at 48h, 7d, and 14d with polite, opt-out compliant SMS.",
  },
  {
    icon: "📊",
    title: "Pipeline you can trust",
    body: "See what's open, what's chasing, what's due today. Mark won or lost when the job closes.",
  },
  {
    icon: "🔌",
    title: "Layer on top — don't rip out",
    body: "Keep Jobber, ServiceTitan, or Housecall Pro. ClosePing only does the follow-up gap they don't.",
  },
];

export const closePingHow = {
  id: "how-it-works",
  title: "How ClosePing works",
  steps: [
    { n: "1", title: "Add the quote", desc: "Enter customer details or import a CSV of open estimates." },
    { n: "2", title: "Send once", desc: "ClosePing texts your branded estimate message with opt-out language." },
    { n: "3", title: "Chase runs itself", desc: "Automatic SMS at 48 hours, 7 days, and 14 days if they don't reply." },
    { n: "4", title: "Mark won or lost", desc: "When they book, mark won. Pipeline stays honest. Chase stops instantly." },
  ],
};

export const closePingPricing = {
  title: "Simple pricing. One recovered job = paid.",
  monthly: CLOSEPING.monthlyPrice,
  annual: CLOSEPING.annualPrice,
  trial: `${CLOSEPING.trialDays}-day free trial`,
  features: [
    "Unlimited quotes & users",
    "48h / 7d / 14d SMS chase sequence",
    "Pipeline + chase dashboard",
    "CSV import for open estimates",
    "Branded SMS with opt-out compliance",
  ],
  compare: "QuoteFollow charges $299/mo for follow-up only. ClosePing includes quote entry + chase for $149/mo.",
};

export const closePingFaq = [
  {
    q: "Do I need ServiceTitan or Jobber?",
    a: "No. ClosePing works standalone. If you already use a field CRM, keep it — we only handle estimate follow-up.",
  },
  {
    q: "Will customers think it's spam?",
    a: "Messages are polite, branded with your shop name, and include opt-out language. They only send after you explicitly send the initial quote.",
  },
  {
    q: "What trades does this work for?",
    a: "HVAC, roofing, plumbing, painting, remodeling — any trade where you send a quote and wait for the homeowner to decide.",
  },
  {
    q: "How is this different from QuoteFollow?",
    a: "QuoteFollow is follow-up only at $299/mo. ClosePing is self-serve at $149/mo with quote entry, CSV import, and the same chase cadence.",
  },
  {
    q: "Can I stop chase on a specific quote?",
    a: "Yes — mark won or lost anytime. Chase stops immediately.",
  },
] as const;

export const closePingAppCopy = {
  nav: {
    overview: "Overview",
    quotes: "Quotes",
    settings: "Settings",
    signOut: "Sign out",
  },
  overview: {
    title: "Overview",
    pipeline: "Open pipeline",
    chasing: "Active chase",
    wonMonth: "Won this month",
    recovered: "Recovered value",
    cta: "Add quote",
  },
  quotes: {
    title: "Quotes",
    tabOpen: "Open",
    tabChase: "Chase queue",
    new: "+ New quote",
    import: "Import CSV",
    empty: "No open quotes yet. Add your first estimate to start chasing.",
  },
  form: {
    title: "New quote",
    customerName: "Customer name",
    phone: "Mobile phone",
    description: "Job description",
    amount: "Quote amount ($)",
    address: "Address (optional)",
    trade: "Trade (optional)",
    save: "Save draft",
    send: "Send & start chase",
  },
};
