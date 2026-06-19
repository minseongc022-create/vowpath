"use client";

import { useEffect, useState } from "react";
import type { AgreementKeeperSettings as AgreementKeeperSettingsData } from "@/lib/agreements/types";
import { useSettingsPage } from "@/components/providers/LocaleProvider";

export function AgreementKeeperSettingsEditor() {
  const settingsPage = useSettingsPage();
  const copy = settingsPage.agreementKeeper;
  const [settings, setSettings] = useState<AgreementKeeperSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/shop/agreements/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { settings?: AgreementKeeperSettingsData } | null) => {
        if (d?.settings) setSettings(d.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/shop/agreements/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <p className="text-sm text-stone-600">{copy.loading}</p>;
  }

  return (
    <section id="agreements" className="ops-card scroll-mt-24 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{copy.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">{copy.summary}</p>
        </div>
        {saved ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {copy.saved}
          </span>
        ) : null}
      </div>

      <label className="mt-6 flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((s) => s && { ...s, enabled: e.target.checked })}
          className="h-4 w-4 rounded border-stone-300"
        />
        <span className="text-sm font-medium text-stone-800">{copy.enabledLabel}</span>
      </label>

      <label className="mt-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.offerAfterJobComplete}
          onChange={(e) =>
            setSettings((s) => s && { ...s, offerAfterJobComplete: e.target.checked })
          }
          className="h-4 w-4 rounded border-stone-300"
        />
        <span className="text-sm text-stone-700">{copy.offerAfterComplete}</span>
      </label>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-stone-700">{copy.defaultPlan}</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
            value={settings.defaultPlanName}
            onChange={(e) =>
              setSettings((s) => s && { ...s, defaultPlanName: e.target.value })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">{copy.defaultPrice}</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
            value={settings.defaultAnnualPriceCents / 100}
            onChange={(e) =>
              setSettings((s) => s && {
                ...s,
                defaultAnnualPriceCents: Math.round(Number(e.target.value) * 100) || 0,
              })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">{copy.visitsPerYear}</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
            value={settings.defaultVisitsPerYear}
            onChange={(e) =>
              setSettings((s) => s && {
                ...s,
                defaultVisitsPerYear: Math.max(1, Number(e.target.value) || 2),
              })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">{copy.offerExpires}</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
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

      <p className="mt-4 text-xs text-stone-500">{copy.reminderHint}</p>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="mt-6 rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
      >
        {saving ? copy.saving : copy.save}
      </button>
    </section>
  );
}
