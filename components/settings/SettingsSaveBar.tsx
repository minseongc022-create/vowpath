"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";

export function SettingsSaveBar({
  saving,
  saved,
  error,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}) {
  const copy = useSettingsPage();

  return (
    <div className="vow-settings-save-bar sticky bottom-0 z-10 -mx-5 border-t border-stone-200/90 bg-white/95 px-5 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
      {error ? (
        <p className="mb-3 text-base text-rose-700">{error}</p>
      ) : saved ? (
        <p className="mb-3 text-base font-medium text-emerald-800">{copy.saveAllSuccess}</p>
      ) : (
        <p className="mb-3 text-base text-stone-600">{copy.saveAllHint}</p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="hvac-btn-primary w-full px-5 py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? copy.saveAllSaving : copy.saveAllButton}
      </button>
    </div>
  );
}
