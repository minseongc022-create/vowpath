import { ROUTES, SITE } from "./constants";

export const quoteChaseSeoMeta = {
  title: `Quote + Chase — On-site estimates & auto follow-up | ${SITE.name}`,
  description:
    "Leave the truck with a quote, not a promise. Build itemized estimates on-site, text customers a link, and auto-chase until they book — inside Effiroad.",
  keywords: [
    "HVAC estimate follow up",
    "field quote software",
    "restoration estimate",
    "on-site quote builder",
    "estimate chase SMS",
    "ServiceTitan alternative quote",
  ],
  ogTitle: "Stop losing estimates in your notes app",
  ogDescription:
    "Effiroad Quote + Chase: on-site line-item estimates, customer share links, and 48h / 7d / 14d auto follow-up.",
};

export const quoteChaseHeroEn = {
  eyebrow: "Quote + Chase",
  title: "Leave with a quote.\nWe chase until they book.",
  subtitle:
    "The #1 complaint in HVAC Facebook threads — even with ServiceTitan — is finishing quotes on-site and following up later. Effiroad fixes both inside the same app you already use for phone → dispatch.",
  bullets: [
    "Itemized estimates from the truck (labor, materials, photos)",
    "Text customers a branded share link — they approve on their phone",
    "Auto chase at 48 hours, 7 days, and 14 days (SMS consent)",
    "Same dashboard as Answer + dispatch — one login, one bill",
  ],
  cta: "Start free trial",
  secondaryCta: "See how it works",
  secondaryHref: "#how-quote-chase-works",
};

export const quoteChaseProblemEn = {
  id: "quote-problem",
  label: "Sound familiar?",
  title: "You’re not bad at sales — you’re bad at having time",
  items: [
    {
      title: "“I’ll email the estimate tonight”",
      body: "Night never comes. The homeowner calls three other shops while you’re still on the ladder.",
    },
    {
      title: "ServiceTitan open, quote still not done",
      body: "The CRM is powerful — but if the quote dies in draft because you ran to the next call, it doesn’t matter.",
    },
    {
      title: "Follow-up guilt pile",
      body: "Forty open estimates in Notes. You mean to text Friday. Friday becomes never.",
    },
  ],
};

export const quoteChaseModulesEn = {
  id: "quote-modules",
  label: "Three modules, one platform",
  title: "Answer · Quote · Chase",
  subtitle: "Phone intake you already trust — plus the two gaps that kill close rate after the truck leaves.",
  modules: [
    {
      id: "answer",
      badge: "Included",
      title: "Answer",
      description: "24/7 AI phone + link intake. Press 2 captures free estimate leads into your dashboard.",
      points: ["Calm US voice tuned for phone clarity", "Estimate vs emergency triage", "Same number on Google"],
    },
    {
      id: "quote",
      badge: "New",
      title: "Quote",
      description:
        "Mobile-friendly line-item builder on every request. Presets for HVAC + restoration. Share link with tax, scope, exclusions.",
      points: ["Build on-site in 2–3 minutes", "Customer views / accepts on phone", "Photos + insurance fields"],
    },
    {
      id: "chase",
      badge: "Auto",
      title: "Chase",
      description:
        "After you text the quote, Effiroad nudges the customer at 48h, 7d, and 14d — polite, branded, opt-out compliant.",
      points: ["Dedicated Chase queue in dashboard", "See which nudge is due", "Stops when they book"],
    },
  ],
};

export const quoteChaseHowEn = {
  id: "how-quote-chase-works",
  title: "How Quote + Chase works",
  steps: [
    {
      number: "1",
      title: "Lead lands in Effiroad",
      description: "Press-2 estimate call, link intake, or your own request — it shows in Quotes.",
    },
    {
      number: "2",
      title: "Build on-site",
      description: "Add line items from presets, snap photos, set validity — ready before you leave the driveway.",
    },
    {
      number: "3",
      title: "Text the share link",
      description: "Customer gets a clean mobile page with your shop name, total, and approve / questions CTA.",
    },
    {
      number: "4",
      title: "Chase runs itself",
      description: "If they don’t book, auto SMS at 48h, 7d, 14d. You see status in the Chase tab.",
    },
  ],
};

export const quoteChaseFaqEn = [
  {
    q: "Is this a separate product?",
    a: "No — Quote + Chase lives inside Effiroad on the same plan as phone answering and dispatch. One login, one bill.",
  },
  {
    q: "Do I need ServiceTitan or Jobber?",
    a: "No. Quote works standalone. Optional Jobber sync stays available if you already use it.",
  },
  {
    q: "What about Xactimate?",
    a: "This is a fast field quote for close rate — not a full carrier estimate. Export / copy line items when you need Xactimate later.",
  },
  {
    q: "Will customers think it’s spam?",
    a: "Chase texts are polite, branded, and include opt-out language. They only send when you’ve texted a quote and the customer consented to SMS.",
  },
  {
    q: "Does the AI voice sound better now?",
    a: "Yes — we tuned Retell for deeper, clearer US male voice on phone lines (noise cancellation, slower enunciation, higher volume). Demo videos use the same tone.",
  },
] as const;

export const quoteChaseCtaEn = {
  title: "One saved estimate pays for months of Effiroad",
  subtitle: `From ${SITE.flexBasePrice}/mo Flex — quote, chase, and phone answering together.`,
  cta: "Start free trial",
  href: ROUTES.signup,
};
