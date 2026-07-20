"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/constants";
import { useLocale } from "@/components/providers/LocaleProvider";
import { getMarketingNavLinks } from "@/lib/nav-links";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/ui/Container";
import { HeaderAuth, MobileHeaderAuth } from "@/components/layout/HeaderAuth";
import { PublicLocaleToggle } from "@/components/layout/PublicLocaleToggle";
import { VerticalSwitcher } from "@/components/layout/VerticalSwitcher";

type HeaderProps = {
  session: { email: string; shopName: string } | null;
};

export function Header({ session }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { locale } = useLocale();
  const navLinks = getMarketingNavLinks(locale, { sitePreview: Boolean(session) });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="vow-site-header w-full">
      <Container className="w-full">
        <div className="flex h-12 w-full min-w-0 items-center gap-2 sm:h-16 sm:gap-3">
          <BrandLogo placement="site-header" href={session ? ROUTES.dashboard : ROUTES.home} />

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <PublicLocaleToggle className="hidden sm:inline-flex" />
            {!session ? (
              <Link
                href={ROUTES.login}
                className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-stone-700 hover:text-brand-900 lg:hidden"
              >
                Log in
              </Link>
            ) : null}
            <div className="hidden lg:block">
              <HeaderAuth session={session} />
            </div>
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-brand-800 hover:bg-brand-100 lg:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen(!open)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </Container>

      <div className="hidden border-t border-brand-200/70 bg-brand-50/80 py-2.5 md:block md:py-3">
        <Container>
          <div className="flex flex-col items-center justify-center py-0.5">
            <VerticalSwitcher />
          </div>
        </Container>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 z-40 bg-brand-950/30 sm:top-16 lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-brand-200 bg-white shadow-lg sm:top-16 lg:hidden">
            <nav className="flex flex-col px-4 py-3" aria-label="Primary mobile">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-brand-100 pb-3">
                <PublicLocaleToggle />
                <VerticalSwitcher />
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-[48px] items-center text-base font-medium text-brand-900"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <MobileHeaderAuth session={session} onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
