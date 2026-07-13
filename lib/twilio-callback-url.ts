import { requireTwilioWebhookBaseUrl } from "./twilio-config";

/** Absolute HTTPS URL for Twilio <Gather action="..."> callbacks (never relative). */
export function buildTwilioCallbackUrl(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): string {
  const base =
    requireTwilioWebhookBaseUrl("twilio-callback-url") ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  if (!base) {
    throw new Error(
      "TWILIO_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL required for Twilio callbacks",
    );
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${base}${normalizedPath}?${query}` : `${base}${normalizedPath}`;
}

/**
 * Rebuild the current webhook path/query using the public base URL.
 * Vercel/serverless `request.url` can be an internal host — Twilio needs the public URL.
 */
export function twilioCallbackUrlFromRequest(
  request: Request,
  extra?: Record<string, string | number | undefined | null>,
): string {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.searchParams);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === null || value === "") continue;
      search.set(key, String(value));
    }
  }
  return buildTwilioCallbackUrl(url.pathname, Object.fromEntries(search.entries()));
}
