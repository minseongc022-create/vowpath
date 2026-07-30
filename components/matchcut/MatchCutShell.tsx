"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export function MatchCutLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-bold tracking-tight ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-trust-500 text-sm font-bold text-white">
        M
      </span>
      <span>
        매칭컷
        <span className="ml-1.5 text-xs font-medium text-trust-500">MatchCut</span>
      </span>
    </span>
  );
}

export function MatchCutMarketingHeader({
  session,
}: {
  session?: { email: string; displayName?: string } | null;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-trust-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
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
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href={MATCHCUT_ROUTES.app}
              className="rounded-xl bg-trust-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trust-700"
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
                className="rounded-xl bg-trust-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-trust-700"
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href={MATCHCUT_ROUTES.app}>
            <MatchCutLogo className="text-base text-slate-900" />
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm sm:gap-4">
            <Link
              href={MATCHCUT_ROUTES.app}
              className={
                pathname === MATCHCUT_ROUTES.app
                  ? "font-semibold text-trust-700"
                  : "text-slate-600 hover:text-trust-700"
              }
            >
              스튜디오
            </Link>
            <Link
              href={MATCHCUT_ROUTES.adCard}
              className={
                pathname === MATCHCUT_ROUTES.adCard
                  ? "font-semibold text-trust-700"
                  : "text-slate-600 hover:text-trust-700"
              }
            >
              광고카드
            </Link>
            <Link
              href={MATCHCUT_ROUTES.markets}
              className={
                pathname === MATCHCUT_ROUTES.markets
                  ? "font-semibold text-trust-700"
                  : "text-slate-600 hover:text-trust-700"
              }
            >
              마켓등록
            </Link>
            <Link
              href={MATCHCUT_ROUTES.projects}
              className={
                pathname === MATCHCUT_ROUTES.projects
                  ? "font-semibold text-trust-700"
                  : "text-slate-600 hover:text-trust-700"
              }
            >
              프로젝트
            </Link>
            <Link
              href={MATCHCUT_ROUTES.credits}
              className={
                pathname === MATCHCUT_ROUTES.credits
                  ? "font-semibold text-trust-700"
                  : "text-slate-600 hover:text-trust-700"
              }
            >
              크레딧
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {typeof credits === "number" && (
              <span className="rounded-full bg-trust-100 px-3 py-1 text-xs font-semibold text-trust-800">
                {credits.toLocaleString()} 크레딧
              </span>
            )}
            <span className="hidden text-xs text-slate-500 sm:inline">{displayName}</span>
            <form action="/api/matchcut/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={async (e) => {
                  e.preventDefault();
                  await fetch("/api/matchcut/auth/logout", { method: "POST" });
                  window.location.href = MATCHCUT_ROUTES.home;
                }}
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
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
