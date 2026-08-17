"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GIU_ROUTES,
  isGiuMapHomePath,
  toGiuInternalPath,
} from "@/giu/lib/routes";
import { t, welcomeMessage } from "@/giu/lib/i18n";
import { useGiuAuth } from "./GiuAuthProvider";
import { CustomerAvailabilityAlerts } from "./CustomerAvailabilityAlerts";
import { GiuCustomerBottomNav } from "./GiuCustomerBottomNav";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

export function GiuCustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const href = useGiuHref();
  const { account, loading, logout } = useGiuAuth();
  const { locale } = useGiuLocale();
  const internal = toGiuInternalPath(pathname);
  const isMapHome = isGiuMapHomePath(pathname);
  const hideNav =
    (internal.startsWith("/giu/hop/") && !isMapHome) || internal.startsWith("/giu/dat/");

  const displayName = account?.name?.trim() || t(locale, "guestName");
  const headerText =
    !loading && account ? welcomeMessage(locale, "customer", displayName) : displayName;

  return (
    <div
      className={`giu-app flex flex-col text-giu-ink ${
        isMapHome ? "giu-map-shell overflow-hidden" : "min-h-svh"
      }`}
    >
      <CustomerAvailabilityAlerts />
      <header className="sticky top-0 z-40 shrink-0 border-b border-giu-border/60 bg-giu-accent-soft/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[54px] max-w-[480px] items-center justify-between gap-3 px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={href(GIU_ROUTES.customer.home)} className="min-w-0 truncate">
            <span className="text-[15px] font-extrabold tracking-tight text-giu-primary">
              {loading ? "…" : headerText}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
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
                href={`${href(GIU_ROUTES.auth)}?role=customer`}
                className="rounded-full bg-giu-primary px-3 py-1.5 text-[11px] font-bold text-giu-accent"
              >
                로그인
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main
        className={
          isMapHome
            ? "min-h-0 flex-1 overflow-hidden"
            : hideNav
              ? "flex-1 pb-8"
              : "flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
        }
      >
        {children}
      </main>
      {!hideNav ? <GiuCustomerBottomNav docked={isMapHome} /> : null}
    </div>
  );
}
