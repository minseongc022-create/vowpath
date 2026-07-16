/** Bump when Terms or Privacy materially change — stored on user record. */
export const LEGAL_CONSENT_VERSION = "2026-07";

export type StoredLegalConsent = {
  termsPrivacyAt: string;
  smsServiceAt: string;
  legalVersion: string;
  /** Optional Effiroad product updates by email. */
  marketingEmailAt?: string | null;
  /** Optional Effiroad product updates by SMS. */
  marketingSmsAt?: string | null;
};

export type CustomerSmsConsentRecord = {
  /** Required — transactional texts about this service request. */
  smsServiceAt: string;
  /** Optional — promotional (offers, maintenance, review requests). */
  smsMarketingAt?: string | null;
  consentVersion: string;
};

export function parseOptionalConsent(value: unknown): boolean {
  return value === true || value === "1" || value === "true" || value === "on";
}

export function parseLegalConsentBody(body: Record<string, unknown>): {
  ok: true;
  consent: StoredLegalConsent;
} | { ok: false; error: string } {
  const termsAccepted = body.termsAccepted === true || body.termsAccepted === "1";
  const smsServiceConsent =
    body.smsServiceConsent === true || body.smsServiceConsent === "1";

  if (!termsAccepted) {
    return { ok: false, error: "You must agree to the Terms of Service and Privacy Policy." };
  }
  if (!smsServiceConsent) {
    return {
      ok: false,
      error: "You must agree to receive service-related text messages at your mobile number.",
    };
  }

  const now = new Date().toISOString();
  const marketingEmail = parseOptionalConsent(body.marketingEmailConsent);
  const marketingSms = parseOptionalConsent(body.marketingSmsConsent);

  return {
    ok: true,
    consent: {
      termsPrivacyAt: now,
      smsServiceAt: now,
      legalVersion: LEGAL_CONSENT_VERSION,
      marketingEmailAt: marketingEmail ? now : null,
      marketingSmsAt: marketingSms ? now : null,
    },
  };
}

export function parseCustomerSmsConsent(value: unknown): boolean {
  return value === true || value === "1" || value === "true" || value === "on";
}

export function parseCustomerMarketingSmsConsent(value: unknown): boolean {
  return parseOptionalConsent(value);
}

export function buildCustomerSmsConsentRecord(params: {
  serviceConsent: boolean;
  marketingConsent: boolean;
}): CustomerSmsConsentRecord | null {
  if (!params.serviceConsent) return null;
  const now = new Date().toISOString();
  return {
    smsServiceAt: now,
    smsMarketingAt: params.marketingConsent ? now : null,
    consentVersion: LEGAL_CONSENT_VERSION,
  };
}
