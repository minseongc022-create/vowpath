import {
  DEFAULT_ESTIMATE_EXCLUSIONS,
  DEFAULT_ESTIMATE_NOTES,
  defaultValidUntil,
  makeEstimateNumber,
  type EstimateDocument,
  type EstimateShopSnapshot,
} from "./estimate-document";
import { getShopProfile } from "./shop-profile-db";
import { findUserById } from "./users-db";
import { resolveBookingCustomerPhone } from "./booking-contact";
import type { JobCard } from "./types";

export async function buildDraftEstimateDoc(params: {
  userId: string;
  job: JobCard;
}): Promise<EstimateDocument> {
  const [user, profile, phone] = await Promise.all([
    findUserById(params.userId),
    getShopProfile(params.userId),
    resolveBookingCustomerPhone(params.userId, params.job.id),
  ]);

  const issuedAt = new Date().toISOString();
  const validityDays = profile.estimateValidityDays ?? 14;
  const taxRate = profile.defaultTaxRatePercent ?? 0;

  const shop: EstimateShopSnapshot = {
    shopName: user?.shopName?.trim() || "Your shop",
    phone: user?.phone,
    email: user?.email,
    businessAddress: profile.businessAddress?.trim() || undefined,
    licenseNumber: profile.licenseNumber?.trim() || undefined,
    iicrcFirmNumber: profile.iicrcFirmNumber?.trim() || undefined,
  };

  return {
    id: crypto.randomUUID(),
    number: makeEstimateNumber(),
    issuedAt,
    validUntil: defaultValidUntil(issuedAt, validityDays),
    customerName: params.job.customerName || "Customer",
    customerPhone: phone || undefined,
    customerAddress: params.job.address || undefined,
    scopeSummary: params.job.symptom || undefined,
    lineItems: [],
    taxRatePercent: taxRate,
    notes: profile.estimateNotes?.trim() || DEFAULT_ESTIMATE_NOTES,
    exclusions: profile.estimateExclusions?.trim() || DEFAULT_ESTIMATE_EXCLUSIONS,
    shop,
    status: "draft",
    updatedAt: issuedAt,
  };
}
