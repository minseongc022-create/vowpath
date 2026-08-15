"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";
import { useGiuAuth } from "./GiuAuthProvider";
import { CustomerAvailabilityAlerts } from "./CustomerAvailabilityAlerts";
import { GiuCustomerBottomNav } from "./GiuCustomerBottomNav";
import { GiuLocaleToggle, useGiuLocale } from "./GiuLocaleProvider";
import { GiuLogo } from "./GiuLogo";

export function GiuCustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { account, loading, logout } = useGiuAuth();
  const { locale } = useGiuLocale();
  const isMapHome = pathname === GIU_ROUTES.customer.boxes || pathname === `${GIU_ROUTES.customer.boxes}/`;
  const hideNav =
    (pathname.startsWith(`${GIU_ROUTES.customer.boxes}/`) && !isMapHome) ||
    pathname.startsWith("/giu/dat/");

  const displayName = account?.name?.trim() || t(locale, "guestName");

  return (
    <div className="giu-app flex min-h-dvh flex-col text-giu-ink">
      <CustomerAvailabilityAlerts />
      <header className="sticky top-0 z-40 border-b border-giu-border/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[54px] max-w-[480px] items-center justify-between gap-3 px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={GIU_ROUTES.customer.home} className="flex min-w-0 items-center gap-2.5">
            <GiuLogo size={36} priority />
            <span className="truncate text-[15px] font-extrabold tracking-tight text-giu-ink">
              {loading ? "…" : displayName}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <GiuLocaleToggle />
            {!loading && account ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-giu-muted"
              >
                {locale === "vi" ? "Thoát" : "나가기"}
              </button>
            ) : !loading ? (
              <Link
                href={`${GIU_ROUTES.auth}?role=customer`}
                className="rounded-full bg-giu-ink px-3 py-1.5 text-[11px] font-bold text-white"
              >
                {locale === "vi" ? "Đăng nhập" : "로그인"}
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main className={`flex-1 ${hideNav ? "pb-8" : isMapHome ? "pb-16" : "pb-20"}`}>
        {children}
      </main>
      {!hideNav ? <GiuCustomerBottomNav /> : null}
    </div>
  );
}
