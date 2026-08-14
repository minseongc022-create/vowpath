"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GIU_STRINGS } from "@/giu/lib/strings";
import { useGiuAuth } from "./GiuAuthProvider";
import { GiuBottomNav } from "./GiuBottomNav";

export function GiuHeader() {
  const pathname = usePathname();
  const { account, loading } = useGiuAuth();
  const isHome = pathname === "/giu" || pathname === "/giu/";

  return (
    <header className="sticky top-0 z-40 bg-giu-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-5 md:max-w-xl lg:max-w-2xl">
        <Link href="/giu" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-giu-primary text-sm font-bold text-white">
            G
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold text-giu-ink">{GIU_STRINGS.brand}</p>
            {!isHome ? (
              <p className="text-[11px] text-giu-muted">{GIU_STRINGS.city}</p>
            ) : null}
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {!loading && account ? (
            <Link
              href={account.role === "merchant" ? "/giu/cua-hang/panel" : "/giu/ma-cua-toi"}
              className="max-w-[100px] truncate rounded-full bg-giu-bg px-3 py-1.5 text-xs font-semibold text-giu-ink"
            >
              {account.name}
            </Link>
          ) : !loading ? (
            <Link
              href="/giu/dang-nhap"
              className="rounded-full bg-giu-bg px-3 py-1.5 text-xs font-semibold text-giu-ink"
            >
              로그인
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function GiuShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="giu-app flex min-h-dvh flex-col bg-giu-bg text-giu-ink">
      <GiuHeader />
      <main className="flex-1">{children}</main>
      <GiuBottomNav />
    </div>
  );
}
