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
        <div className="flex h-16 items-center justify-between gap-3">
          <BrandLogo variant="light" showTagline size="xl" href={ROUTES.home} />

          <nav className="hidden items-center justify-center gap-6 lg:flex lg:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-300 transition hover:text-brand-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <HeaderAuth session={session} />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-200 hover:bg-white/10 lg:hidden"
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
        <div className="border-t border-white/[0.08] bg-[#0b0e14] px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-200"
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
