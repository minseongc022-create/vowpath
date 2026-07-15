"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="vow-dash vow-dash-error">
      <div className="vow-dash-card max-w-md text-center">
        <h1 className="text-xl font-bold text-white">Could not load dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          This may be a temporary issue. Refresh the page or try again in a moment.
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
            Try again
          </button>
          <Link
            href={ROUTES.dashboard}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.04]"
          >
            Dashboard home
          </Link>
        </div>
      </div>
    </div>
  );
}
