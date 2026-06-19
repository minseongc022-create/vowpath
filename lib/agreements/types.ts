export type AgreementStatus = "draft" | "active" | "expired" | "cancelled";

export type AgreementSource = "manual" | "import" | "offer";

export type MaintenanceAgreement = {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceAddress: string;
  planName: string;
  annualPriceCents: number;
  visitsPerYear: number;
  status: AgreementStatus;
  startDate: string;
  renewalDate: string;
  lastVisitDate?: string;
  notes?: string;
  source: AgreementSource;
  linkedBookingId?: string;
  createdAt: string;
  updatedAt: string;
  remindersSent?: Record<string, string>;
};

export type AgreementKeeperSettings = {
  enabled: boolean;
  offerAfterJobComplete: boolean;
  defaultPlanName: string;
  defaultAnnualPriceCents: number;
  defaultVisitsPerYear: number;
  offerExpiresDays: number;
  ownerReminderDays: number[];
  customerReminderDays: number[];
};

export const DEFAULT_AGREEMENT_KEEPER_SETTINGS: AgreementKeeperSettings = {
  enabled: true,
  offerAfterJobComplete: true,
  defaultPlanName: "Annual HVAC Maintenance",
  defaultAnnualPriceCents: 19900,
  defaultVisitsPerYear: 2,
  offerExpiresDays: 14,
  ownerReminderDays: [60, 30, 7],
  customerReminderDays: [30, 7],
};

export type AgreementOfferSession = {
  token: string;
  userId: string;
  shopName?: string;
  bookingId?: string;
  customerPhone: string;
  customerName: string;
  serviceAddress: string;
  planName: string;
  annualPriceCents: number;
  visitsPerYear: number;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  agreementId?: string;
};

export function daysUntilRenewal(renewalDate: string, now = new Date()): number {
  const end = new Date(renewalDate);
  end.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function isRenewingSoon(agreement: MaintenanceAgreement, withinDays = 30): boolean {
  if (agreement.status !== "active") return false;
  const days = daysUntilRenewal(agreement.renewalDate);
  return days >= 0 && days <= withinDays;
}

export function formatAgreementPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
