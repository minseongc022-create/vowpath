"use client";

import { useEffect } from "react";

/** Bump when settings UI changes so phones stuck on old JS bundles auto-refresh once. */
export const SETTINGS_UI_VERSION = "wizard-v8-20260718-mobile-wide";

const STORAGE_KEY = "effiroad_settings_ui_version";

export function SettingsUiVersion() {
  useEffect(() => {
    try {
      const prev = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, SETTINGS_UI_VERSION);
      if (prev && prev !== SETTINGS_UI_VERSION) {
        window.location.reload();
      }
    } catch {
      // ignore private mode
    }
  }, []);

  return null;
}
