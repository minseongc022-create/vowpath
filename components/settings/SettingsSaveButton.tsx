"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";

export function SettingsSaveButton({
  saving,
  saved,
  error,
  onSave,
  className = "",
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
  className?: string;
}) {
  const copy = useSettingsPage();

  return (
    <div className={`flex flex-col items-end gap-0.5 ${className}`}>
      {error ? (
        <p className="max-w-[12rem] text-right text-[10px] font-medium text-rose-700">{error}</p>
      ) : saved ? (
        <p className="text-[10px] font-medium text-emerald-700">{copy.saveAllSuccess}</p>
      ) : null}
      <button
        type="button"
        disabled={saving}
        data-haptic
        onClick={onSave}
        className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5"
      >
        {saving ? copy.saveAllSaving : copy.saveAllButton}
      </button>
    </div>
  );
}
