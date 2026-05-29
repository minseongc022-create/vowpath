"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/constants";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/ui/Container";
import { HeaderAuth, MobileHeaderAuth } from "@/components/layout/HeaderAuth";

type HeaderProps = {
  session: { email: string; shopName: string } | null;
};

export function Header({ session }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border/80 bg-white/90 shadow-nav backdrop-blur-lg">
      <Container>
        <div className="flex h-16 items-center justify-between gap-3">
          <BrandLogo />

          <nav className="hidden items-center justify-center gap-6 lg:flex lg:gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-brand-800 transition hover:text-brand-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <HeaderAuth session={session} />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-brand-800 hover:bg-brand-50 lg:hidden"
              aria-expanded={open}
              aria-label="메뉴 열기"
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
        <div className="border-t border-surface-border bg-white px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
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
