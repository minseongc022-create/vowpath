"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GIU_STRINGS } from "@/giu/lib/strings";

function navClass(active: boolean): string {
  return active
    ? "rounded-lg px-3 py-2 text-sm font-medium bg-giu-primary/10 text-giu-primary"
    : "rounded-lg px-3 py-2 text-sm font-medium text-giu-muted hover:bg-giu-surface hover:text-giu-ink";
}

const NAV = [
  { href: "/giu", label: GIU_STRINGS.navHome },
  { href: "/giu/hop", label: GIU_STRINGS.navBoxes },
  { href: "/giu/cua-hang", label: GIU_STRINGS.navMerchants },
  { href: "/giu/ma-cua-toi", label: GIU_STRINGS.navMy },
];

export function GiuHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-giu-border/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/giu" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-giu-primary text-lg font-bold text-white">
            G
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-tight text-giu-ink">{GIU_STRINGS.brand}</p>
            <p className="hidden text-xs text-giu-muted sm:block">{GIU_STRINGS.city}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navClass(
                pathname === item.href ||
                  (item.href !== "/giu" && pathname.startsWith(item.href)),
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/giu/cua-hang"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-giu-muted hover:text-giu-ink sm:inline-flex"
          >
            {GIU_STRINGS.ctaMerchant}
          </Link>
          <Link
            href="/giu/hop"
            className="rounded-xl bg-giu-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-giu-accent-hover"
          >
            {GIU_STRINGS.ctaBrowse}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function GiuFooter() {
  return (
    <footer className="border-t border-giu-border bg-giu-surface py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-giu-muted">
        <p>{GIU_STRINGS.footer}</p>
        <p className="mt-1">{GIU_STRINGS.commissionNote}</p>
        <p className="mt-3 print:hidden">
          <Link href="/giu/ban-hang" className="text-xs text-giu-muted/70 hover:text-giu-primary">
            Sales kit
          </Link>
        </p>
      </div>
    </footer>
  );
}

export function GiuShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="giu-app flex min-h-screen flex-col bg-giu-bg text-giu-ink">
      <GiuHeader />
      <main className="flex-1">{children}</main>
      <GiuFooter />
    </div>
  );
}
