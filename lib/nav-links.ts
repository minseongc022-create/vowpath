import { ROUTES, SITE } from "./constants";
import type { UiLocale } from "./locale";
import { getSiteFooter, getSiteNav } from "./site-content-locale";

/** Anchor on the marketing homepage — keeps `?view=site` when a logged-in user is previewing. */
function marketingHash(hash: string, sitePreview: boolean): string {
  return sitePreview ? `${ROUTES.site}#${hash}` : `/#${hash}`;
}

/** Primary marketing nav — keep the header scannable (max 4 links). */
export function getMarketingNavLinks(
  locale: UiLocale = "en",
  opts?: { sitePreview?: boolean },
) {
  const nav = getSiteNav(locale);
  const sitePreview = Boolean(opts?.sitePreview);
  return [
    { label: nav.features, href: marketingHash("features", sitePreview) },
    { label: nav.howItWorks, href: marketingHash("how-it-works", sitePreview) },
    { label: nav.pricing, href: marketingHash("pricing", sitePreview) },
  ];
}

/** Footer can expose one extra anchor without crowding the header. */
export function getNavLinks(locale: UiLocale = "en", opts?: { sitePreview?: boolean }) {
  const nav = getSiteNav(locale);
  const sitePreview = Boolean(opts?.sitePreview);
  return [
    ...getMarketingNavLinks(locale, opts),
    { label: nav.why, href: marketingHash("about", sitePreview) },
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
