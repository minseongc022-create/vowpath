import { getTwilioWebhookBaseUrl } from "./twilio-config";

/** Twilio signature validation must use the public URL Twilio POSTed to. */
export function getTwilioPublicRequestUrl(request: Request): string {
  const path = new URL(request.url).pathname;
  const base = getTwilioWebhookBaseUrl();
  if (base && !base.includes("localhost") && !base.includes("127.0.0.1")) {
    return `${base.replace(/\/$/, "")}${path}`;
  }
  return request.url;
}
