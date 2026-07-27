import Link from "next/link";
import { SITE } from "@/lib/types";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg chrome-border bg-ink-950">
        <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-white">{SITE.name}</span>
    </Link>
  );
}

export function MarketingNav({ loggedIn }: { loggedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-ink-300 sm:flex">
          <a href="#how" className="transition hover:text-white">
            How it works
          </a>
          <Link href="/pricing" className="transition hover:text-white">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link href="/app" className="btn-chrome !px-4 !py-2 text-xs">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-ink-300 hover:text-white sm:inline">
                Log in
              </Link>
              <Link href="/signup" className="btn-chrome !px-4 !py-2 text-xs">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
        <Logo />
        <p className="text-xs text-ink-500">
          © {new Date().getFullYear()} {SITE.name}. Independent product — not affiliated with Effiroad.
        </p>
      </div>
    </footer>
  );
}

export function AppShell({
  children,
  shopName,
}: {
  children: React.ReactNode;
  shopName?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/5 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          {shopName ? <p className="truncate text-xs text-ink-400">{shopName}</p> : null}
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-3">
          {[
            { href: "/app", label: "Overview" },
            { href: "/app/quotes", label: "Quotes" },
            { href: "/app/settings", label: "Settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
