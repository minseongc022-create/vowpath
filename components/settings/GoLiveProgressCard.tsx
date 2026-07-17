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
      <div className="px-3 py-3 sm:px-6 sm:py-5">
        <p className="flex items-center gap-2 text-base font-bold text-brand-950 sm:text-lg">
          <span aria-hidden>{live ? "✅" : "🎯"}</span>
          {live ? settingsPage.allDone : settingsPage.goLiveWelcome}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600 sm:mt-2 sm:text-base">
          {live ? settingsPage.progressHint : settingsPage.goLiveWelcomeHint}
        </p>
        <div className="mt-2.5 flex items-end justify-between gap-3 sm:mt-4 sm:gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-700">
              {settingsPage.progressTitle
                .replace("{done}", String(requiredDone))
                .replace("{total}", String(requiredTotal))}
            </p>
            <p className="mt-0.5 text-xs text-stone-500 sm:text-sm">{settingsPage.progressHint}</p>
          </div>
          <span
            className={`text-2xl font-bold tabular-nums sm:text-3xl ${
              live ? "text-emerald-700" : "text-brand-700"
            }`}
          >
            {progressPct}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-stone-200/80 sm:mt-4 sm:h-2.5">
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
