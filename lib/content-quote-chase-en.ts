import { ROUTES, SITE } from "./constants";

export const quoteChaseSeoMeta = {
  title: `On-site quotes & estimate follow-up (included) | ${SITE.name}`,
  description:
    "Effiroad’s main job is answering the phone. On-site estimates and 48h / 7d / 14d follow-up SMS are included with your plan — not a separate product.",
  keywords: [
    "HVAC estimate follow up",
    "field quote software",
    "restoration estimate",
    "on-site quote builder",
    "estimate chase SMS",
  ],
  ogTitle: "Quotes & follow-up — included with Effiroad",
  ogDescription:
    "Phone answering first. On-site line-item estimates and polite SMS nudges ship with every plan.",
};

export const quoteChaseHeroEn = {
  eyebrow: "Included with every plan",
  title: "Quotes & follow-up.\nPhone answering stays first.",
  subtitle:
    "Effiroad exists to catch the call and dispatch the truck. When you leave a site with an open estimate, built-in quotes and optional SMS nudges help you close — without buying another tool or treating chase as the product.",
  bullets: [
    "Itemized estimates from the truck (labor, materials, photos)",
    "Text customers a branded share link",
    "Optional chase at 48 hours, 7 days, and 14 days (SMS consent)",
    "Same login as AI phone + dispatch — included, not upsold as equal",
  ],
  cta: "Start free trial",
  secondaryCta: "Back to how phone works",
  secondaryHref: "/#call-experience",
};

export const quoteChaseProblemEn = {
  id: "quote-problem",
  label: "When you need it",
  title: "After the phone wins the lead, follow-up still slips",
  items: [
    {
      title: "“I’ll email the estimate tonight”",
      body: "Night never comes. The homeowner calls three other shops while you’re still on the ladder.",
    },
    {
      title: "CRM open, quote still not done",
      body: "Powerful field software doesn’t help if the draft dies because you ran to the next emergency call.",
    },
    {
      title: "Follow-up guilt pile",
      body: "Open estimates in Notes. You mean to text Friday. Friday becomes never — while missed calls stay the bigger leak.",
    },
  ],
};

export const quoteChaseModulesEn = {
  id: "quote-modules",
  label: "How it fits",
  title: "Main: Answer. Included: Quote & follow-up.",
  subtitle:
    "Phone intake and dispatch are the product. Estimates and nudges are utilities on the same plan.",
  modules: [
    {
      id: "answer",
      badge: "Main",
      title: "Answer",
      description: "24/7 AI phone + link intake. Press 2 captures free estimate leads into your dashboard.",
      points: ["Calm US voice tuned for phone clarity", "Estimate vs emergency triage", "Same number on Google"],
    },
    {
      id: "quote",
      badge: "Included",
      title: "Quote",
      description:
        "Mobile-friendly line-item builder when you need it. Presets for HVAC + restoration. Share link with tax and scope.",
      points: ["Build on-site in a few minutes", "Customer views on phone", "Photos + insurance fields"],
    },
    {
      id: "chase",
      badge: "Included",
      title: "Follow-up",
      description:
        "After you text the quote, optional nudges at 48h, 7d, and 14d — polite, branded, opt-out compliant.",
      points: ["Follow-up queue in dashboard", "See which nudge is due", "Stops when they book"],
    },
  ],
};

export const quoteChaseHowEn = {
  id: "how-quote-chase-works",
  title: "How included quotes work",
  steps: [
    {
      number: "1",
      title: "Lead lands from the phone",
      description: "Press-2 estimate call, link intake, or your own request — it shows in Quotes.",
    },
    {
      number: "2",
      title: "Build on-site if needed",
      description: "Add line items from presets, snap photos, set validity — before you leave the driveway.",
    },
    {
      number: "3",
      title: "Text the share link",
      description: "Customer gets a clean mobile page with your shop name, total, and approve / questions CTA.",
    },
    {
      number: "4",
      title: "Optional follow-up runs",
      description: "If they don’t book, SMS at 48h, 7d, 14d. Status shows in the Quotes follow-up tab.",
    },
  ],
};

export const quoteChaseFaqEn = [
  {
    q: "Is this a separate product or add-on?",
    a: "No. Quotes and estimate follow-up are included with Effiroad. The product you buy is AI phone answering and dispatch — these are built-in utilities.",
  },
  {
    q: "Do I need ServiceTitan or Jobber?",
    a: "No. Quotes work standalone. Optional Jobber sync stays available if you already use it.",
  },
  {
    q: "What about Xactimate?",
    a: "This is a fast field quote for close rate — not a full carrier estimate. Export / copy line items when you need Xactimate later.",
  },
  {
    q: "Will customers think follow-up is spam?",
    a: "Nudges are polite, branded, and include opt-out language. They only send when you’ve texted a quote and the customer consented to SMS.",
  },
  {
    q: "Does this replace answering the phone?",
    a: "Never. Missed-call recovery is still the main reason to use Effiroad. Quotes only help after you already have the lead.",
  },
] as const;

export const quoteChaseCtaEn = {
  title: "Start with the phone — quotes come with it",
  subtitle: `From ${SITE.flexBasePrice}/mo Flex — AI answering, dispatch, and included estimate tools.`,
  cta: "Start free trial",
  href: ROUTES.signup,
};
