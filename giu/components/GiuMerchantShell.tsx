"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { GiuQrScanIcon } from "@/giu/components/GiuQrScanIcon";
import { MerchantPickupProvider, useMerchantPickupOptional } from "@/giu/components/MerchantPickupProvider";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t, welcomeMessage } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { GiuMerchantBottomNav } from "./GiuMerchantBottomNav";
import { useGiuHref } from "./GiuNavProvider";

function MerchantHeaderQrButton({ locale }: { locale: GiuLocale }) {
  const pickup = useMerchantPickupOptional();
  if (!pickup) return null;

  return (
    <button
      type="button"
      onClick={() => pickup.openPickupSheet("qr")}
      className="giu-btn-3d giu-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-giu-primary text-giu-accent shadow-[0_4px_16px_rgba(45,70,40,0.2)] ring-2 ring-white"
      aria-label={t(locale, "pickupScanStart")}
    >
      <GiuQrScanIcon className="h-[22px] w-[22px]" />
    </button>
  );
}

function MerchantShellInner({ children }: { children: React.ReactNode }) {
  const { account } = useGiuAuth();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const pathname = usePathname();
  const displayName = account?.name?.trim() || t(locale, "mStoreFallback");
  const headerText = welcomeMessage(locale, "merchant", displayName);
  const showQr = Boolean(account) && pathname.includes("/panel");

  return (
    <div className="giu-app flex min-h-svh flex-col text-giu-ink">
      <header className="sticky top-0 z-40 border-b border-giu-border/60 bg-giu-accent-soft/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[54px] max-w-[480px] items-center justify-between gap-3 px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={href(GIU_ROUTES.merchant.home)} className="min-w-0 flex-1 truncate">
            <span className="text-[15px] font-extrabold tracking-tight text-giu-primary">
              {headerText}
            </span>
          </Link>

          {showQr ? (
            <MerchantHeaderQrButton locale={locale} />
          ) : (
            <span className="h-10 w-10 shrink-0" aria-hidden />
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 md:max-w-xl lg:max-w-2xl">
        {children}
      </main>
      <Suspense fallback={null}>
        <GiuMerchantBottomNav />
      </Suspense>
    </div>
  );
}

export function GiuMerchantShell({ children }: { children: React.ReactNode }) {
  const { merchant } = useGiuAuth();
  const { locale } = useGiuLocale();
  const pathname = usePathname();
  const pickupEnabled = Boolean(merchant) && pathname.includes("/panel");

  return (
    <MerchantPickupProvider locale={locale} enabled={pickupEnabled}>
      <MerchantShellInner>{children}</MerchantShellInner>
    </MerchantPickupProvider>
  );
}
