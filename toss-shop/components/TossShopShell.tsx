"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";
import { DashboardMobileNav } from "@/toss-shop/components/layout/DashboardLayout";

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
      <header className="sticky top-0 z-50 border-b border-ts-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
          <Link href={SP_ROUTES.home} className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ts-primary text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm">
              SP
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-bold tracking-tight text-ts-ink sm:text-lg">
                {SP_STRINGS.brand}
              </p>
              <p className="hidden text-xs text-ts-muted sm:block">{SP_STRINGS.brandEn}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
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

          <div className="flex shrink-0 items-center gap-2">
            {isDashboard ? (
              <button type="button" onClick={logout} className="ts-btn-secondary !min-h-[36px] !px-3 !py-1.5 text-xs">
                {SP_STRINGS.navLogout}
              </button>
            ) : (
              <Link href={SP_ROUTES.login} className="ts-btn-primary !min-h-[36px] !px-3 !py-1.5 text-xs">
                시작
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {isDashboard && <DashboardMobileNav />}

      <footer className="border-t border-ts-border bg-white py-5">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-ts-muted">
          <p>{SP_STRINGS.footer}</p>
        </div>
      </footer>
    </div>
  );
}
