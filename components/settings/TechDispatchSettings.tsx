"use client";

import { useCallback, useEffect, useState } from "react";
import type { TechDispatchSettings, TechMember } from "@/lib/tech-dispatch/types";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";

const emptyTech = (): TechMember => ({
  id: crypto.randomUUID(),
  name: "",
  phone: "",
  active: true,
  senior: false,
});

function copy(isEnglish: boolean) {
  return isEnglish
    ? {
        loading: "Loading crew settings...",
        loadError: "Could not load crew settings.",
        saveError: "Could not save.",
        badge: "Crew assignment",
        title: "Auto-assign when a job confirms",
        body: "On calendar confirm, Vowpath offers the job to one tech at a time (round-robin). They reply 1=accept or 2=pass.",
        enable: "Enable crew text assignment",
        p1Senior: "Emergencies (P1) — senior techs only",
        techsLabel: "Your techs",
        techsHint: "US mobile numbers. They get job offers by text.",
        namePh: "Name",
        phonePh: "(512) 555-0100",
        senior: "Senior",
        remove: "Remove",
        addTech: "+ Add tech",
        save: "Save crew settings",
        saving: "Saving...",
        saved: "Saved",
      }
    : {
        loading: "기사 설정 불러오는 중...",
        loadError: "기사 설정을 불러오지 못했습니다.",
        saveError: "저장에 실패했습니다.",
        badge: "기사 배치",
        title: "예약 확정 시 기사에게 자동 제안",
        body: "캘린더에 확정되면 기사에게 문자로 한 명씩 순차 제안합니다. 1=수락, 2=패스.",
        enable: "기사 문자 배치 사용",
        p1Senior: "긴급(P1) — 시니어 기사만",
        techsLabel: "기사 목록",
        techsHint: "미국 휴대폰 번호. 문자로 작업 제안을 받습니다.",
        namePh: "이름",
        phonePh: "(512) 555-0100",
        senior: "시니어",
        remove: "삭제",
        addTech: "+ 기사 추가",
        save: "기사 배치 저장",
        saving: "저장 중...",
        saved: "저장됨",
      };
}

export function TechDispatchSettings() {
  const { isEnglish } = useLocale();
  const t = copy(isEnglish);
  const [settings, setSettings] = useState<TechDispatchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/tech-dispatch");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { settings: TechDispatchSettings };
      setSettings(data.settings);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(async () => {
    if (!settings) return false;
    setError(null);
    try {
      const res = await fetch("/api/shop/tech-dispatch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { settings: TechDispatchSettings };
      setSettings(data.settings);
      return true;
    } catch {
      setError(t.saveError);
      return false;
    }
  }, [settings, t.saveError]);

  useSettingsSaveRegistration("tech-dispatch", persist, !loading && Boolean(settings));

  if (loading) {
    return <p className="text-base text-stone-600">{t.loading}</p>;
  }

  if (!settings) {
    return error ? <p className="text-sm text-red-500">{error}</p> : null;
  }

  const updateTech = (id: string, patch: Partial<TechMember>) => {
    setSettings({
      ...settings,
      techs: settings.techs.map((tech) => (tech.id === id ? { ...tech, ...patch } : tech)),
    });
  };

  const removeTech = (id: string) => {
    setSettings({ ...settings, techs: settings.techs.filter((tech) => tech.id !== id) });
  };

  return (
    <div className="vow-settings-block rounded-xl border border-brand-200/70 bg-white p-5 sm:p-6">
      <p className="vow-settings-eyebrow">{t.badge}</p>
      <h3 className="mt-1 text-xl font-semibold text-brand-950">{t.title}</h3>
      <p className="vow-settings-hint mt-2">{t.body}</p>

      <label className="mt-5 flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          className="h-5 w-5 rounded border-stone-300"
        />
        <span className="vow-settings-label">{t.enable}</span>
      </label>

      {settings.enabled ? (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.p1SeniorOnly}
              onChange={(e) => setSettings({ ...settings, p1SeniorOnly: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-base text-stone-700">{t.p1Senior}</span>
          </label>

          <div>
            <p className="vow-settings-label">{t.techsLabel}</p>
            <p className="vow-settings-hint mt-1">{t.techsHint}</p>
            <div className="mt-3 space-y-3">
              {settings.techs.map((tech) => (
                <div
                  key={tech.id}
                  className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <input
                    type="text"
                    placeholder={t.namePh}
                    value={tech.name}
                    onChange={(e) => updateTech(tech.id, { name: e.target.value })}
                    className="vow-settings-input"
                  />
                  <input
                    type="tel"
                    placeholder={t.phonePh}
                    value={tech.phone}
                    onChange={(e) => updateTech(tech.id, { phone: e.target.value })}
                    className="vow-settings-input"
                  />
                  <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    <input
                      type="checkbox"
                      checked={tech.senior === true}
                      onChange={(e) => updateTech(tech.id, { senior: e.target.checked })}
                      className="h-4 w-4 rounded border-stone-300"
                    />
                    {t.senior}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTech(tech.id)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, techs: [...settings.techs, emptyTech()] })
              }
              className="mt-3 text-base font-semibold text-brand-800 hover:underline"
            >
              {t.addTech}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-base text-red-600">{error}</p> : null}
    </div>
  );
}
