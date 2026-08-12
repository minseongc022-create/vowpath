export const SITE = {
  name: "ClosePing",
  tagline: "Estimates that don't go cold",
  description:
    "Send the quote. ClosePing chases at 48 hours, 7 days, and 14 days — until they book.",
  monthlyPrice: "$149",
  annualPrice: "$1,490",
  trialDays: 14,
} as const;

export const CHASE_INTERVALS_DAYS = [2, 7, 14] as const;

export type QuoteStatus = "draft" | "sent" | "chasing" | "won" | "lost";

export type Quote = {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  description: string;
  amountCents: number;
  address?: string;
  trade?: string;
  status: QuoteStatus;
  sentAt?: string;
  chaseSentAt: string[];
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  shopName: string;
  createdAt: string;
};
