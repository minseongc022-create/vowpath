"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useIsEnglishUi } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isEnglish = useIsEnglishUi();

  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="vow-dash flex min-h-screen items-center justify-center px-4">
      <div className="vow-dash-card max-w-md text-center">
        <BrandLogo variant="light" size="md" href={ROUTES.dashboard} className="mx-auto justify-center" />
        <h1 className="mt-6 text-xl font-bold text-white">
          {isEnglish ? "Could not load dashboard" : "대시보드를 불러오지 못했습니다"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {isEnglish
            ? "This may be a temporary issue. Refresh the page or try again in a moment."
            : "일시적인 문제일 수 있습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해 주세요."}
        </p>
        {error.message ? (
          <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-rose-300/90">
            {error.message}
          </p>
        ) : null}
        {error.digest ? (
          <p className="mt-3 font-mono text-[10px] text-slate-600">ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => reset()} className="vow-dash-btn-primary px-6">
            {isEnglish ? "Try again" : "다시 시도"}
          </button>
          <Link
            href={ROUTES.dashboard}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.04]"
          >
            {isEnglish ? "Dashboard home" : "대시보드 홈"}
          </Link>
        </div>
      </div>
    </div>
  );
}
