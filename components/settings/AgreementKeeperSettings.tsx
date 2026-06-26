"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgreementKeeperSettings as AgreementKeeperSettingsData } from "@/lib/agreements/types";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";

export function AgreementKeeperSettingsEditor() {
  const settingsPage = useSettingsPage();
  const copy = settingsPage.agreementKeeper;
  const [settings, setSettings] = useState<AgreementKeeperSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shop/agreements/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { settings?: AgreementKeeperSettingsData } | null) => {
        if (d?.settings) setSettings(d.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async () => {
    if (!settings) return false;
    try {
      const res = await fetch("/api/shop/agreements/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) return false;
      const json = await res.json();
      setSettings(json.settings);
      return true;
    } catch {
      return false;
    }
  }, [settings]);

  useSettingsSaveRegistration("agreements", persist, !loading && Boolean(settings));

  if (loading || !settings) {
    return <p className="text-sm text-stone-600">{copy.loading}</p>;
  }

  return (
    <section id="agreements" className="vow-settings-block scroll-mt-24 rounded-xl border border-brand-200/70 bg-white p-5 sm:p-6">
      <SettingsSectionHeader
        icon="🛡️"
        title={copy.title}
        hint={copy.summary}
        className="mb-2"
      />

      <label className="mt-5 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((s) => s && { ...s, enabled: e.target.checked })}
          className="h-5 w-5 rounded border-stone-300"
        />
        <span className="vow-settings-label">{copy.enabledLabel}</span>
      </label>

      <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
        <input
          type="checkbox"
          checked={settings.offerAfterJobComplete}
          onChange={(e) =>
            setSettings((s) => s && { ...s, offerAfterJobComplete: e.target.checked })
          }
          className="h-5 w-5 rounded border-stone-300"
        />
        <span className="flex items-center gap-2 text-base text-stone-700">
          <span aria-hidden>📨</span>
          {copy.offerAfterComplete}
        </span>
      </label>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="vow-settings-label">{copy.defaultPlan}</span>
          <input
            className="vow-settings-input mt-2"
            value={settings.defaultPlanName}
            onChange={(e) =>
              setSettings((s) => s && { ...s, defaultPlanName: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="vow-settings-label">{copy.defaultPrice}</span>
          <input
            type="number"
            className="vow-settings-input mt-2"
            value={settings.defaultAnnualPriceCents / 100}
            onChange={(e) =>
              setSettings((s) => s && {
                ...s,
                defaultAnnualPriceCents: Math.round(Number(e.target.value) * 100) || 0,
              })
            }
          />
        </label>
        <label className="block">
          <span className="vow-settings-label">{copy.visitsPerYear}</span>
          <input
            type="number"
            min={1}
            className="vow-settings-input mt-2"
            value={settings.defaultVisitsPerYear}
            onChange={(e) =>
              setSettings((s) => s && {
                ...s,
                defaultVisitsPerYear: Math.max(1, Number(e.target.value) || 2),
              })
            }
          />
        </label>
        <label className="block">
          <span className="vow-settings-label">{copy.offerExpires}</span>
          <input
            type="number"
            min={1}
            className="vow-settings-input mt-2"
            value={settings.offerExpiresDays}
            onChange={(e) =>
              setSettings((s) => s && {
                ...s,
                offerExpiresDays: Math.max(1, Number(e.target.value) || 14),
              })
            }
          />
        </label>
      </div>

      <p className="vow-settings-hint mt-4 flex items-start gap-2">
        <span className="shrink-0" aria-hidden>🔔</span>
        <span>{copy.reminderHint}</span>
      </p>
    </section>
  );
}
