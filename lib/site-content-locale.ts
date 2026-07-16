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
  title: "Connect your line — forwarding first, dedicated as backup",
  subtitle:
    "Most shops keep their Google number with overflow or VoIP routing. If your carrier blocks forwarding, switch to your Effiroad dedicated number — same AI voice and intake.",
  footer:
    "Every path includes a built-in test call. Dedicated number is not a downgrade — same natural voice, polite intake, and dispatch. Use it when forwarding won't stick.",
  options: [
    {
      id: "keep",
      badge: "Start here",
      title: "Keep your number (overflow / VoIP)",
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
      badge: "If forwarding fails",
      title: "Effiroad dedicated number (same quality)",
      description:
        "When overflow won't work on your plan, publish your Effiroad number on Google, website, and trucks. Same natural AI voice, same polite intake — customers call Effiroad directly.",
      points: [
        "Same call experience as forwarding — not a lesser option",
        "Zero carrier codes — works on every plan",
        "Copy number → update Google → test call",
      ],
    },
  ],
} as const;
