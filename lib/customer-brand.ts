/**
 * Customer-facing copy — no platform (Effiroad) branding in SMS or portal replies.
 */

export const customerSmsStopReply =
  "You are unsubscribed from service text updates. Reply START to resubscribe.";

export const customerSmsStartReply =
  "You are resubscribed to service text updates from your restoration provider.";

export const customerSmsErrorReply =
  "Something went wrong. Please call your service provider or use the booking link we texted you.";

/** True when the portal hostname exposes platform branding (effiroad.com). */
export function isPlatformBrandedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().split(":")[0];
  return /effiroad/i.test(h);
}

export function warnIfBrandedPortalUrl(url: string): void {
  if (process.env.NODE_ENV !== "production") return;
  try {
    const host = new URL(url).hostname;
    if (isPlatformBrandedHost(host)) {
      console.warn(
        "[customer-brand] NEXT_PUBLIC_PORTAL_URL contains platform domain (effiroad.com). " +
          "Customers will see platform branding in SMS links. " +
          "Use a white-label domain (e.g. link.yourshop.com or a short .link domain).",
      );
    }
  } catch {
    /* ignore */
  }
}
