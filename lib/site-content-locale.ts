import {
  approvalLoopEn,
  ctaEn,
  faqEn,
  footerEn,
  heroEn,
  howItWorksEn,
  navEn,
  pricingEn,
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

export const demoSummaryEn = {
  title: "What you just saw — in plain English",
  subtitle: "Built for independent water, fire, mold restoration and HVAC shops — not franchise call centers.",
  steps: [
    {
      title: "Same phone number",
      body: "Keep your Google and truck line. Forward unanswered calls to Effiroad — customers never see a new number.",
    },
    {
      title: "Voice or text link",
      body: "Callers talk to AI on the phone, or press 2 for a one-minute SMS form. Name, address, and loss type captured either way.",
    },
    {
      title: "You stay in control",
      body: "Clear water / no-heat jobs can notify your crew. Fire, mold, gas smell, or anything unclear — you approve by text first.",
    },
    {
      title: "Live in ~10 minutes",
      body: "Sign up, set on-call hours, forward your line, run one test call. Jobber sync optional.",
    },
  ],
} as const;

export const numberChoiceEn = {
  title: "Four verified ways to connect — pick what fits",
  subtitle:
    "Most shops go live in 10 minutes. Dedicated number is fastest; keep your cell with one-tap overflow; or use Dialpad/Jobber routing.",
  footer:
    "Every path includes a built-in test call. If forwarding fails, switch to the dedicated Effiroad number in one click — no carrier fight required.",
  options: [
    {
      id: "keep",
      badge: "Paths A & B",
      title: "Keep your number (overflow)",
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
      badge: "Path ★ Easiest",
      title: "Effiroad dedicated number (~99% success)",
      description:
        "Skip carrier codes entirely. Publish your Effiroad number on Google, website, and trucks. Answer Hours control when AI picks up vs. when your cell rings.",
      points: [
        "Zero forwarding — works on every plan",
        "Copy number → update Google → test call",
        "Recommended if overflow setup fails",
      ],
    },
  ],
} as const;
