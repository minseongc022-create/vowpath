import { IS_BETA } from "./beta";
import { getCheckoutCta, getSectionLabels, getSiteTagline } from "./marketing-constants";

export const SITE = {
  name: "EFFIROAD",
  tagline: getSiteTagline(),
  url: "https://effiroad.com",
  contactEmail: "support@effiroad.com",
  supportEmail: "support@effiroad.com",
  monthlyPrice: "$169", // alias for Pro list price
  flexBasePrice: "$75",
  flexPerBooking: "$11",
  /** Founder feedback cohort — locked for 5 years after trial. */
  betaFlexBasePrice: "$69",
  betaFlexPerBooking: "$9",
  liteBasePrice: "$42",
  litePerBooking: "$30",
  betaLiteBasePrice: "$39",
  betaLitePerBooking: "$25",
  /** Pro (flat) — $169/mo with included dispatches, transparent overage beyond. */
  proPrice: "$169",
  proIncludedDispatches: 20,
  proOverageMultiplier: 2,
  /** Scale — high-volume flat plan. */
  scalePrice: "$369",
  scaleIncludedDispatches: 50,
  scaleOverageMultiplier: 1.5,
  betaScaleOverageMultiplier: 1.2,
  /** Internal COGS estimate per confirmed dispatch (Twilio + Retell + SMS + AI). */
  marginalDispatchCostUsd: 6,
  /** Trial-feedback cohort: Pro $129/mo for 5 years, then regular $169/mo. */
  betaIntroPrice: "$129",
  betaScalePrice: "$349",
  betaLockedPrice: "$169",
  betaDiscountYears: 5,
} as const;

export type PlanId = "lite" | "flex" | "pro" | "scale";

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
