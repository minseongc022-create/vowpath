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
              E
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-bold tracking-tight text-ts-ink sm:text-lg">
                {SP_STRINGS.brand}
              </p>
              <p className="hidden text-xs text-ts-muted sm:block">{SP_STRINGS.brandEn}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {/*
              메뉴는 둘뿐이다 — 자비스와 연동.
              나머지(발굴·키워드·랭킹·경쟁사·정산)는 전부 자비스가 알아서 하는
              일의 중간 결과였고, 사장님이 그 화면을 보고 할 수 있는 게 없었다.
              페이지는 그대로 살아있으니 필요해지면 그때 다시 꺼내면 된다.
            */}
            {isDashboard ? (
              <>
                <Link href={SP_ROUTES.dashboard} className={navClass(pathname === SP_ROUTES.dashboard)}>
                  자비스
                </Link>
                <Link href={SP_ROUTES.settings} className={navClass(pathname.includes("/settings"))}>
                  연동
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

      <footer className="border-t border-ts-border bg-ts-surface py-6">
        <div className="mx-auto max-w-6xl space-y-2 px-4 text-center text-[11px] leading-relaxed text-ts-muted">
          <p>{SP_STRINGS.footer}</p>
          <p>{SP_STRINGS.legalShort}</p>
        </div>
      </footer>
    </div>
  );
}
