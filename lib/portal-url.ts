import { getPublicAppUrl } from "./app-url";
import { warnIfBrandedPortalUrl } from "./customer-brand";

const PORTAL_HOST_SUFFIXES = ["portal.", "book.", "app.", "link.", "go.", "requests."] as const;

/** Customer-facing portal (intake links, booking manage). Never use bare marketing homepage. */
export function getPortalBaseUrl(): string {
  const portal = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (portal && !portal.includes("localhost")) {
    const base = portal.replace(/\/$/, "");
    warnIfBrandedPortalUrl(base);
    return base;
  }

  const app = getPublicAppUrl();
  if (app) {
    try {
      const hostname = new URL(app).hostname.replace(/^www\./, "");
      // link.{your-domain} — neutral SMS link, not the marketing site (see .env.example)
      if (
        process.env.NEXT_PUBLIC_PORTAL_USE_BOOK_SUBDOMAIN === "true" &&
        !hostname.startsWith("book.") &&
        !hostname.startsWith("link.")
      ) {
        return `https://link.${hostname}`;
      }
    } catch {
      /* ignore */
    }
    return app;
  }
  return "";
}

/** Short customer portal path — keeps SMS URLs compact. */
export function buildBookingPortalUrl(token: string): string {
  const base = getPortalBaseUrl();
  const path = `/r/${token}`;
  if (!base) return path;
  return `${base}${path}`;
}

/** @deprecated Use buildBookingPortalUrl */
export function buildIntakeReviewUrl(token: string): string {
  return buildBookingPortalUrl(token);
}

export function buildLinkIntakeUrl(token: string): string {
  return buildBookingPortalUrl(token);
}

/** Hostname from NEXT_PUBLIC_PORTAL_URL (e.g. link.effiroad.com). */
export function getPortalRootHostname(): string | null {
  const portal = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (!portal || portal.includes("localhost")) return null;
  try {
    const url = portal.startsWith("http") ? portal : `https://${portal}`;
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isPortalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  const root = getPortalRootHostname();
  if (root && (h === root || h === `www.${root}`)) return true;
  if (PORTAL_HOST_SUFFIXES.some((prefix) => h.startsWith(prefix))) return true;
  return (
    h === "book.effiroad.com" ||
    h === "link.effiroad.com" ||
    h === "go.effiroad.com"
  );
}
