import { SITE } from "../constants";

/** ClosePing — standalone estimate follow-up for home-service contractors. */
export const CLOSEPING = {
  name: "ClosePing",
  tagline: "SMS follow-up for open estimates",
  description:
    "Send the quote, then ClosePing chases at 48 hours, 7 days, and 14 days — until they book or you mark it closed.",
  url: process.env.NEXT_PUBLIC_CLOSEPING_URL?.trim() || `${SITE.url}/closeping`,
  contactEmail: "hello@closeping.app",
  /** Under QuoteFollow ($299) — one recovered job pays for a year. */
  monthlyPrice: "$149",
  annualPrice: "$1,490",
  trialDays: 14,
  smsOverage: "$0.02",
} as const;

export const CLOSEPING_ROUTES = {
  home: "/closeping",
  pricing: "/closeping/pricing",
  signup: "/signup?product=closeping",
  login: "/login?redirect=/closeping/app",
  app: "/closeping/app",
  quotes: "/closeping/app/quotes",
  newQuote: "/closeping/app/quotes/new",
  settings: "/closeping/app/settings",
} as const;
