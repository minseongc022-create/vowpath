"use client";

import { GiuLogo } from "./GiuLogo";

export function GiuAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="giu-app flex min-h-dvh flex-col text-giu-ink">
      <header className="sticky top-0 z-40 border-b border-giu-border/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[54px] max-w-[480px] items-center px-4 md:max-w-xl lg:max-w-2xl">
          <GiuLogo size={36} priority />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
