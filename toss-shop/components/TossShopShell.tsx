"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

function navClass(active: boolean): string {
  return active ? "ts-nav-item ts-nav-active" : "ts-nav-item";
}

export function TossShopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname.startsWith(SP_ROUTES.dashboard);

  async function logout() {
    await fetch("/api/toss-shop/auth/logout", { method: "POST" });
    router.push(SP_ROUTES.login);
    router.refresh();
  }

  return (
    <div className="toss-shop-app flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-ts-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href={SP_ROUTES.home} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ts-primary text-sm font-bold text-white">
              SP
            </span>
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight text-ts-ink">{SP_STRINGS.brand}</p>
              <p className="hidden text-xs text-ts-muted sm:block">{SP_STRINGS.brandEn}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {isDashboard ? (
              <>
                <Link href={SP_ROUTES.dashboard} className={navClass(pathname === SP_ROUTES.dashboard)}>
                  {SP_STRINGS.navDashboard}
                </Link>
                <Link href={SP_ROUTES.rankings} className={navClass(pathname.includes("/rankings"))}>
                  {SP_STRINGS.navRankings}
                </Link>
                <Link href={SP_ROUTES.keywords} className={navClass(pathname.includes("/keywords"))}>
                  {SP_STRINGS.navKeywords}
                </Link>
                <Link href={SP_ROUTES.competitors} className={navClass(pathname.includes("/competitors"))}>
                  {SP_STRINGS.navCompetitors}
                </Link>
                <Link href={SP_ROUTES.settlements} className={navClass(pathname.includes("/settlements"))}>
                  {SP_STRINGS.navSettlements}
                </Link>
                <Link href={SP_ROUTES.settings} className={navClass(pathname.includes("/settings"))}>
                  설정
                </Link>
              </>
            ) : (
              <>
                <Link href={`${SP_ROUTES.home}#features`} className="ts-nav-item">
                  기능
                </Link>
                <Link href={SP_ROUTES.login} className="ts-nav-item">
                  {SP_STRINGS.navLogin}
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isDashboard ? (
              <button type="button" onClick={logout} className="ts-btn-secondary !py-2 text-xs">
                {SP_STRINGS.navLogout}
              </button>
            ) : (
              <Link href={SP_ROUTES.login} className="ts-btn-primary !py-2 text-xs">
                {SP_STRINGS.ctaStart}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ts-border bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-ts-muted">
          <p>{SP_STRINGS.footer}</p>
          <p className="mt-1">{SP_STRINGS.syncInterval}</p>
        </div>
      </footer>
    </div>
  );
}
