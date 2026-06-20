import { getPublicAppUrl } from "../app-url";
import { getPortalBaseUrl } from "../portal-url";
import { findUserById } from "../users-db";
import { sendSms } from "../send-sms";
import { shopDisplayNameForUser } from "../link-intake-brand";
import {
  getAgreementKeeperSettings,
  newAgreementId,
  saveAgreement,
} from "./store";
import { createAgreementOfferSession, markAgreementOfferUsed } from "./offer-store";
import { formatAgreementPrice, type MaintenanceAgreement } from "./types";

export async function buildAgreementOfferUrl(token: string): Promise<string> {
  const base = getPortalBaseUrl() || getPublicAppUrl();
  if (!base) return `/agreement-offer/${token}`;
  return `${base.replace(/\/$/, "")}/agreement-offer/${token}`;
}

export async function maybeOfferMaintenancePlan(
  userId: string,
  bookingId: string,
  customer: {
    phone?: string | null;
    name?: string | null;
    address?: string | null;
  },
): Promise<{ offered: boolean; reason?: string }> {
  const settings = await getAgreementKeeperSettings(userId);
  if (!settings.enabled || !settings.offerAfterJobComplete) {
    return { offered: false, reason: "disabled" };
  }

  const phone = customer.phone?.trim();
  if (!phone) return { offered: false, reason: "no_phone" };

  const shopName = await shopDisplayNameForUser(userId);

  const session = await createAgreementOfferSession({
    userId,
    shopName,
    bookingId,
    customerPhone: phone,
    customerName: customer.name?.trim() || "Customer",
    serviceAddress: customer.address?.trim() || "On file",
    planName: settings.defaultPlanName,
    annualPriceCents: settings.defaultAnnualPriceCents,
    visitsPerYear: settings.defaultVisitsPerYear,
    expiresDays: settings.offerExpiresDays,
  });

  const url = await buildAgreementOfferUrl(session.token);
  const price = formatAgreementPrice(settings.defaultAnnualPriceCents);
  const body = [
    `${shopName}: Thanks for choosing us today.`,
    `Save ${settings.defaultVisitsPerYear} tune-ups/year with our ${settings.defaultPlanName} (${price}/yr).`,
    `Tap to enroll: ${url}`,
  ].join(" ");

  const result = await sendSms(phone, body, "agreement_offer", {
    context: { userId, operation: "agreement_offer", bookingId },
  });

  if (!result.ok) {
    console.warn("[agreement-offer] sms failed", result.error);
    return { offered: false, reason: "sms_failed" };
  }

  return { offered: true };
}

export async function acceptAgreementOffer(token: string): Promise<{
  ok: boolean;
  agreement?: MaintenanceAgreement;
  error?: string;
}> {
  const { getAgreementOfferSession } = await import("./offer-store");
  const session = await getAgreementOfferSession(token);
  if (!session) return { ok: false, error: "expired" };
  if (session.usedAt) return { ok: false, error: "already_used" };

  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const renewal = new Date(now);
  renewal.setFullYear(renewal.getFullYear() + 1);
  const renewalDate = renewal.toISOString().slice(0, 10);

  const agreement: MaintenanceAgreement = {
    id: newAgreementId(),
    userId: session.userId,
    customerName: session.customerName,
    customerPhone: session.customerPhone,
    serviceAddress: session.serviceAddress,
    planName: session.planName,
    annualPriceCents: session.annualPriceCents,
    visitsPerYear: session.visitsPerYear,
    status: "active",
    startDate,
    renewalDate,
    source: "offer",
    linkedBookingId: session.bookingId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await saveAgreement(agreement);
  await markAgreementOfferUsed(token, agreement.id);

  const user = await findUserById(session.userId);
  const shopName = await shopDisplayNameForUser(session.userId);
  const price = formatAgreementPrice(session.annualPriceCents);
  const confirmBody = [
    `${shopName}: You're enrolled in ${session.planName} (${price}/yr).`,
    `We'll reach out before your ${session.visitsPerYear} annual tune-ups.`,
    "Reply STOP to opt out.",
  ].join(" ");

  await sendSms(session.customerPhone, confirmBody, "agreement_accepted", {
    context: {
      userId: session.userId,
      operation: "agreement_accepted",
      bookingId: session.bookingId,
    },
  });

  if (user?.phone?.trim()) {
    await sendSms(
      user.phone,
      `PM plan signed: ${session.customerName} — ${session.planName} (${price}/yr).`,
      "agreement_owner_notify",
      {
        context: {
          userId: session.userId,
          operation: "agreement_owner_notify",
          bookingId: session.bookingId,
        },
      },
    );
  }

  return { ok: true, agreement };
}
