import { IS_BETA } from "./beta";
import { getCheckoutCta, getSectionLabels, getSiteTagline } from "./marketing-constants";

export const SITE = {
  name: "EFFIROAD",
  tagline: getSiteTagline(),
  url: "https://effiroad.com",
  contactEmail: "support@effiroad.com",
  supportEmail: "support@effiroad.com",
  monthlyPrice: "$169",
  flexBasePrice: "$49",
  flexPerBooking: "$11",
  /** Founder feedback cohort — locked for 5 years after trial. */
  betaFlexBasePrice: "$40",
  betaFlexPerBooking: "$9",
  /** Trial-feedback cohort: $129/mo for 5 years, then regular $169/mo. */
  betaIntroPrice: "$129",
  betaLockedPrice: "$169",
  betaDiscountYears: 5,
} as const;

export type PlanId = "unlimited" | "flex";

/** Default checkout / trial-end plan — Flex fits most independent shops. */
export const DEFAULT_PLAN: PlanId = "flex";

export const ROUTES = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  signup: "/signup",
  getStarted: "/get-started",
  onboarding: "/onboarding",
  settings: "/dashboard/settings",
  dashboard: "/dashboard",
  briefing: "/dashboard/briefing",
  ai: "/dashboard/ai",
  calendar: "/dashboard/calendar",
  missedCallsAnalytics: "/dashboard/missed-calls",
  agreements: "/dashboard/agreements",
  privacy: "/privacy",
  terms: "/terms",
  refund: "/refund",
} as const;

export const FOOTER_LINKS = [
  { label: "Privacy", href: ROUTES.privacy },
  { label: "Terms", href: ROUTES.terms },
  { label: "Contact", href: `mailto:${SITE.contactEmail}` },
] as const;

export const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Get started", href: ROUTES.getStarted },
] as const;

export const SECTION_LABELS = getSectionLabels();

export const CHECKOUT_CTA = getCheckoutCta();
export const BETA_SIGNUP_CTA = IS_BETA ? "Start free" : "Get started";
