"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLOSEPING, CLOSEPING_ROUTES } from "@/lib/closeping/constants";

const NAV = [
  { href: CLOSEPING_ROUTES.app, label: "Overview", exact: true },
  { href: CLOSEPING_ROUTES.quotes, label: "Quotes", exact: false },
  { href: CLOSEPING_ROUTES.settings, label: "Settings", exact: false },
];

export function ClosePingLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ping-600 text-sm text-white shadow-sm">
        CP
      </span>
      <span>{CLOSEPING.name}</span>
    </span>
  );
}

export function ClosePingMarketingHeader({ session }: { session?: { email: string } | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-ping-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href={CLOSEPING_ROUTES.home}>
          <ClosePingLogo className="text-ping-950" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-stone-600 sm:flex">
          <a href="#how-it-works" className="hover:text-ping-700">
            How it works
          </a>
          <Link href={CLOSEPING_ROUTES.pricing} className="hover:text-ping-700">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href={CLOSEPING_ROUTES.app}
              className="rounded-lg bg-ping-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ping-700"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={CLOSEPING_ROUTES.login}
                className="hidden text-sm font-medium text-stone-600 hover:text-ping-700 sm:inline"
              >
                Log in
              </Link>
              <Link
                href={CLOSEPING_ROUTES.signup}
                className="rounded-lg bg-ping-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ping-700"
              >
                Start free trial
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function ClosePingAppShell({
  children,
  shopName,
}: {
  children: React.ReactNode;
  shopName?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ping-50/40">
      <header className="border-b border-ping-100 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={CLOSEPING_ROUTES.app}>
            <ClosePingLogo className="text-base text-ping-950" />
          </Link>
          {shopName ? (
            <p className="hidden truncate text-sm text-stone-500 sm:block">{shopName}</p>
          ) : null}
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-ping-600 text-white" : "text-ping-800 hover:bg-ping-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

export function ClosePingFooter() {
  return (
    <footer className="border-t border-ping-100 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
        <ClosePingLogo className="text-ping-900" />
        <p className="text-sm text-stone-500">
          © {new Date().getFullYear()} {CLOSEPING.name}. Built for contractors who hate chasing.
        </p>
      </div>
    </footer>
  );
}
