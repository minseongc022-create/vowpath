import { IS_BETA } from "./beta";
import { getCheckoutCta, getSectionLabels, getSiteTagline } from "./marketing-constants";

export const SITE = {
  name: "Vowpath",
  tagline: getSiteTagline(),
  url: "https://vowroad.com",
  contactEmail: "support@vowroad.com",
  supportEmail: "support@vowroad.com",
  monthlyPrice: "$199",
  flexBasePrice: "$49",
  flexPerBooking: "$18",
} as const;

export type PlanId = "unlimited" | "flex";

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
} as const;

export const FOOTER_LINKS = [
  { label: "Privacy", href: ROUTES.privacy },
  { label: "Terms", href: ROUTES.terms },
  { label: "Contact", href: `mailto:${SITE.contactEmail}` },
] as const;

export const NAV_LINKS = [
  { label: "Product", href: "/#differentiators" },
  { label: "Why us", href: "/#about" },
  { label: "Booking modes", href: "/#scheduling" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Get started", href: ROUTES.getStarted },
] as const;

export const SECTION_LABELS = getSectionLabels();

export const CHECKOUT_CTA = getCheckoutCta();
export const BETA_SIGNUP_CTA = IS_BETA ? "Start free" : "Get started";
