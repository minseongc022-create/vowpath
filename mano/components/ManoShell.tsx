"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MANO_STRINGS } from "@/mano/lib/strings";

function navClass(active: boolean): string {
  return active
    ? "rounded-lg px-3 py-2 text-sm font-medium bg-mano-primary/10 text-mano-primary"
    : "rounded-lg px-3 py-2 text-sm font-medium text-mano-muted hover:bg-mano-surface hover:text-mano-ink";
}

const NAV = [
  { href: "/mano", label: MANO_STRINGS.navHome },
  { href: "/mano/solicitar", label: MANO_STRINGS.navRequest },
  { href: "/mano/profesionales", label: MANO_STRINGS.navProviders },
  { href: "/mano/mis-solicitudes", label: MANO_STRINGS.navMyRequests },
];

export function ManoHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-mano-border/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/mano" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mano-primary text-lg font-bold text-white">
            M
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-tight text-mano-ink">{MANO_STRINGS.brand}</p>
            <p className="hidden text-xs text-mano-muted sm:block">{MANO_STRINGS.city}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navClass(
                pathname === item.href ||
                  (item.href !== "/mano" && pathname.startsWith(item.href)),
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/mano/profesional"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-mano-muted hover:text-mano-ink sm:inline-flex"
          >
            {MANO_STRINGS.ctaProvider}
          </Link>
          <Link
            href="/mano/solicitar"
            className="rounded-xl bg-mano-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-mano-accent-hover"
          >
            {MANO_STRINGS.ctaRequest}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function ManoFooter() {
  return (
    <footer className="border-t border-mano-border bg-mano-surface py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-mano-muted">
        <p>{MANO_STRINGS.footer}</p>
        <p className="mt-1">{MANO_STRINGS.commissionNote}</p>
      </div>
    </footer>
  );
}

export function ManoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mano-app flex min-h-screen flex-col bg-mano-bg text-mano-ink">
      <ManoHeader />
      <main className="flex-1">{children}</main>
      <ManoFooter />
    </div>
  );
}
