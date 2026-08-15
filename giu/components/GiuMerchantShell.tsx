"use client";

import Link from "next/link";
import { Suspense } from "react";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";
import { useGiuAuth } from "./GiuAuthProvider";
import { GiuLocaleToggle, useGiuLocale } from "./GiuLocaleProvider";
import { GiuMerchantBottomNav } from "./GiuMerchantBottomNav";
import { GiuLogo } from "./GiuLogo";

export function GiuMerchantShell({ children }: { children: React.ReactNode }) {
  const { account, merchant, logout } = useGiuAuth();
  const { locale } = useGiuLocale();
  const storeName =
    merchant?.name?.trim() || account?.name?.trim() || t(locale, "mStoreFallback");

  return (
    <div className="giu-app flex min-h-svh flex-col text-giu-ink">
      <header className="sticky top-0 z-40 border-b border-giu-border/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[54px] max-w-[480px] items-center justify-between gap-3 px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={GIU_ROUTES.merchant.home} className="flex min-w-0 items-center gap-2.5">
            <GiuLogo size={36} priority />
            <span className="truncate text-[15px] font-extrabold tracking-tight text-giu-ink">
              {storeName}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <GiuLocaleToggle />
            <button
              type="button"
              onClick={() =>
                void logout().then(() => {
                  window.location.href = `${GIU_ROUTES.auth}?role=merchant`;
                })
              }
              className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-giu-muted"
            >
              {t(locale, "logout")}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-3 md:max-w-xl lg:max-w-2xl">
        {children}
      </main>
      <Suspense fallback={null}>
        <GiuMerchantBottomNav />
      </Suspense>
    </div>
  );
}
