/** Bump when Terms or Privacy materially change — stored on user record. */
export const LEGAL_CONSENT_VERSION = "2026-03";

export type StoredLegalConsent = {
  termsPrivacyAt: string;
  smsServiceAt: string;
  legalVersion: string;
};

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
  return {
    ok: true,
    consent: {
      termsPrivacyAt: now,
      smsServiceAt: now,
      legalVersion: LEGAL_CONSENT_VERSION,
    },
  };
}

export function parseCustomerSmsConsent(value: unknown): boolean {
  return value === true || value === "1" || value === "true" || value === "on";
}
