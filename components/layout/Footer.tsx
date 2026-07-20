"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useLocale, useSiteContent } from "@/components/providers/LocaleProvider";
import { SITE, ROUTES } from "@/lib/constants";
import { getFooterLinks, getNavLinks } from "@/lib/nav-links";
import { Container } from "@/components/ui/Container";

export function Footer({ sitePreview = false }: { sitePreview?: boolean }) {
  const { locale } = useLocale();
  const { footer: siteFooter } = useSiteContent();
  const navLinks = getNavLinks(locale, { sitePreview });
  const footerLinks = getFooterLinks(locale);
  const tagline = siteFooter?.tagline ?? SITE.tagline;
  const subline = siteFooter?.subline ?? "US water · fire · mold restoration · optional CRM · 24/7 intake";

  return (
    <footer className="border-t border-brand-200 bg-brand-100 text-stone-800">
      <Container className="py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <BrandLogo placement="site-footer" href={sitePreview ? ROUTES.site : ROUTES.home} />
            <p className="mt-3 text-sm leading-relaxed text-stone-800">{tagline}</p>
            {siteFooter?.brandMeaning ? (
              <p className="mt-3 text-sm leading-relaxed text-stone-700">{siteFooter.brandMeaning}</p>
            ) : null}
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-brand-600">{subline}</p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-stone-800 transition hover:text-brand-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-brand-200/80 pt-8">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-stone-600 transition hover:text-brand-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-8 text-xs text-stone-500">
          © {new Date().getFullYear()} {SITE.name}. {locale === "es" ? "Todos los derechos reservados." : "All rights reserved."}
        </p>
      </Container>
    </footer>
  );
}
