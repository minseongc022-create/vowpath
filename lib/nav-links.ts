import { ROUTES, SITE } from "./constants";
import type { UiLocale } from "./locale";
import { getSiteFooter, getSiteNav } from "./site-content-locale";

/** Primary marketing nav — keep the header scannable (max 4 links). */
export function getMarketingNavLinks(locale: UiLocale = "en") {
  const nav = getSiteNav(locale);
  return [
    { label: nav.features, href: "/#features" },
    { label: nav.howItWorks, href: "/#how-it-works" },
    { label: nav.pricing, href: "/#pricing" },
  ];
}

/** Footer can expose one extra anchor without crowding the header. */
export function getNavLinks(locale: UiLocale = "en") {
  const nav = getSiteNav(locale);
  return [
    ...getMarketingNavLinks(locale),
    { label: nav.why, href: "/#about" },
  ];
}

export function getFooterLinks(locale: UiLocale = "en") {
  const footer = getSiteFooter(locale);
  return [
    { label: footer.privacy, href: ROUTES.privacy },
    { label: footer.terms, href: ROUTES.terms },
    { label: footer.refund, href: ROUTES.refund },
    { label: footer.contact, href: `mailto:${SITE.contactEmail}` },
  ];
}
