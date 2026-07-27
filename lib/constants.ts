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
   * Category: restoration phone→truck (not generic AI receptionist).
   * vs Rosie (~$49 message/book), Smith hybrid (~$300+/mo), OnCrew call tiers.
   * We bill approved emergency dispatches — shops only pay when a job is won.
   * Target ≥40% gross at typical Flex volume / Pro included cap (COGS $6/dispatch).
   * Founder (sale) always ≤ list on every priced leg.
   * 2026-07 retune: lower stickers so 1–8 crew shops start without fear; keep margin on usage.
   */
  /** Flex — default independent shop; 10 dispatches ≈ $149 list (still ≪ one water job). */
  flexBasePrice: "$49",
  flexPerBooking: "$10",
  betaFlexBasePrice: "$39",
  betaFlexPerBooking: "$8",
  /** Lite — quiet months; lowest base, higher per-dispatch. */
  liteBasePrice: "$29",
  litePerBooking: "$14",
  betaLiteBasePrice: "$25",
  betaLitePerBooking: "$11",
  /** Pro — 25 included · list ~40% at cap ($249 − $150 COGS). */
  proPrice: "$249",
  proIncludedDispatches: 25,
  /** Overage $15/dispatch (60% margin on COGS). */
  proOverageMultiplier: 2.5,
  /** Scale — storm / multi-crew · 40 included. */
  scalePrice: "$349",
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
  /** Founder Pro — under $200 sticker for early shops (margin builds on overage + retention). */
  betaIntroPrice: "$199",
  /** Founder Scale — storm shops still under Smith hybrid floor. */
  betaScalePrice: "$289",
  betaLockedPrice: "$249",
  betaDiscountYears: 5,
  /**
   * Per-minute voice track (separate SKUs from dispatch billing).
   * Competitive vs Rosie / Upfirst-style answering — included minutes + clear overage.
   * No live-agent transfer fees; same AI intake + owner holds as dispatch plans.
   */
  voiceStarterPrice: "$49",
  voiceStarterIncludedMinutes: 250,
  /** List overage $/min beyond included (Twilio+AI COGS ~$0.10–0.15). */
  voiceStarterOveragePerMinute: "$0.25",
  betaVoiceStarterPrice: "$39",
  betaVoiceStarterOveragePerMinute: "$0.22",
  voiceProPrice: "$149",
  voiceProIncludedMinutes: 1000,
  voiceProOveragePerMinute: "$0.20",
  betaVoiceProPrice: "$119",
  betaVoiceProOveragePerMinute: "$0.18",
} as const;

/** Dispatch track: lite/flex/pro/scale · Voice track: voice_starter/voice_pro */
export type PlanId =
  | "lite"
  | "flex"
  | "pro"
  | "scale"
  | "voice_starter"
  | "voice_pro";

/** Default checkout / trial-end plan — Flex fits most independent shops. */
export const DEFAULT_PLAN: PlanId = "flex";

export const DISPATCH_PLAN_IDS = ["lite", "flex", "pro", "scale"] as const;
export const VOICE_PLAN_IDS = ["voice_starter", "voice_pro"] as const;
export const ALL_PLAN_IDS = [...DISPATCH_PLAN_IDS, ...VOICE_PLAN_IDS] as const;

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
  quotes: "/dashboard/quotes",
  chase: "/dashboard/chase",
  quoteLanding: "/quote",
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
