"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";

export function GoLiveProgressCard({
  requiredDone,
  requiredTotal,
  progressPct,
  live,
}: {
  requiredDone: number;
  requiredTotal: number;
  progressPct: number;
  live: boolean;
}) {
  const settingsPage = useSettingsPage();

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        live
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white"
          : "border-brand-200 bg-gradient-to-br from-brand-50/70 via-white to-white"
      }`}
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="flex items-center gap-2 text-lg font-bold text-brand-950">
          <span aria-hidden>{live ? "✅" : "🎯"}</span>
          {live ? settingsPage.allDone : settingsPage.goLiveWelcome}
        </p>
        <p className="mt-2 text-base leading-relaxed text-stone-600">
          {live ? settingsPage.progressHint : settingsPage.goLiveWelcomeHint}
        </p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-700">
              {settingsPage.progressTitle
                .replace("{done}", String(requiredDone))
                .replace("{total}", String(requiredTotal))}
            </p>
            <p className="mt-1 text-sm text-stone-500">{settingsPage.progressHint}</p>
          </div>
          <span
            className={`text-3xl font-bold tabular-nums ${
              live ? "text-emerald-700" : "text-brand-700"
            }`}
          >
            {progressPct}%
          </span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-stone-200/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              live ? "bg-emerald-500" : "bg-brand-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
