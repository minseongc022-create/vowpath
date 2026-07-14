"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/constants";
import { getMarketingNavLinks } from "@/lib/nav-links";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/ui/Container";
import { HeaderAuth, MobileHeaderAuth } from "@/components/layout/HeaderAuth";
import { VerticalSwitcher } from "@/components/layout/VerticalSwitcher";

type HeaderProps = {
  session: { email: string; shopName: string } | null;
};

export function Header({ session }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const navLinks = getMarketingNavLinks();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="vow-site-header">
      <Container>
        <div className="flex h-14 min-h-14 items-center gap-3 sm:h-16 lg:gap-6">
          <BrandLogo placement="site-header" href={ROUTES.home} />

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-6 lg:flex xl:gap-8"
            aria-label="Primary"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm font-medium text-stone-700 transition hover:text-brand-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0 lg:gap-2">
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

      <div className="border-t border-brand-200/70 bg-brand-50/80 py-2.5 sm:py-3.5">
        <Container>
          <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
            <p className="text-xs font-medium text-stone-700 sm:text-sm">See the site built for your trade</p>
            <VerticalSwitcher />
          </div>
        </Container>
      </div>

      {open ? (
        <div className="fixed inset-0 top-[calc(3.5rem+3.25rem)] z-40 overflow-y-auto border-t border-brand-200 bg-white lg:hidden sm:top-[calc(4rem+3.25rem)]">
          <nav className="flex flex-col px-5 py-4" aria-label="Primary mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-[44px] items-center text-base font-medium text-brand-900"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <MobileHeaderAuth session={session} onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
