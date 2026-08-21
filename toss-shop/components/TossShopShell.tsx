"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TS_STRINGS } from "@/toss-shop/lib/strings";

function navClass(active: boolean): string {
  return active ? "ts-nav-item ts-nav-active" : "ts-nav-item";
}

export function TossShopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname.startsWith("/toss-shop/dashboard");

  async function logout() {
    await fetch("/api/toss-shop/auth/logout", { method: "POST" });
    router.push("/toss-shop/login");
    router.refresh();
  }

  return (
    <div className="toss-shop-app flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-ts-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/toss-shop" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ts-primary text-sm font-bold text-white">
              TS
            </span>
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight text-ts-ink">{TS_STRINGS.brand}</p>
              <p className="hidden text-xs text-ts-muted sm:block">토스쇼핑 셀러 도구</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {isDashboard ? (
              <>
                <Link href="/toss-shop/dashboard" className={navClass(pathname === "/toss-shop/dashboard")}>
                  {TS_STRINGS.navDashboard}
                </Link>
                <Link href="/toss-shop/dashboard/rankings" className={navClass(pathname.includes("/rankings"))}>
                  {TS_STRINGS.navRankings}
                </Link>
                <Link href="/toss-shop/dashboard/keywords" className={navClass(pathname.includes("/keywords"))}>
                  {TS_STRINGS.navKeywords}
                </Link>
                <Link href="/toss-shop/dashboard/competitors" className={navClass(pathname.includes("/competitors"))}>
                  {TS_STRINGS.navCompetitors}
                </Link>
                <Link href="/toss-shop/dashboard/settlements" className={navClass(pathname.includes("/settlements"))}>
                  {TS_STRINGS.navSettlements}
                </Link>
              </>
            ) : (
              <>
                <Link href="/toss-shop#features" className="ts-nav-item">기능</Link>
                <Link href="/toss-shop/login" className="ts-nav-item">{TS_STRINGS.navLogin}</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isDashboard ? (
              <button type="button" onClick={logout} className="ts-btn-secondary !py-2 text-xs">
                {TS_STRINGS.navLogout}
              </button>
            ) : (
              <Link href="/toss-shop/login" className="ts-btn-primary !py-2 text-xs">
                {TS_STRINGS.ctaStart}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ts-border bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-ts-muted">
          <p>{TS_STRINGS.footer}</p>
        </div>
      </footer>
    </div>
  );
}
