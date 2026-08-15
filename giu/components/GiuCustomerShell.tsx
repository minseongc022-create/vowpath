"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { GIU_STRINGS } from "@/giu/lib/strings";
import { useGiuAuth } from "./GiuAuthProvider";
import { CustomerAvailabilityAlerts } from "./CustomerAvailabilityAlerts";
import { GiuCustomerBottomNav } from "./GiuCustomerBottomNav";
import { GiuLocaleToggle } from "./GiuLocaleProvider";

export function GiuCustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { account, loading, logout } = useGiuAuth();
  const hideNav =
    (pathname.startsWith(`${GIU_ROUTES.customer.boxes}/`) &&
      pathname !== GIU_ROUTES.customer.boxes) ||
    pathname.startsWith("/giu/dat/");

  return (
    <div className="giu-app flex min-h-dvh flex-col text-giu-ink">
      <CustomerAvailabilityAlerts />
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[52px] max-w-[480px] items-center justify-between px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={GIU_ROUTES.customer.home} className="flex items-center gap-2.5">
            <span className="giu-brand-mark">G</span>
            <div className="leading-none">
              <p className="text-[17px] font-extrabold tracking-tight text-giu-ink">
                {GIU_STRINGS.brand}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-giu-muted">호치민 음식 구출</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5">
            <GiuLocaleToggle />
            {!loading && account ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-giu-muted"
              >
                나가기
              </button>
            ) : !loading ? (
              <Link
                href={GIU_ROUTES.auth}
                className="rounded-full bg-giu-ink px-3 py-1.5 text-[11px] font-bold text-white"
              >
                로그인
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main className={`flex-1 ${hideNav ? "pb-8" : "pb-20"}`}>{children}</main>
      {!hideNav ? <GiuCustomerBottomNav /> : null}
    </div>
  );
}
