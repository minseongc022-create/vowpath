"use client";

import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/lib/constants";
import { getNavLinks } from "@/lib/nav-links";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/ui/Container";
import { HeaderAuth, MobileHeaderAuth } from "@/components/layout/HeaderAuth";

type HeaderProps = {
  session: { email: string; shopName: string } | null;
};

export function Header({ session }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const navLinks = getNavLinks();

  return (
    <header className="vow-site-header">
      <Container>
        <div className="flex h-14 min-h-14 items-center gap-3 sm:h-16 lg:grid lg:grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)] lg:items-center lg:gap-6">
          <BrandLogo showTagline size="lg" href={ROUTES.home} className="min-w-0 max-w-[11rem] sm:max-w-[13rem] lg:max-w-none" />

          <nav className="hidden items-center justify-center gap-5 xl:flex xl:gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm font-medium text-stone-800 transition hover:text-brand-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center lg:ml-0 lg:justify-end">
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

      {open ? (
        <div className="border-t border-brand-200 bg-white px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
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
