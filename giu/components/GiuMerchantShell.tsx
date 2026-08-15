"use client";

import Link from "next/link";
import { Suspense } from "react";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { useGiuAuth } from "./GiuAuthProvider";
import { GiuMerchantBottomNav } from "./GiuMerchantBottomNav";
import { GiuLogo } from "./GiuLogo";

export function GiuMerchantShell({ children }: { children: React.ReactNode }) {
  const { account, merchant, logout } = useGiuAuth();
  const storeName = merchant?.name?.trim() || account?.name?.trim() || "가게";

  return (
    <div className="giu-app flex min-h-dvh flex-col text-giu-ink">
      <header className="sticky top-0 z-40 border-b border-giu-border/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[54px] max-w-[480px] items-center justify-between gap-3 px-4 md:max-w-xl lg:max-w-2xl">
          <Link href={GIU_ROUTES.merchant.home} className="flex min-w-0 items-center gap-2.5">
            <GiuLogo size={36} priority />
            <span className="truncate text-[15px] font-extrabold tracking-tight text-giu-ink">
              {storeName}
            </span>
          </Link>

          <button
            type="button"
            onClick={() =>
              void logout().then(() => {
                window.location.href = GIU_ROUTES.auth;
              })
            }
            className="shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-giu-muted"
          >
            나가기
          </button>
        </div>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <Suspense fallback={null}>
        <GiuMerchantBottomNav />
      </Suspense>
    </div>
  );
}
