import { getPortalBaseUrl } from "../portal-url";

/** Customer live map (OSM) — zero paid map APIs. */
export function buildCustomerTrackUrl(customerToken: string): string {
  const base = getPortalBaseUrl();
  const path = `/t/${customerToken}`;
  return base ? `${base}${path}` : path;
}

/** Tech “Start / share location” page — browser GPS, no app store. */
export function buildTechGoUrl(techToken: string): string {
  const base = getPortalBaseUrl();
  const path = `/go/${techToken}`;
  return base ? `${base}${path}` : path;
}
