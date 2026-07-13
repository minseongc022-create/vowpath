import { getPublicAppUrl } from "./app-url";

/** Canonical production host when env is misconfigured (better than relative TwiML URLs). */
const PRODUCTION_FALLBACK_BASE = "https://effiroad.com";

/** Twilio account credentials (per-tenant inbound numbers stored separately). */
export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
}

export function getTwilioDefaultUserId(): string | undefined {
  return process.env.TWILIO_DEFAULT_USER_ID?.trim() || undefined;
}

export function getTwilioWebhookBaseUrl(): string {
  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.trim();
  if (base) return base.replace(/\/$/, "");
  const fromApp = getPublicAppUrl();
  if (fromApp) return fromApp;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    console.error(
      "[twilio-config] TWILIO_WEBHOOK_BASE_URL unset — using fallback",
      PRODUCTION_FALLBACK_BASE,
    );
    return PRODUCTION_FALLBACK_BASE;
  }
  return "";
}

export function requireTwilioWebhookBaseUrl(context: string): string {
  const base = getTwilioWebhookBaseUrl();
  if (!base) {
    console.error(`[${context}] TWILIO_WEBHOOK_BASE_URL is empty — Twilio callbacks will fail`);
  }
  return base;
}
