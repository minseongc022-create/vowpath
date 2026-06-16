import { SITE } from "./constants";
import { getCheckoutCta } from "./marketing-constants";

const CHECKOUT_CTA = getCheckoutCta();

export const heroEn = {
  badge: "AI Revenue Ops · Residential HVAC",
  headline: "Missed calls don't",
  headlineAccent: "turn into revenue alone",
  brandLine: "Your AI ops partner for after-hours intake, booking control, and revenue follow-up.",
  subhead:
    "Vowpath answers when you can't and shows customers up to five open visit windows. They pick one — Auto Book confirms instantly; Hybrid auto-books only the priorities you choose; Manual sends every pick to your phone for 1 / 2 approval.",
  primaryCta: CHECKOUT_CTA,
  secondaryCta: "See how it works",
  secondaryCtaHref: "/#scheduling",
  heroBadges: [
    "5 open slots shown",
    "Auto · Hybrid · Manual",
    "AI chat controls",
    "No new phone number",
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
      title: "Customer Picks a Time",
      description:
        "Up to five open visit windows from your real calendar — on the call or via SMS link. They tap the slot they want.",
    },
    {
      id: "approve",
      title: "Confirm or Approve by Text",
      description:
        "Auto Book: the pick confirms on your calendar right away. Hybrid: checked P1/P2/P3 auto-confirm; unchecked priorities text you the pick + job details — reply 1 or 2. Manual: every pick waits for your 1 or 2.",
    },
    {
      id: "scheduled",
      title: "Job Scheduled",
      description:
        "Confirmed visits land on your dashboard and calendar — and Jobber, if connected. Pending picks stay held until you approve.",
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
    "Answering services take messages. Vowpath runs intake, P1/P2/P3 booking rules, SMS approval, and dispatch sync — the full path from missed call to scheduled job.",
    "Keep your shop number. Set Speed, Hybrid, or Control. Approve from the truck by text. Optional Jobber sync when you're ready. No portal login on a ladder.",
  ],
  pillars: [
    {
      label: "Capture",
      meaning: "Every forwarded call becomes structured job data — contact, address, issue, and priority.",
    },
    {
      label: "Control",
      meaning: "Auto-book everything, auto-book selected priorities, or require manual sign-off. You set the rules; Vowpath executes them.",
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
      description: "Auto Book, Hybrid priority rules, or Manual Approval. Most shops start on Hybrid.",
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
  title: "Three booking modes, one AI intake",
  subtitle:
    "Every mode shows the same five slots. What happens after the customer picks depends on Auto Book, Hybrid P1/P2/P3 rules, or Manual Approval.",
  modes: [
    {
      id: "speed",
      name: "Auto Book",
      badge: null as string | null,
      tagline: "Pick a slot → confirmed instantly",
      description:
        "Customer sees up to five open windows, picks one, and Vowpath confirms it on your calendar — no text approval needed.",
      details: [
        { label: "After customer picks", value: "Instant confirm" },
        { label: "Owner approval", value: "Skipped" },
        { label: "Owner", value: "FYI + undo" },
      ],
      bestFor: "Peak season, tune-ups, high call volume",
    },
    {
      id: "hybrid",
      name: "Hybrid",
      badge: "Recommended default",
      tagline: "Checked priorities auto-book; the rest need your OK",
      description:
        "Customer still picks from five open slots. Checked P1/P2/P3 priorities confirm instantly. Unchecked priorities text you the picked time and job details — reply 1 to approve or 2 to decline.",
      details: [
        { label: "Checked P1 / P2 / P3", value: "Pick → auto confirm" },
        { label: "Unchecked", value: "Pick → SMS 1 / 2" },
        { label: "All three checked", value: "Same as Auto Book" },
      ],
      bestFor: "Shops that want speed on routine jobs and control on the rest",
    },
    {
      id: "control",
      name: "Manual Approval",
      badge: null as string | null,
      tagline: "Every pick waits for your OK",
      description:
        "Customer picks from five open slots, but nothing confirms until you approve. You get a text with the picked time, customer, and issue — reply 1 or 2.",
      details: [
        { label: "After customer picks", value: "SMS 1 / 2 required" },
        { label: "Alert includes", value: "Picked time + job details" },
        { label: "Also review", value: "Dashboard" },
      ],
      bestFor: "New setup, tight dispatch, or extra-cautious shops",
    },
  ],
  footnote:
    "Same five-slot picker in every mode. Auto Book confirms every pick. Hybrid splits by priority. Manual approves every pick by text.",
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
      feature: "SMS 1 / 2 approval",
      result: "Confirms before the homeowner calls the next shop",
      money: "Minutes, not hours",
    },
    {
      leak: "Customers bouncing to the next shop",
      feature: "5-slot calendar picker",
      result: "Same picker everywhere; Auto Book confirms instantly, Hybrid/Manual text you the pick for 1 / 2",
      money: "Same instant-book UX homeowners expect",
    },
    {
      leak: "Routine jobs waiting on you",
      feature: "Hybrid P1/P2/P3 auto-book rules",
      result: "Auto-books the priorities you trust and holds the rest",
      money: "More low-risk jobs captured",
    },
    {
      leak: "Not knowing what is pending",
      feature: "Vowpath AI chat",
      result: "Ask what came in, what is urgent, and what needs approval",
      money: "Fewer forgotten approvals",
    },
  ] as const,
};

export const differentiatorsEn = {
  title: "What turns the AI into revenue ops",
  subtitle: "The point is not taking messages. The point is protecting the path from first ring to confirmed job.",
  items: [
    {
      title: "5-slot calendar booking",
      description:
        "Up to five open windows on every call or SMS link. Customer picks one — Auto Book confirms instantly; Hybrid auto-books checked P1/P2/P3 only; Manual texts you the pick for 1 / 2.",
    },
    {
      title: "AI HVAC intake",
      description:
        "P1 no-heat / no-cool vs P3 tune-up. Urgency, address, and visit window captured before you see the alert.",
    },
    {
      title: "SMS approval loop",
      description:
        "When Hybrid or Manual needs your OK, the text includes the customer's picked time, contact, and issue. Reply 1 or 2 with a ref code — no app on a ladder.",
    },
    {
      title: "Three booking modes",
      description:
        "Auto Book, Hybrid P1/P2/P3 auto-book, or Manual Approval. You decide how much control the AI has.",
    },
    {
      title: "AI chat for the owner",
      description:
        "Ask what came in last night, show urgent requests, change booking mode, or create an automation rule in plain English.",
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
    ["5 slots shown → customer picks", "Yes — all modes", "Common in field-service tools"],
    ["After the pick: auto vs SMS 1/2", "Auto / Hybrid / Manual", "Often one setting only"],
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
      title: "5-slot picker + mode rules",
      description:
        "Show up to five open windows. Auto Book: pick confirms instantly. Hybrid: checked P1/P2/P3 auto-confirm; unchecked send you the pick by SMS. Manual: every pick needs your 1 / 2.",
      tag: "Core",
    },
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
  footnote: "The promise is specific: fewer missed calls, faster approvals, and more routine jobs confirmed without waiting on you.",
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
      description: "Start Hybrid. Switch when you're ready.",
      time: "1 min",
    },
  ],
};

export const pricingEn = {
  title: "Simple pricing",
  subtitle:
    "Unlimited for busy shops. Flex when nights are quieter. Full booking OS included.",
  compare: [
    { label: "Auto Book · Hybrid · Manual", amount: "Included" },
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
      q: "What's Auto Book vs Hybrid vs Manual?",
      a: "All three modes show up to five open slots and let the customer pick one. Auto Book confirms that pick instantly on your calendar. Hybrid auto-confirms only the P1/P2/P3 priorities you check — unchecked priorities text you the picked time and job details for 1 / 2 approval. Manual texts you every pick for 1 / 2 before anything confirms.",
    },
    {
      q: "How does SMS approval work?",
      a: "You get a booking request by text with customer, issue, and the time they picked. Reply 1 to approve or 2 to decline. Every message has a ref code. No app required.",
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
      a: "AI intake captures the request and shows five open slots. Auto Book confirms every pick instantly. Hybrid auto-confirms only checked P1/P2/P3 — unchecked priorities text you the pick for 1 / 2. Manual texts you every pick for 1 / 2.",
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
