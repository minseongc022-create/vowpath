import { IS_BETA } from "./beta";
import { getCheckoutCta, getSectionLabels, getSiteTagline } from "./marketing-constants";

export const SITE = {
  name: "EFFIROAD",
  tagline: getSiteTagline(),
  url: "https://effiroad.com",
  contactEmail: "support@effiroad.com",
  supportEmail: "support@effiroad.com",
  /** Alias for Pro list price (break-even / marketing copy). */
  monthlyPrice: "$299",
  /**
   * Competitive vs OnCrew ($49/$149/$349 calls), ServiceAgent ($49/$119/$349), Jobber AI ($29).
   * We bill approved emergency dispatches — not raw call minutes.
   * Target ~40% gross margin at included/typical cap (COGS $6/dispatch).
   * Founder (sale) always ≤ list on every priced leg.
   */
  /** Flex — mid shops; founder 10 dispatches ≈ $149 (OnCrew Pro band). */
  flexBasePrice: "$69",
  flexPerBooking: "$12",
  betaFlexBasePrice: "$49",
  betaFlexPerBooking: "$10",
  /** Lite — quiet months; undercuts OnCrew Starter on base, usage-priced. */
  liteBasePrice: "$39",
  litePerBooking: "$18",
  betaLiteBasePrice: "$35",
  betaLitePerBooking: "$13",
  /** Pro — 25 included · list ~40%+ at cap; founder hits ~40% at 25. */
  proPrice: "$299",
  proIncludedDispatches: 25,
  /** Overage $15/dispatch (60% margin) — cheaper than prior $22, still healthy. */
  proOverageMultiplier: 2.5,
  /** Scale — storm / multi-crew · ~40 included at ~40% list margin. */
  scalePrice: "$399",
  scaleIncludedDispatches: 40,
  /** Overage $12/dispatch (50% margin). */
  scaleOverageMultiplier: 2,
  betaScaleOverageMultiplier: 2,
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
  /** Founder Pro — $50 under list · ~40% margin at 25 included (COGS $150). */
  betaIntroPrice: "$249",
  /** Founder Scale — matches OnCrew Multi / SA Franchise band · 40 included. */
  betaScalePrice: "$349",
  betaLockedPrice: "$299",
  betaDiscountYears: 5,
} as const;

export type PlanId = "lite" | "flex" | "pro" | "scale";

/** Default checkout / trial-end plan — Flex fits most independent shops. */
export const DEFAULT_PLAN: PlanId = "flex";

/** Query value that lets logged-in users open the public landing without bouncing to /dashboard. */
export const MARKETING_SITE_VIEW = "site";

export const ROUTES = {
  home: "/",
  /** Logged-in preview of the marketing site (skips auth → dashboard redirect). */
  site: `/?view=${MARKETING_SITE_VIEW}`,
  /** Dedicated pricing page — reachable while logged in (unlike `/#pricing`). */
  pricing: "/pricing",
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
