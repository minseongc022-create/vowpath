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
import {
  GiuCustomerNavProvider,
  GiuCustomerPageTransition,
} from "./GiuCustomerNavProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";
import { JiucuSvg } from "./jiucu/JiucuSvg";

export function GiuCustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const href = useGiuHref();
  const { account, loading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const internal = toGiuInternalPath(pathname);
  const isMapHome = isGiuMapHomePath(pathname);
  const hideNav =
    (internal.startsWith("/giu/hop/") && !isMapHome) || internal.startsWith("/giu/dat/");

  const displayName = account?.name?.trim() || t(locale, "guestName");
  const headerText =
    !loading && account ? welcomeMessage(locale, "customer", displayName) : displayName;

  return (
    <GiuCustomerNavProvider>
    <div
      className={`giu-app flex flex-col text-giu-ink ${
        isMapHome ? "giu-map-shell overflow-hidden" : "min-h-svh"
      }`}
    >
      <CustomerAvailabilityAlerts />
      <header className="sticky top-0 z-40 shrink-0 border-b border-giu-border bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[54px] max-w-[480px] items-center justify-between gap-3 px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={href(GIU_ROUTES.customer.home)} className="giu-link-plain flex min-w-0 items-center gap-2 truncate">
            <JiucuSvg variant="default" className="h-7 w-7 shrink-0" />
            <span className="truncate text-[15px] font-extrabold tracking-tight text-giu-primary">
              {loading ? "…" : headerText}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            {!loading && !account ? (
              <Link
                href={`${href(GIU_ROUTES.auth)}?role=customer`}
                className="giu-btn-3d giu-tap rounded-full bg-giu-primary px-3 py-1.5 text-[11px] font-bold text-white"
              >
                로그인
              </Link>
            ) : (
              <span className="h-9 w-9 shrink-0" aria-hidden />
            )}
          </div>
        </div>
      </header>
      <main
        className={
          isMapHome
            ? "giu-tab-stage flex min-h-0 flex-1 flex-col overflow-hidden"
            : hideNav
              ? "giu-tab-stage flex-1 overflow-x-hidden pb-8"
              : "giu-tab-stage flex-1 overflow-x-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))]"
        }
      >
        <GiuCustomerPageTransition>{children}</GiuCustomerPageTransition>
      </main>
      {!hideNav ? <GiuCustomerBottomNav docked={isMapHome} /> : null}
    </div>
    </GiuCustomerNavProvider>
  );
}
