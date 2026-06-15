"use client";

import dynamic from "next/dynamic";

const DashboardView = dynamic(
  () =>
    import("@/components/dashboard/DashboardView").then((mod) => ({
      default: mod.DashboardView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-[1400px] animate-pulse space-y-6" aria-busy="true">
        <div className="h-10 w-72 max-w-full rounded-lg bg-white/[0.06]" />
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-40 rounded-xl bg-white/[0.06]" />
          <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
          <div className="h-10 w-28 rounded-xl bg-white/[0.06]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white/[0.06]" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-white/[0.06]" />
      </div>
    ),
  },
);

export function DashboardPageClient() {
  return <DashboardView />;
}
