import {
  approvalLoopEn,
  callExperienceEn,
  ctaEn,
  faqEn,
  footerEn,
  heroEn,
  howItWorksEn,
  navEn,
  pricingEn,
  quickFaqEn,
  socialProofEn,
} from "./content-marketing-en";
import {
  approvalLoopEs,
  ctaEs,
  demoSummaryEs,
  faqEs,
  footerEs,
  heroEs,
  howItWorksEs,
  navEs,
  numberChoiceEs,
  pricingEs,
  socialProofEs,
} from "./content-marketing-es";
import { marketingUiLocale, type UiLocale } from "./locale";

export function getSiteHero(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? heroEs : heroEn;
}

export function getSiteNav(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? navEs : navEn;
}

export function getSiteFooter(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? footerEs : footerEn;
}

export function getSiteFaq(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? faqEs : faqEn;
}

export function getSitePricing(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? pricingEs : pricingEn;
}

export function getSiteCta(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? ctaEs : ctaEn;
}

export function getSiteHowItWorks(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? howItWorksEs : howItWorksEn;
}

export function getSiteApprovalLoop(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? approvalLoopEs : approvalLoopEn;
}

export function getSiteSocialProof(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? socialProofEs : socialProofEn;
}

export function getDemoSummary(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? demoSummaryEs : demoSummaryEn;
}

export function getNumberChoice(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? numberChoiceEs : numberChoiceEn;
}

export function getSiteQuickFaq(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? quickFaqEn : quickFaqEn;
}

export function getSiteCallExperience(locale: UiLocale) {
  return marketingUiLocale(locale) === "es" ? callExperienceEn : callExperienceEn;
}

export const demoSummaryEn = {
  title: "What you just saw — in plain English",
  subtitle: "Built for independent water, fire, mold restoration and HVAC shops — not franchise call centers.",
  steps: [
    {
      title: "Same phone number",
      body: "Keep your Google and truck line. Forward unanswered calls to Effiroad — customers never see a new number.",
    },
    {
      title: "Voice AI or text link",
      body: "Press 1 for service/emergency or press 2 for a free estimate — both go straight to AI on the call. Prefer a form? Say “text link” at the main menu for a one-minute SMS form on link.effiroad.com.",
    },
    {
      title: "Pick-time, then dispatch",
      body: "After phone intake, customers get an SMS to confirm address (typed/map) and pick a visit window. Clear water / no-heat jobs can schedule and notify crew; fire, mold, gas smell, sewage Cat-3, or anything unclear — you approve by text first. Then live ETA map.",
    },
    {
      title: "Live in ~10 minutes",
      body: "Sign up, set on-call hours, forward your line, run one test call. Jobber sync optional.",
    },
  ],
} as const;

export const numberChoiceEn = {
  title: "Your main number — or a dedicated Effiroad line",
  subtitle:
    "Both options get the same cinematic AI voice, intake, and auto dispatch. Keep your Google/shop number with forwarding, or publish your Effiroad dedicated number (recommended when carriers block overflow).",
  footer:
    "Every path includes a built-in test call. Dedicated is not a downgrade — same clarity, polite intake, crew SMS, and live ETA map.",
  options: [
    {
      id: "keep",
      badge: "Popular",
      title: "Keep your main number",
      description:
        "Shop cell: one-tap AT&T, T-Mobile, Verizon, or Xfinity codes. Business phone: Dialpad, RingCentral, or Grasshopper unanswered routing. Your line rings first — Effiroad catches the miss.",
      points: [
        "One-tap dial codes on your shop phone",
        "Dialpad / ServiceTitan Fallback visual guide",
        "Backup paths if the first method fails",
      ],
    },
    {
      id: "ours",
      badge: "Recommended if forwarding fails",
      title: "Effiroad dedicated number",
      description:
        "Publish your Effiroad number on Google, website, and trucks. Same cinematic AI voice, same intake and dispatch — customers call Effiroad directly with zero carrier codes.",
      points: [
        "Same call quality as forwarding — not a lesser option",
        "Works on every plan — no overflow blocks",
        "Copy number → update Google → test call",
      ],
    },
  ],
} as const;
