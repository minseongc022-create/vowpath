"use client";

import { useCallback, useEffect, useState } from "react";
import type { TechDispatchSettings, TechMember } from "@/lib/tech-dispatch/types";
import { useSettingsPage, useLocale } from "@/components/providers/LocaleProvider";
import { SettingsSectionHeader } from "@/components/settings/SettingsSectionHeader";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";
import {
  clientFetch,
  clientFetchTimeoutMessage,
  redirectToLoginIfUnauthorized,
} from "@/lib/client-fetch";
import { DEFAULT_TECH_DISPATCH_SETTINGS } from "@/lib/tech-dispatch/types";

const WEEKDAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;
type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

function emptyTech(): TechMember {
  return {
    id: crypto.randomUUID(),
    name: "",
    phone: "",
    active: true,
    senior: false,
  };
}

const COPY_EN = {
  loading: "Loading crew settings...",
  loadError: "Could not load crew settings.",
  sessionError: "Your session expired. Please sign in again.",
  retry: "Try again",
  saveError: "Could not save.",
  badge: "Crew texts",
  title: "Who gets the job text?",
  body: "When a job is ready, we text your crew one at a time. They reply 1 = yes, 2 = pass. No reply? We move to the next person automatically.",
  enable: "Text my crew when a job is ready",
  p1Senior: "Urgent jobs (P1) — senior techs only",
  techsLabel: "Crew list",
  techsHint: "Add name + mobile. Testing solo? Put your own number and reply 1.",
  namePh: "Name",
  phonePh: "(512) 555-0100",
  senior: "Senior",
  remove: "Remove",
  addTech: "+ Add tech",
  assignOnApprove: "Wait for my approval before texting crew",
  responseTimeout: "How long to wait for a reply (minutes)",
  responseTimeoutHint: "No reply? The text goes to the next person. Urgent (P1) waits at most 5 minutes.",
  assignOnApproveHint:
    "On = only after you approve. Off = text as soon as a visit slot is reserved (even if you're still reviewing).",
  save: "Save crew settings",
  saving: "Saving...",
  saved: "Saved",
} as const;

const COPY_KO = {
  loading: "기사 배치 설정을 불러오는 중…",
  loadError: "기사 배치 설정을 불러오지 못했습니다.",
  sessionError: "세션이 만료되었습니다. 다시 로그인해 주세요.",
  retry: "다시 시도",
  saveError: "저장하지 못했습니다.",
  badge: "기사 문자",
  title: "누구에게 출동 문자를 보낼까요?",
  body: "작업이 준비되면 기사에게 한 명씩 문자를 보냅니다. 1=수락, 2=패스. 답이 없으면 다음 사람에게 자동으로 넘어갑니다.",
  enable: "작업 준비되면 기사에게 문자 보내기",
  p1Senior: "긴급(P1) — 시니어 기사만",
  techsLabel: "기사 목록",
  techsHint: "이름 + 휴대폰. 혼자 테스트하려면 본인 번호를 넣고 1로 답하면 됩니다.",
  namePh: "이름",
  phonePh: "(512) 555-0100",
  senior: "시니어",
  remove: "삭제",
  addTech: "+ 기사 추가",
  assignOnApprove: "내가 승인한 뒤에만 기사에게 문자",
  responseTimeout: "답장 대기 시간 (분)",
  responseTimeoutHint: "답이 없으면 다음 사람에게 갑니다. 긴급(P1)은 최대 5분 대기합니다.",
  assignOnApproveHint:
    "켜짐 = 승인 후에만 문자. 꺼짐 = 방문 슬롯이 잡히면 바로 문자 (아직 검토 중이어도).",
  save: "기사 배치 저장",
  saving: "저장 중…",
  saved: "저장됨",
} as const;

export function TechDispatchSettings() {
  const settingsPage = useSettingsPage();
  const { isEnglish } = useLocale();
  const t = isEnglish ? COPY_EN : COPY_KO;
  const [settings, setSettings] = useState<TechDispatchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch("/api/shop/tech-dispatch");
      if (redirectToLoginIfUnauthorized(res)) {
        setError(t.sessionError);
        setSettings({ ...DEFAULT_TECH_DISPATCH_SETTINGS, techs: [] });
        return;
      }
      const data = (await res.json()) as { settings?: TechDispatchSettings; error?: string };
      if (!res.ok) throw new Error(data.error ?? t.loadError);
      setSettings(data.settings ?? { ...DEFAULT_TECH_DISPATCH_SETTINGS, techs: [] });
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage(t.loadError)
          : e instanceof Error
            ? e.message
            : t.loadError;
      setError(msg);
      setSettings({ ...DEFAULT_TECH_DISPATCH_SETTINGS, techs: [] });
    } finally {
      setLoading(false);
    }
  }, [t.loadError, t.sessionError]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(async () => {
    if (!settings) return false;
    setError(null);
    try {
      const res = await clientFetch("/api/shop/tech-dispatch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (redirectToLoginIfUnauthorized(res)) {
        setError(t.sessionError);
        return false;
      }
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
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
        <p className="text-sm text-red-600">{error ?? t.loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 text-sm font-semibold text-brand-800 underline-offset-2 hover:underline"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  const updateTech = (id: string, patch: Partial<TechMember>) => {
    setSettings({
      ...settings,
      techs: settings.techs.map((tech) => (tech.id === id ? { ...tech, ...patch } : tech)),
    });
  };

  const removeTech = (id: string) => {
    const nextTechs = settings.techs.filter((tech) => tech.id !== id);
    const nextOnCall = { ...settings.onCallByWeekday };
    for (const key of WEEKDAY_KEYS) {
      if (nextOnCall[key] === id) delete nextOnCall[key];
    }
    setSettings({ ...settings, techs: nextTechs, onCallByWeekday: nextOnCall });
  };

  const setOnCallForWeekday = (key: WeekdayKey, techId: string) => {
    const next = { ...settings.onCallByWeekday };
    if (!techId) {
      delete next[key];
    } else {
      next[key] = techId;
    }
    setSettings({ ...settings, onCallByWeekday: next });
  };

  const activeTechs = settings.techs.filter((tech) => tech.active && tech.name.trim());

  return (
    <div className="vow-settings-block vow-settings-panel p-3 sm:p-5">
      <SettingsSectionHeader
        icon="👷"
        eyebrow={t.badge}
        title={t.title}
        hint={t.body}
        className="mb-4"
      />

      <label className="vow-settings-user-zone flex items-center gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          className="h-5 w-5 shrink-0 rounded border-stone-300"
        />
        <span className="vow-settings-user-label">{t.enable}</span>
      </label>

      {settings.enabled ? (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={settings.p1SeniorOnly}
              onChange={(e) => setSettings({ ...settings, p1SeniorOnly: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="flex items-center gap-2 text-base text-stone-700">
              <span aria-hidden>🚨</span>
              {t.p1Senior}
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={settings.assignOnApprove}
              onChange={(e) => setSettings({ ...settings, assignOnApprove: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-base text-stone-700">{t.assignOnApprove}</span>
          </label>
          <p className="text-sm text-stone-600">{t.assignOnApproveHint}</p>

          <label className="block rounded-lg border border-slate-100 bg-white px-3 py-2.5">
            <span className="text-base font-medium text-stone-800">{t.responseTimeout}</span>
            <p className="mt-1 text-sm text-stone-600">{t.responseTimeoutHint}</p>
            <input
              type="number"
              min={5}
              max={120}
              step={5}
              value={settings.responseTimeoutMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  responseTimeoutMinutes: Math.min(
                    120,
                    Math.max(5, Number(e.target.value) || 10),
                  ),
                })
              }
              className="vow-settings-input mt-2 w-28"
            />
          </label>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="flex items-center gap-2 vow-settings-label">
              <span aria-hidden>📱</span>
              {t.techsLabel}
            </p>
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
              className="mt-3 inline-flex items-center gap-1.5 text-base font-semibold text-brand-800 hover:underline"
            >
              <span aria-hidden>➕</span>
              {t.addTech.replace(/^\+ /, "")}
            </button>
          </div>

          {activeTechs.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="flex items-center gap-2 vow-settings-label">
                <span aria-hidden>📅</span>
                {settingsPage.onCallScheduleLabel}
              </p>
              <p className="vow-settings-hint mt-1">{settingsPage.onCallScheduleHint}</p>
              <div className="mt-3 space-y-2">
                {WEEKDAY_KEYS.map((key, i) => (
                  <label key={key} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-10 shrink-0 font-medium text-stone-700">
                      {settingsPage.onCallWeekdayLabels[i]}
                    </span>
                    <select
                      value={settings.onCallByWeekday[key] ?? ""}
                      onChange={(e) => setOnCallForWeekday(key, e.target.value)}
                      className="vow-settings-input min-w-[12rem] flex-1"
                    >
                      <option value="">{settingsPage.onCallNoneOption}</option>
                      {activeTechs.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name.trim() || tech.phone}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-base text-red-600">{error}</p> : null}
    </div>
  );
}
