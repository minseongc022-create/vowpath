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
  title: "Your number or ours — either way, no missed call",
  subtitle:
    "Pick whichever fits how you already run. The safety net is the same: if a call slips past a human, the AI catches it.",
  footer:
    "Miss a call and the AI backs you up automatically. No answer, busy line, after hours, or three phones ringing at once — the caller still gets answered, their details captured, and the lead lands on your dashboard. Nothing falls through.",
  options: [
    {
      id: "keep",
      badge: "Option A",
      title: "Keep your own number",
      description:
        "Customers dial the same company number that's on your trucks and Google listing. When you're busy or nobody answers in ~20 seconds, the call forwards to Effiroad — you still pick up every live call yourself.",
      points: [
        "Nothing changes for your customers",
        "One-tap carrier setup, or use your VoIP / Google Voice",
        "Only missed rings come to us",
      ],
    },
    {
      id: "ours",
      badge: "Option B",
      title: "Use the number we give you",
      description:
        "Publish the dedicated Effiroad number instead — no carrier codes at all. During your answer hours the AI picks up; outside them the call rings your own phone so you can take it live. Set no hours and the AI simply covers you 24/7.",
      points: [
        "Zero forwarding setup — just use our number",
        "Business hours ring straight to you",
        "Turn it on with one click",
      ],
    },
  ],
} as const;
