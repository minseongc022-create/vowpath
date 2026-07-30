"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export function MatchCutLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-trust-500 text-sm font-bold text-white sm:h-9 sm:w-9 sm:rounded-2xl">
        M
      </span>
      <span className="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
        <span className="truncate text-[15px] sm:text-base">매칭컷</span>
        <span className="text-[10px] font-medium text-trust-500 sm:text-xs">MatchCut</span>
      </span>
    </span>
  );
}

const APP_NAV = [
  { href: MATCHCUT_ROUTES.app, label: "스튜디오" },
  { href: MATCHCUT_ROUTES.adCard, label: "광고카드" },
  { href: MATCHCUT_ROUTES.markets, label: "마켓등록" },
  { href: MATCHCUT_ROUTES.projects, label: "프로젝트" },
  { href: MATCHCUT_ROUTES.credits, label: "크레딧" },
] as const;

function navClass(active: boolean) {
  return active
    ? "font-semibold text-trust-700"
    : "text-slate-600 hover:text-trust-700";
}

export function MatchCutMarketingHeader({
  session,
}: {
  session?: { email: string; displayName?: string } | null;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-trust-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-5">
        <Link href={MATCHCUT_ROUTES.home}>
          <MatchCutLogo className="text-slate-900" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 sm:flex">
          <a href="#how" className="hover:text-trust-700">
            사용법
          </a>
          <Link href={MATCHCUT_ROUTES.pricing} className="hover:text-trust-700">
            요금제
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <Link
              href={MATCHCUT_ROUTES.app}
              className="rounded-xl bg-trust-600 px-3 py-2 text-sm font-semibold text-white hover:bg-trust-700 sm:px-4"
            >
              스튜디오
            </Link>
          ) : (
            <>
              <Link
                href={MATCHCUT_ROUTES.login}
                className="hidden text-sm font-medium text-slate-600 hover:text-trust-700 sm:inline"
              >
                로그인
              </Link>
              <Link
                href={MATCHCUT_ROUTES.signup}
                className="rounded-xl bg-trust-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-trust-700 sm:px-4"
              >
                무료 시작
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function MatchCutAppShell({
  children,
  displayName,
  credits,
}: {
  children: React.ReactNode;
  displayName?: string;
  credits?: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const logout = async () => {
    await fetch("/api/matchcut/auth/logout", { method: "POST" });
    window.location.href = MATCHCUT_ROUTES.home;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href={MATCHCUT_ROUTES.app} className="min-w-0 shrink">
            <MatchCutLogo className="text-slate-900" />
          </Link>

          <nav className="ml-auto hidden items-center gap-4 text-sm md:flex">
            {APP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navClass(pathname === item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-3">
            {typeof credits === "number" && (
              <Link
                href={MATCHCUT_ROUTES.credits}
                className="rounded-full bg-trust-100 px-2.5 py-1 text-[11px] font-semibold text-trust-800 sm:px-3 sm:text-xs"
              >
                {credits.toLocaleString()}
                <span className="ml-0.5 font-medium">크레딧</span>
              </Link>
            )}
            <span className="hidden text-xs text-slate-500 lg:inline">{displayName}</span>
            <button
              type="button"
              className="hidden text-xs text-slate-500 hover:text-slate-800 md:inline"
              onClick={() => void logout()}
            >
              로그아웃
            </button>
            <button
              type="button"
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <span className="text-lg leading-none">×</span>
              ) : (
                <span className="flex flex-col gap-1.5">
                  <span className="block h-0.5 w-4 bg-slate-700" />
                  <span className="block h-0.5 w-4 bg-slate-700" />
                  <span className="block h-0.5 w-4 bg-slate-700" />
                </span>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {APP_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 text-sm ${navClass(pathname === item.href)}`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                className="rounded-lg px-3 py-2.5 text-left text-sm text-slate-500"
                onClick={() => void logout()}
              >
                로그아웃{displayName ? ` · ${displayName}` : ""}
              </button>
            </nav>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}

export function MatchCutFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-5 text-center text-sm text-slate-500">
        <MatchCutLogo className="justify-center text-slate-800" />
        <p className="mt-4">해외 소싱 셀러를 위한 실사진·URL 옵션 매칭 + 상세컷 AI</p>
        <p className="mt-2 text-xs">© {new Date().getFullYear()} MatchCut · Effiroad와 별도 서비스</p>
      </div>
    </footer>
  );
}
