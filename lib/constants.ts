import { IS_BETA } from "./beta";
import { getCheckoutCta, getSectionLabels, getSiteTagline } from "./marketing-constants";

export const SITE = {
  name: "EFFIROAD",
  tagline: getSiteTagline(),
  url: "https://effiroad.com",
  contactEmail: "support@effiroad.com",
  supportEmail: "support@effiroad.com",
  /** Alias for Pro list price (break-even / marketing copy). */
  monthlyPrice: "$249",
  /**
   * Pricing ladder:
   * Lite quiet · Flex mid · Pro/Scale capped flats.
   * Rule: founder (sale) is always cheaper than list on every priced leg,
   * and keeps ~50–60%+ gross margin at typical/cap usage (COGS $6/dispatch).
   * Overage = prior overage fee × 1.8.
   */
  flexBasePrice: "$75",
  flexPerBooking: "$16",
  /** Founder Flex — always ≤ list; ~50–60%+ margin on 5–20 dispatch months. */
  betaFlexBasePrice: "$55",
  betaFlexPerBooking: "$12",
  /** Lite list · quiet months (~0–2). Kept for Lite→Flex crossover. */
  liteBasePrice: "$55",
  litePerBooking: "$24",
  /** Founder Lite — clear sale; $13/dispatch = 54% margin. */
  betaLiteBasePrice: "$45",
  betaLitePerBooking: "$13",
  /** Pro list — 15 included · ~64% margin at cap. */
  proPrice: "$249",
  proIncludedDispatches: 15,
  /** Overage = prior $12 × 1.8 → $22 (73% margin). */
  proOverageMultiplier: 3.6,
  /** Scale list — 30 included · ~60% margin at cap. */
  scalePrice: "$449",
  scaleIncludedDispatches: 30,
  /** Overage = prior $9 × 1.8 → $16 (63% margin). */
  scaleOverageMultiplier: 2.7,
  /** Founder Scale overage = prior $7.20 × 1.8 → $13 (54% margin). */
  betaScaleOverageMultiplier: 2.16,
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
  /** Founder Pro — $50 under list · ~55% margin at 15 included. */
  betaIntroPrice: "$199",
  /** Founder Scale — $80 under list · ~51% margin at 30 included. */
  betaScalePrice: "$369",
  betaLockedPrice: "$249",
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
