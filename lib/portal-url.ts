import { getPublicAppUrl } from "./app-url";

/** Customer-facing portal (intake links, booking manage). Prefer portal subdomain in production. */
export function getPortalBaseUrl(): string {
  const portal = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (portal && !portal.includes("localhost")) {
    return portal.replace(/\/$/, "");
  }
  const app = getPublicAppUrl();
  if (app) return app;
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
  return (
    h.startsWith("portal.") ||
    h === "portal.vowpath.com" ||
    h.startsWith("app.") ||
    h === "app.vowpath.com"
  );
}
