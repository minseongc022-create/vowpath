import { getPublicAppUrl } from "./app-url";

export function isTwilioConfigured(): boolean {  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_PHONE_NUMBER?.trim(),
  );
}

export function getTwilioDefaultUserId(): string | undefined {
  return process.env.TWILIO_DEFAULT_USER_ID?.trim() || undefined;
}

export function getTwilioWebhookBaseUrl(): string {
  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.trim();
  if (base) return base.replace(/\/$/, "");
  return getPublicAppUrl();
}