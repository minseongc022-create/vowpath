"use client";

import Link from "next/link";
import { useState } from "react";
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

  return (
    <header className="vow-site-header">
      <Container>
        <div className="flex h-14 min-h-14 items-center gap-4 sm:h-16 lg:gap-6">
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

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <HeaderAuth session={session} />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-brand-800 hover:bg-brand-100 lg:hidden"
              aria-expanded={open}
              aria-label="Open menu"
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

      <div className="border-t border-brand-200/70 bg-brand-50/80 py-3.5">
        <Container>
          <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
            <p className="text-sm font-medium text-stone-700">See the site built for your trade</p>
            <VerticalSwitcher />
          </div>
        </Container>
      </div>

      {open ? (
        <div className="border-t border-brand-200 bg-white px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-3" aria-label="Primary mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-brand-900"
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
