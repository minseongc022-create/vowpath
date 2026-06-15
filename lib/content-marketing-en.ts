import { SITE } from "./constants";
import { getCheckoutCta } from "./marketing-constants";

const CHECKOUT_CTA = getCheckoutCta();

export const heroEn = {
  badge: "AI Booking Operating System · Residential HVAC",
  headline: "Missed calls don't",
  headlineAccent: "book themselves",
  brandLine: "Turn missed HVAC calls into booked jobs automatically.",
  subhead:
    "When you can't answer, Vowpath does. " +
    "We collect the job, verify customer details, and send you a booking request by text.",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "See how it works",
  secondaryCtaHref: "/#missed-call-flow",
  heroBadges: [
    "No new phone number",
    "SMS approval",
    "Jobber sync",
    "Set up in 10 minutes",
  ] as const,
};

export const missedCallFlowEn = {
  id: "missed-call-flow",
  title: "What happens when you miss a call?",
  subtitle:
    "From ring to booked job — Vowpath runs the full intake and booking workflow while you stay on the truck.",
  steps: [
    {
      id: "call",
      title: "Customer Calls",
      description: "Your shop line rings. You're on a job, after hours, or in peak season.",
    },
    {
      id: "ai",
      title: "AI Answers",
      description: "Vowpath picks up the forwarded call with HVAC-specific intake — not a generic script.",
    },
    {
      id: "intake",
      title: "Customer Completes Intake",
      description: "Name, address, issue, and priority captured. Visit window selected when applicable.",
    },
    {
      id: "approve",
      title: "You Approve by Text",
      description: "A booking request hits your phone. Reply 1 to approve or 2 to decline — no app required.",
    },
    {
      id: "scheduled",
      title: "Job Scheduled",
      description: "Customer gets confirmation. Job lands on your dashboard — and Jobber, if connected.",
    },
  ],
};

export const approvalLoopEn = {
  id: "approval-loop",
  label: "Approval loop",
  title: "Approve from anywhere",
  summary:
    "Reply 1 to approve. Reply 2 to decline. No app required. Every request includes a ref code so you never mix up jobs.",
  tags: ["SMS approval", "Reply 1 · 2", "Email backup", "Customer auto-update"] as const,
  smsExample: {
    customer: "John Smith",
    issue: "No Cooling",
    window: "Tomorrow 2PM",
    approveLabel: "1 = Approve",
    declineLabel: "2 = Decline",
  },
  nodes: [
    { id: "customer", title: "Customer request", caption: "Phone or link" },
    { id: "vowpath", title: "Vowpath", caption: "Intake · booking request" },
    { id: "owner", title: "Your approval", caption: "Reply 1 or 2" },
    { id: "customer-out", title: "Job scheduled", caption: "Confirmation sent" },
  ] as const,
  edges: [
    "Details verified for you",
    "Booking request by SMS",
    "Your reply → job confirmed",
  ] as const,
};

export const aboutEn = {
  id: "about",
  badge: "Why Vowpath",
  title: "An operating system — not an answering service",
  subtitle: "Vowpath tracks every call, request, approval, and booking in one place.",
  paragraphs: [
    "Answering services take messages. Vowpath runs intake, risk-based booking rules, SMS approval, and dispatch sync — the full path from missed call to scheduled job.",
    "Keep your shop number. Set Speed, Hybrid, or Control. Approve from the truck by text. Optional Jobber sync when you're ready. No portal login on a ladder.",
  ],
  pillars: [
    {
      label: "Capture",
      meaning: "Every forwarded call becomes structured job data — contact, address, issue, and priority.",
    },
    {
      label: "Control",
      meaning: "Auto-book, risk-based approval, or manual sign-off. You set the rules; Vowpath executes them.",
    },
  ],
};

export const problemEn = {
  title: "Every unanswered ring is revenue walking",
  subtitle:
    "No-heat and no-cool callers won't wait. They hit the next name on Google. Vowpath turns those calls into booking requests — automatically.",
  stats: [
    { value: "27%+", label: "of shop calls go unanswered" },
    { value: "$400+", label: "typical residential ticket" },
    { value: "80%", label: "of voicemail callers never leave a message" },
  ],
  callout: "One saved emergency call usually pays for the month.",
};

export const howItWorksEn = {
  title: "Go live in ~10 minutes",
  subtitle: "No sales call. Same shop number. Pick a plan, forward calls, choose a booking mode.",
  steps: [
    {
      step: "01",
      title: "Choose a plan",
      description: "Unlimited or Flex. Stripe checkout — you're in the dashboard in minutes.",
    },
    {
      step: "02",
      title: "Forward your main line",
      description: "Customers still dial your shop. Unanswered calls route to Vowpath.",
    },
    {
      step: "03",
      title: "Pick a booking mode",
      description: "Auto Book, Risk Based Approval, or Manual Approval. Most shops start on Hybrid.",
    },
    {
      step: "04",
      title: "Test one call",
      description: "Run a quick test. Approve by text. See the job on your dashboard — or in Jobber.",
    },
  ],
};

export const schedulingModesEn = {
  id: "scheduling",
  label: "Booking modes",
  title: "Three ways to confirm jobs",
  subtitle:
    "Set how aggressively Vowpath books on your behalf. Switch modes anytime — no script rewrite, no new number.",
  modes: [
    {
      id: "speed",
      name: "Auto Book",
      badge: null as string | null,
      tagline: "Instant confirmation",
      description: "Customer selects a time. Booking is created instantly. No approval required.",
      details: null as { label: string; value: string }[] | null,
      bestFor: "Peak season, tune-ups, high call volume",
    },
    {
      id: "hybrid",
      name: "Risk Based Approval",
      badge: "Recommended default",
      tagline: "Smart automation with guardrails",
      description: null as string | null,
      details: [
        { label: "Low risk jobs", value: "Auto book" },
        { label: "Medium risk jobs", value: "Auto book" },
        { label: "High risk jobs", value: "Approval required" },
      ],
      bestFor: "Owner-operators who want speed without losing control",
    },
    {
      id: "control",
      name: "Manual Approval",
      badge: null as string | null,
      tagline: "You sign off on every job",
      description: "Every booking requires approval.",
      details: [
        { label: "Approve via", value: "SMS" },
        { label: "", value: "Email" },
        { label: "", value: "Dashboard" },
      ],
      bestFor: "New setup, tight dispatch, or extra-cautious shops",
    },
  ],
  footnote: "Most shops start on Risk Based Approval. Change modes in one click.",
};

export const differentiatorsEn = {
  title: "What an AI booking OS gives you",
  subtitle: "Message-taking is table stakes. Full intake-to-booking workflow is the point.",
  items: [
    {
      title: "AI HVAC intake",
      description:
        "P1 no-heat / no-cool vs P3 tune-up. Urgency, address, and visit window captured before you see the alert.",
    },
    {
      title: "SMS approval loop",
      description:
        "Reply 1 or 2 from anywhere. Ref code on every alert. No app on a ladder.",
    },
    {
      title: "Three booking modes",
      description:
        "Auto Book, Risk Based Approval, or Manual Approval. You run the shop — we don't lock you into one flow.",
    },
    {
      title: "Your main number — period",
      description: "No new line on Google. Conditional forward when you can't answer.",
    },
    {
      title: "Jobber — optional, one-time connect",
      description:
        "Not required. Connect once and confirmed jobs flow to requests and calendar automatically.",
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
  title: "Vowpath vs. answering services",
  subtitle: "They take messages. Vowpath is an AI booking operating system built for HVAC shops.",
  headers: ["", "Vowpath", "Generic answering"],
  rows: [
    ["AI intake → booked job", "Yes", "Message only"],
    ["Auto Book · Risk Based · Manual modes", "Yes — switch anytime", "Not offered"],
    ["SMS approval (1 / 2)", "Yes", "Email or portal"],
    ["Keep your shop number", "Yes", "Often a new number"],
    ["HVAC priority (P1 / P2 / P3)", "Yes", "One-size script"],
    ["Jobber requests + calendar sync", "Optional — connect if you use it", "Rare"],
    ["Go live", "~10 minutes", "Days + scripting call"],
  ],
};

export const featuresEn = {
  title: "Everything in the operating system",
  subtitle: "One truck to five trucks. No bloat.",
  items: [
    {
      title: "After-hours capture",
      description: "AI intake runs nights and weekends. Jobs confirm per your booking mode.",
      tag: "Core",
    },
    {
      title: "SMS approval loop",
      description:
        "Booking requests by text. Reply 1 or 2 with a ref code — no app on a ladder.",
      tag: "Core",
    },
    {
      title: "Missed-call analytics",
      description: "See what would've hit voicemail — and what Vowpath turned into bookings.",
      tag: "Core",
    },
    {
      title: "Customer confirmation texts",
      description: "Homeowners know: received, confirmed, or pending your approval.",
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
  title: "Quick math",
  subtitle: "One extra booked call covers a lot.",
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
  footnote: "One saved P1 call usually covers the subscription.",
};

export const aiDispatcherEn = {
  id: "ai-dispatcher",
  label: "AI dispatcher",
  title: "Your AI HVAC Dispatcher",
  subtitle:
    "More than an answering service. Vowpath tracks every call, every request, every approval, and every booking in one place.",
  cards: [
    {
      title: "Daily Briefing",
      description: "Every morning receive:",
      items: ["Calls", "Bookings", "Approvals", "Pending requests"],
    },
    {
      title: "Smart Calendar",
      description: "View every booking in one place.",
      items: ["Jobber optional"],
    },
    {
      title: "Booking History",
      description: "Track every step from call to approval.",
      items: ["Full audit trail", "Ref codes", "Status timeline"],
    },
    {
      title: "Vowpath AI",
      description: "Ask in plain English:",
      items: [
        '"What happened yesterday?"',
        '"Show urgent requests."',
        '"How many bookings this week?"',
      ],
    },
  ],
};

export const socialProofEn = {
  title: "Built for HVAC owner-operators",
  items: [
    { stat: "AI OS", label: "intake to booked job" },
    { stat: "~10 min", label: "to go live" },
    { stat: "3 modes", label: "booking control" },
    { stat: "0", label: "new public numbers" },
  ],
  badges: [
    "Residential HVAC",
    "US voice + SMS",
    "Jobber-ready",
    "Cancel anytime",
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
      description: "Start Risk Based Approval. Switch when you're ready.",
      time: "1 min",
    },
  ],
};

export const pricingEn = {
  title: "Simple pricing",
  subtitle:
    "Unlimited for busy shops. Flex when nights are quieter. Full booking OS included.",
  compare: [
    { label: "Auto Book · Risk Based · Manual", amount: "Included" },
    { label: "SMS approval loop", amount: "Included" },
    { label: "Jobber sync", amount: "Optional — free to connect" },
    {
      label: "P1 emergency SMS",
      amount: "Included",
      highlight: true,
    },
  ],
  plans: [
    {
      id: "unlimited" as const,
      name: "Unlimited",
      badge: "Most popular",
      description: "Heavy evenings and peak season. Flat rate, no per-job math.",
      price: SITE.monthlyPrice,
      period: "/mo",
      usageLine: "No per-booking fees",
      features: [
        "Unlimited forward windows",
        "All three booking modes",
        "SMS approval · Job Cards",
        "AI dispatcher dashboard",
        "Jobber connect optional",
      ],
      recommended: true,
      cta: `${CHECKOUT_CTA} — Unlimited`,
    },
    {
      id: "flex" as const,
      name: "Flex",
      badge: "Lighter volume",
      description: "Pay per job you approve. Quiet months stay cheap.",
      price: SITE.flexBasePrice,
      period: "/mo",
      usageLine: `+ ${SITE.flexPerBooking} per approved booking`,
      features: [
        "Same intake & booking modes",
        "Custom forward hours",
        "SMS approval when required",
        "Base + per approved booking",
        "Zero approvals → base only",
        "Jobber connect optional",
      ],
      recommended: false,
      cta: `${CHECKOUT_CTA} — Flex`,
    },
  ],
  tip: `Approving 9+ jobs a month? Unlimited (${SITE.monthlyPrice}) usually wins.`,
  footnote:
    "Flex per-booking fees apply only to jobs you approve (spam and cancels excluded).",
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
      q: "Do I need a second phone number?",
      a: "No. Same shop line everywhere. You forward unanswered calls behind the scenes.",
    },
    {
      q: "What's Auto Book vs Risk Based vs Manual?",
      a: "Auto Book confirms instantly when the customer picks a slot. Risk Based auto-books low and medium risk jobs but requires approval on high risk. Manual waits for your approval on every job. Most shops start on Risk Based.",
    },
    {
      q: "How does SMS approval work?",
      a: "You get a booking request by text with customer, issue, and window. Reply 1 to approve or 2 to decline. Every message has a ref code. No app required.",
    },
    {
      q: "Do I need Jobber?",
      a: "No. SMS, email, and the dashboard are enough for most shops. Connect Jobber once and confirmed jobs save as requests with calendar sync.",
    },
    {
      q: "How fast to go live?",
      a: "About 10 minutes: plan, contact, forward rules, quick test call.",
    },
    {
      q: "How is this different from Smith.ai?",
      a: "They take messages. Vowpath is an AI booking OS — HVAC intake, booking modes, SMS approval, and optional Jobber sync on your number.",
    },
    {
      q: "What happens after hours?",
      a: "AI intake captures the request. Whether it auto-confirms depends on your booking mode — high risk usually still needs your OK on Risk Based.",
    },
  ],
};

export const ctaEn = {
  eyebrow: "Stop feeding competitors your missed calls",
  title: "Forward tonight. Book tomorrow.",
  subtitle:
    "Same number. AI intake. SMS approval. Confirmed jobs — on your schedule, not a call center's script.",
  button: CHECKOUT_CTA,
};

export const navEn = {
  product: "Platform",
  about: "Why us",
  scheduling: "Booking modes",
  howItWorks: "How it works",
  pricing: "Pricing",
  getStarted: "Get started",
};

export const footerEn = {
  privacy: "Privacy",
  terms: "Terms",
  contact: "Contact",
  tagline: "AI Booking Operating System for residential HVAC.",
  brandMeaning:
    "Missed call → AI intake → SMS approval → booked job · Jobber optional",
  subline: "US residential HVAC · dashboard, SMS, or connect Jobber",
};
