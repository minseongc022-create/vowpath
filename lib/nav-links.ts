import { ROUTES, SITE } from "./constants";
import { siteFooter, siteNav } from "./site-content";

/** Primary marketing nav — keep the header scannable (max 4 links). */
export function getMarketingNavLinks() {
  return [
    { label: siteNav.features, href: "/#features" },
    { label: siteNav.howItWorks, href: "/#how-it-works" },
    { label: siteNav.pricing, href: "/#pricing" },
  ];
}

/** Footer can expose one extra anchor without crowding the header. */
export function getNavLinks() {
  return [
    ...getMarketingNavLinks(),
    { label: siteNav.why, href: "/#about" },
  ];
}

export function getFooterLinks() {
  return [
    { label: siteFooter.privacy, href: ROUTES.privacy },
    { label: siteFooter.terms, href: ROUTES.terms },
    { label: siteFooter.contact, href: `mailto:${SITE.contactEmail}` },
  ];
}
