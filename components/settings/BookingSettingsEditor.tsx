"use client";

import { useCallback, useEffect, useState } from "react";
import {
  mergeShopBookingSettings,
  type OwnerApprovalSms,
  type SchedulingMode,
  type ShopBookingSettings,
} from "@/lib/booking-settings";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { settingsPage } from "@/lib/content";

const MODE_LABELS: Record<SchedulingMode, string> = {
  speed: "빠른 예약",
  hybrid: "하이브리드",
  control: "수동 승인",
};

const MODE_DESCRIPTIONS: Record<SchedulingMode, string> = {
  speed: settingsPage.bookingModeSpeedDesc,
  hybrid: settingsPage.bookingModeHybridDesc,
  control: settingsPage.bookingModeControlDesc,
};

const OWNER_SMS_LABELS: Record<OwnerApprovalSms, string> = {
  off: "끔",
  p1_only: "P1만",
  all: "전체",
};

export function BookingSettingsEditor() {
  const [settings, setSettings] = useState<ShopBookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch("/api/shop/settings", undefined, 8_000);
      const data = (await res.json()) as { settings?: ShopBookingSettings; error?: string };
      if (!res.ok) throw new Error(data.error ?? "설정을 불러오지 못했습니다.");
      setSettings(mergeShopBookingSettings(data.settings));
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage("설정을 불러오지 못했습니다. 다시 시도해 주세요.")
          : e instanceof Error
            ? e.message
            : "설정을 불러오지 못했습니다.";
      setError(msg);
      setSettings(mergeShopBookingSettings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(partial: Partial<ShopBookingSettings>) {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await clientFetch(
        "/api/shop/settings",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        },
        8_000,
      );
      const data = (await res.json()) as { settings?: ShopBookingSettings; error?: string };
      if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
      setSettings(mergeShopBookingSettings(data.settings ?? { ...settings, ...partial }));
      setSaved(true);
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage("저장 요청 시간이 초과되었습니다.")
          : e instanceof Error
            ? e.message
            : "저장에 실패했습니다.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm text-slate-500">불러오는 중…</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-3">
        <p className="text-sm text-rose-600">{error ?? "설정을 불러오지 못했습니다."}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const isControlMode = settings.schedulingMode === "control";
  const showSlotOfferCount = !isControlMode;
  const showUndoWindow = !isControlMode;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {settingsPage.bookingPolicyTitle}
        </p>
        <p className="mt-1 text-sm text-slate-600">{settingsPage.bookingPolicyDescription}</p>
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-800">고객 시간 선택 활성화</span>
        <input
          type="checkbox"
          checked={settings.schedulingEnabled}
          disabled={saving}
          onChange={(e) => void patch({ schedulingEnabled: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300"
        />
      </label>

      <div>
        <p className="text-sm font-medium text-slate-800">예약 모드</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["speed", "hybrid", "control"] as SchedulingMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={saving || !settings.schedulingEnabled}
              onClick={() => void patch({ schedulingMode: mode })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                settings.schedulingMode === mode
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {(["speed", "hybrid", "control"] as SchedulingMode[]).map((mode) => (
            <div
              key={mode}
              className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
                settings.schedulingMode === mode
                  ? "border-brand-200 bg-brand-50 text-slate-800"
                  : "border-slate-100 bg-slate-50 text-slate-600"
              }`}
            >
              <p className="font-semibold text-slate-900">{MODE_LABELS[mode]}</p>
              <p className="mt-1 text-xs sm:text-sm">{MODE_DESCRIPTIONS[mode]}</p>
            </div>
          ))}
        </div>
      </div>

      {showSlotOfferCount || showUndoWindow ? (
        <div
          className={`grid gap-3 ${showSlotOfferCount && showUndoWindow ? "sm:grid-cols-2" : ""}`}
        >
          {showSlotOfferCount ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                {settingsPage.slotOfferCountLabel}
              </span>
              <select
                value={settings.slotOfferCount}
                disabled={saving || !settings.schedulingEnabled}
                onChange={(e) => void patch({ slotOfferCount: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}개
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">{settingsPage.slotOfferCountHint}</p>
            </label>
          ) : null}

          {showUndoWindow ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                {settingsPage.undoWindowLabel}
              </span>
              <input
                type="number"
                min={5}
                max={120}
                value={settings.undoWindowMinutes}
                disabled={saving || !settings.schedulingEnabled}
                onChange={(e) => void patch({ undoWindowMinutes: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">{settingsPage.undoWindowHint}</p>
            </label>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="text-sm font-medium text-slate-800">업주 승인 문자</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["off", "p1_only", "all"] as OwnerApprovalSms[]).map((level) => (
            <button
              key={level}
              type="button"
              disabled={saving}
              onClick={() => void patch({ ownerApprovalSms: level })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                settings.ownerApprovalSms === level
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {OWNER_SMS_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
          <span className="text-sm text-slate-700">Jobber 일정 연동</span>
          <input
            type="checkbox"
            checked={settings.jobberSchedulingEnabled}
            disabled={saving}
            onChange={(e) => void patch({ jobberSchedulingEnabled: e.target.checked })}
            className="h-4 w-4"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
          <span className="text-sm text-slate-700">스팸 전화 필터</span>
          <input
            type="checkbox"
            checked={settings.spamFilterEnabled}
            disabled={saving}
            onChange={(e) => void patch({ spamFilterEnabled: e.target.checked })}
            className="h-4 w-4"
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-800">{settingsPage.shadowModeLabel}</span>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{settingsPage.shadowModeIntro}</p>
          <input
            type="number"
            min={0}
            max={50}
            value={settings.shadowModeRemaining}
            disabled={saving}
            onChange={(e) => void patch({ shadowModeRemaining: Number(e.target.value) })}
            className="mt-3 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <span>{settingsPage.shadowModeLive}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            <span>{settingsPage.shadowModePractice}</span>
          </li>
        </ul>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">저장됨</p>}
    </div>
  );
}
