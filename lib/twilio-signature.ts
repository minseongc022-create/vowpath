import twilio from "twilio";
import { getTwilioPublicRequestUrl } from "./twilio-request-url";

export function validateTwilioWebhook(request: Request, rawBody: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token) {
    return process.env.NODE_ENV !== "production";
  }
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    console.warn("[twilio-signature] missing X-Twilio-Signature header");
    return false;
  }
  const url = getTwilioPublicRequestUrl(request);
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const ok = twilio.validateRequest(token, signature, url, params);
  if (!ok) {
    console.error(
      "[twilio-signature] validation failed for URL:",
      url,
      "(set TWILIO_WEBHOOK_BASE_URL to the exact public origin Twilio calls)",
    );
  }
  return ok;
}
