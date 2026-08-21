import { CANONICAL_MARKETING_HOST, normalizeHostname } from "./canonical-host";

/** Customer booking / intake paths — must keep working on effiroad.com for SMS links. */
export const CUSTOMER_PORTAL_PREFIXES = [
  "/r/",
  "/t/",
  "/go/",
  "/intake/",
  "/portal",
  "/agreement-offer/",
  "/e/",
  "/api/intake-link/",
  "/api/track/",
  "/api/correction/",
  "/api/agreement-offer/",
  "/api/places/",
];

/** Effiroad dispatch marketing UI — local dev only when EFFIROAD_DISPATCH_ENABLED=1. */
const LEGACY_EFFIROAD_UI_PREFIXES = [
  "/pricing",
  "/signup",
  "/onboarding",
  "/quote",
  "/hvac",
  "/restoration",
  "/demo",
  "/closeping",
  "/get-started",
  "/pay",
  "/sourcing",
  "/matchcut",
  "/trading",
  "/widget",
  "/terms",
  "/privacy",
  "/refund",
  "/forgot-password",
  "/settings",
];

export function isSellerPulsePrimaryHost(host: string | null | undefined): boolean {
  return normalizeHostname(host) === CANONICAL_MARKETING_HOST;
}

/** When true, effiroad.com serves legacy dispatch UI at / (local dev). */
export function isEffiroadDispatchEnabled(): boolean {
  const v = process.env.EFFIROAD_DISPATCH_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function isCustomerPortalPath(pathname: string): boolean {
  return CUSTOMER_PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function isLegacyEffiroadUiPath(pathname: string): boolean {
  return LEGACY_EFFIROAD_UI_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Map public root URL → internal /toss-shop file route. */
export function sellerPulseInternalPath(pathname: string): string | null {
  if (pathname === "/") return "/toss-shop";
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return `/toss-shop${pathname}`;
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return `/toss-shop${pathname}`;
  }
  return null;
}

export function sellerPulseAtRoot(): boolean {
  return process.env.NEXT_PUBLIC_SELLER_PULSE_AT_ROOT === "1";
}
