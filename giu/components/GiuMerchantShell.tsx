"use client";

import Link from "next/link";
import { Suspense } from "react";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { GIU_STRINGS } from "@/giu/lib/strings";
import { useGiuAuth } from "./GiuAuthProvider";
import { GiuMerchantBottomNav } from "./GiuMerchantBottomNav";

export function GiuMerchantShell({ children }: { children: React.ReactNode }) {
  const { account, logout } = useGiuAuth();

  return (
    <div className="giu-app flex min-h-dvh flex-col bg-giu-bg text-giu-ink">
      <header className="sticky top-0 z-40 bg-giu-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-5 md:max-w-xl lg:max-w-2xl">
          <Link href={GIU_ROUTES.merchant.home} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-giu-primary text-sm font-bold text-white">
              G
            </span>
            <div className="leading-tight">
              <p className="text-base font-bold text-giu-ink">{GIU_STRINGS.brand}</p>
              <p className="text-[11px] text-giu-muted">가게</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {account ? (
              <span className="max-w-[100px] truncate text-xs font-semibold text-giu-ink">
                {account.name}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void logout().then(() => {
                window.location.href = GIU_ROUTES.auth;
              })}
              className="rounded-full bg-giu-bg px-3 py-1.5 text-xs font-semibold text-giu-muted"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <Suspense fallback={null}>
        <GiuMerchantBottomNav />
      </Suspense>
    </div>
  );
}
