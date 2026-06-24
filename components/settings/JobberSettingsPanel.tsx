"use client";

import { JobberConnect } from "@/components/dashboard/JobberConnect";
import { useSettingsPage } from "@/components/providers/LocaleProvider";

const SYNC_ITEMS = [
  { key: "requests", icon: "📋" },
  { key: "schedule", icon: "📅" },
  { key: "optional", icon: "🔗" },
] as const;

export function JobberSettingsPanel({
  onStatusChange,
  connected,
  stepDone,
  onConfirm,
  onSkip,
  showConfirm,
}: {
  onStatusChange: (connected: boolean, meta?: { freshConnect?: boolean }) => void;
  connected: boolean;
  stepDone: boolean;
  onConfirm: () => void;
  onSkip: () => void;
  showConfirm: boolean;
}) {
  const settingsPage = useSettingsPage();
  const copy = settingsPage.jobberPanel;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-brand-200/80 bg-gradient-to-br from-white via-brand-50/30 to-white shadow-sm">
        <div className="border-b border-brand-100 bg-white/80 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d3855] text-lg font-bold text-white shadow-md">
                J
              </span>
              <div>
                <p className="text-lg font-bold text-brand-950">Jobber</p>
                <p className="text-base text-stone-600">{copy.tagline}</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                connected
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {connected ? copy.statusConnected : copy.statusOptional}
            </span>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-3 sm:px-6">
          {SYNC_ITEMS.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-brand-100 bg-white px-4 py-3.5 shadow-sm"
            >
              <p className="text-2xl" aria-hidden>
                {item.icon}
              </p>
              <p className="mt-2 text-base font-semibold text-brand-950">
                {copy.features[item.key].title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                {copy.features[item.key].body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-200/70 bg-white p-5 shadow-sm sm:p-6">
        <p className="vow-settings-label">{copy.connectTitle}</p>
        <p className="vow-settings-hint mt-1">{settingsPage.jobberScheduleAutoNote}</p>
        <div className="mt-4">
          <JobberConnect embedded variant="settings" onStatusChange={onStatusChange} />
        </div>
      </div>

      {stepDone ? null : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {showConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              className="hvac-btn-primary flex-1 px-4 py-3.5 text-base"
            >
              {settingsPage.jobberConfirm}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base font-semibold text-stone-700 hover:bg-stone-50"
          >
            {settingsPage.jobberSkip}
          </button>
        </div>
      )}
    </div>
  );
}
