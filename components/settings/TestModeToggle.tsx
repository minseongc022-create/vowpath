"use client";

import { useCallback, useEffect, useState } from "react";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { isPracticeMode } from "@/lib/data-truthfulness";
import type { ShopBookingSettings } from "@/lib/booking-settings";

type Props = {
  compact?: boolean;
};

export function TestModeToggle({ compact = false }: Props) {
  const copy = useSettingsPage();
  const [settings, setSettings] = useState<ShopBookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = settings ? isPracticeMode(settings) : false;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/settings");
      const data = (await res.json()) as { settings?: ShopBookingSettings };
      if (res.ok && data.settings) setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setTestMode(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shadowModeRemaining: next ? 1 : 0 }),
      });
      const data = (await res.json()) as { settings?: ShopBookingSettings; error?: string };
      if (!res.ok || !data.settings) {
        throw new Error(data.error ?? copy.testModeSaveError);
      }
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.testModeSaveError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={compact ? "text-sm text-stone-500" : "vow-settings-block vow-settings-panel p-4 text-sm text-stone-500"}>
        {copy.testModeLoading}
      </div>
    );
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-950">{copy.testModeTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">{copy.testModeIntro}</p>
          <p
            className={`mt-2 text-xs font-semibold ${enabled ? "text-amber-800" : "text-emerald-800"}`}
          >
            {enabled ? copy.testModeOn : copy.testModeOff}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={copy.testModeTitle}
          disabled={saving}
          onClick={() => void setTestMode(!enabled)}
          className={`relative mt-0.5 h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 ${
            enabled ? "bg-amber-500" : "bg-stone-300"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
              enabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </>
  );

  if (compact) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4">{body}</div>;
  }

  return (
    <section className="vow-settings-block vow-settings-panel border-2 border-brand-200/80 p-4 sm:p-5">
      {body}
    </section>
  );
}
