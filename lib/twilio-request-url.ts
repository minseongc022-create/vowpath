import { getTwilioWebhookBaseUrl } from "./twilio-config";

/** Twilio signature validation must use the public URL Twilio POSTed to (path + query). */
export function getTwilioPublicRequestUrl(request: Request): string {
  const url = new URL(request.url);
  const pathWithQuery = `${url.pathname}${url.search}`;
  const base = getTwilioWebhookBaseUrl();
  if (base && !base.includes("localhost") && !base.includes("127.0.0.1")) {
    return `${base.replace(/\/$/, "")}${pathWithQuery}`;
  }
  return request.url;
}
