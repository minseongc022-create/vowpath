import { IS_BETA } from "./beta";
import { getCheckoutCta, getSectionLabels, getSiteTagline } from "./marketing-constants";

export const SITE = {
  name: "EFFIROAD",
  tagline: getSiteTagline(),
  url: "https://effiroad.com",
  contactEmail: "support@effiroad.com",
  supportEmail: "support@effiroad.com",
  /** Alias for Pro list price (break-even / marketing copy). */
  monthlyPrice: "$149",
  /**
   * Pricing ladder (designed so upgrades feel obvious):
   * Lite 0–2/mo · Flex ~3–11/mo · Pro ~12–32/mo · Scale 33+/mo
   * Premium AI on every plan — differentiation is volume & billing model.
   */
  flexBasePrice: "$55",
  flexPerBooking: "$8",
  /** Founder feedback cohort — locked for 5 years after trial. */
  betaFlexBasePrice: "$49",
  betaFlexPerBooking: "$7",
  liteBasePrice: "$29",
  litePerBooking: "$18",
  betaLiteBasePrice: "$25",
  betaLitePerBooking: "$15",
  /** Pro (flat) — included dispatches + transparent overage. */
  proPrice: "$149",
  proIncludedDispatches: 20,
  proOverageMultiplier: 2,
  /** Scale — high-volume flat plan (storm / busy shops). */
  scalePrice: "$299",
  scaleIncludedDispatches: 50,
  scaleOverageMultiplier: 1.5,
  betaScaleOverageMultiplier: 1.2,
  /**
   * COGS estimates per confirmed dispatch (Twilio + voice + SMS + AI).
   * Economy = legacy alias for COGS math. Premium = gpt-4o-class (all live plans).
   * `marginalDispatchCostUsd` stays as the premium alias for overage math defaults.
   */
  economyMarginalDispatchCostUsd: 3.5,
  premiumMarginalDispatchCostUsd: 6,
  marginalDispatchCostUsd: 6,
  economyAiModel: "gpt-4o-mini",
  premiumAiModel: "gpt-4o",
  /** Trial-feedback cohort: Pro $119/mo for 5 years, then regular Pro. */
  betaIntroPrice: "$119",
  betaScalePrice: "$279",
  betaLockedPrice: "$149",
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
