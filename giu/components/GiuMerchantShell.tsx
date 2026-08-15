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
    <div className="giu-app flex min-h-dvh flex-col text-giu-ink">
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[52px] max-w-[480px] items-center justify-between px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={GIU_ROUTES.merchant.home} className="flex items-center gap-2.5">
            <span className="giu-brand-mark">G</span>
            <div className="leading-none">
              <p className="text-[17px] font-extrabold tracking-tight text-giu-ink">
                {GIU_STRINGS.brand}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-giu-muted">가게 관리</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {account ? (
              <span className="max-w-[100px] truncate text-[11px] font-semibold text-giu-ink">
                {account.name}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                void logout().then(() => {
                  window.location.href = GIU_ROUTES.auth;
                })
              }
              className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-giu-muted"
            >
              나가기
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
