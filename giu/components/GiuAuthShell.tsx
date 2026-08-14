"use client";

import Link from "next/link";
import { GIU_STRINGS } from "@/giu/lib/strings";

export function GiuAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="giu-app flex min-h-dvh flex-col bg-giu-bg text-giu-ink">
      <header className="sticky top-0 z-40 bg-giu-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[480px] items-center px-5 md:max-w-xl lg:max-w-2xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-giu-primary text-sm font-bold text-white">
              G
            </span>
            <p className="text-base font-bold text-giu-ink">{GIU_STRINGS.brand}</p>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
