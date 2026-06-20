import { getPublicAppUrl } from "./app-url";

const PORTAL_HOST_SUFFIXES = ["portal.", "book.", "app."] as const;

/** Customer-facing portal (intake links, booking manage). Never use bare marketing homepage. */
export function getPortalBaseUrl(): string {
  const portal = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (portal && !portal.includes("localhost")) {
    return portal.replace(/\/$/, "");
  }

  const app = getPublicAppUrl();
  if (app) {
    try {
      const hostname = new URL(app).hostname.replace(/^www\./, "");
      // book.{your-domain} — add this subdomain in Vercel + DNS (see .env.example)
      if (
        process.env.NEXT_PUBLIC_PORTAL_USE_BOOK_SUBDOMAIN === "true" &&
        !hostname.startsWith("book.")
      ) {
        return `https://book.${hostname}`;
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

export function isPortalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  if (PORTAL_HOST_SUFFIXES.some((prefix) => h.startsWith(prefix))) return true;
  return (
    h === "portal.vowpath.com" ||
    h === "app.vowpath.com" ||
    h === "book.vowpathhq.com"
  );
}
