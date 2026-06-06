import twilio from "twilio";
import { getTwilioPublicRequestUrl } from "./twilio-request-url";

export function validateTwilioWebhook(request: Request, rawBody: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token) {
    return process.env.NODE_ENV !== "production";
  }
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;
  const url = getTwilioPublicRequestUrl(request);
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  return twilio.validateRequest(token, signature, url, params);
}
