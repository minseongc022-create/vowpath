import { IS_BETA } from "./beta";
import { getCheckoutCta, getSectionLabels, getSiteTagline } from "./marketing-constants";

export const SITE = {
  name: "EFFIROAD",
  tagline: getSiteTagline(),
  url: "https://effiroad.com",
  contactEmail: "support@effiroad.com",
  supportEmail: "support@effiroad.com",
  /** Alias for Pro list price (break-even / marketing copy). */
  monthlyPrice: "$199",
  /**
   * Pricing ladder (designed so upgrades feel obvious):
   * Lite 0–2/mo · Flex ~3–13/mo · Pro ~14–22/mo · Scale 23+/mo
   * Premium AI on every plan — differentiation is volume & billing model.
   * Founder cohort: >50% gross margin at included cap (COGS $6/dispatch).
   */
  flexBasePrice: "$59",
  flexPerBooking: "$10",
  /** Founder feedback cohort — locked for 5 years after trial. */
  betaFlexBasePrice: "$53",
  betaFlexPerBooking: "$13",
  liteBasePrice: "$32",
  litePerBooking: "$20",
  betaLiteBasePrice: "$28",
  betaLitePerBooking: "$18",
  /** Pro (flat) — included dispatches + transparent overage. */
  proPrice: "$199",
  proIncludedDispatches: 15,
  /** Overage = prior $12/dispatch × 1.8 → $22 (72% gross margin on COGS $6). */
  proOverageMultiplier: 3.6,
  /** Scale — high-volume flat plan (storm / busy shops). */
  scalePrice: "$369",
  scaleIncludedDispatches: 30,
  /** Overage = prior $9/dispatch × 1.8 → $16 (63% gross margin). */
  scaleOverageMultiplier: 2.7,
  /** Founder Scale overage = prior $7.20 × 1.8 → $13 (54% gross margin). */
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
  /** Trial-feedback cohort: Pro $181/mo for 5 years (>50% margin at 15 included), then list Pro. */
  betaIntroPrice: "$181",
  betaScalePrice: "$361",
  betaLockedPrice: "$199",
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
