"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALL_JOB_PRIORITIES,
  mergeShopBookingSettings,
  type OwnerApprovalSms,
  type SchedulingMode,
  type ShopBookingSettings,
} from "@/lib/booking-settings";
import type { JobPriority } from "@/lib/types";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { settingsPage } from "@/lib/content";
import { isEnglishUi } from "@/lib/locale";

const MODE_LABELS: Record<SchedulingMode, string> = isEnglishUi()
  ? { speed: "Speed", hybrid: "Hybrid", control: "Control" }
  : { speed: "빠른 예약", hybrid: "하이브리드", control: "수동 승인" };

const MODE_DESCRIPTIONS: Record<SchedulingMode, string> = {
  speed: settingsPage.bookingModeSpeedDesc,
  hybrid: settingsPage.bookingModeHybridDesc,
  control: settingsPage.bookingModeControlDesc,
};

const PRIORITY_LABELS: Record<JobPriority, string> = isEnglishUi()
  ? { P1: "P1 (urgent)", P2: "P2", P3: "P3" }
  : { P1: "P1 (긴급)", P2: "P2", P3: "P3" };

const OWNER_SMS_LABELS: Record<OwnerApprovalSms, string> = isEnglishUi()
  ? { off: "Off", p1_only: "P1 only", all: "All" }
  : { off: "끔", p1_only: "P1만", all: "전체" };

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
      if (!res.ok) throw new Error(data.error ?? "Could not load settings.");
      setSettings(mergeShopBookingSettings(data.settings));
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage("Could not load settings. Please try again.")
          : e instanceof Error
            ? e.message
            : "Could not load settings.";
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
      if (!res.ok) throw new Error(data.error ?? "Could not save settings.");
      setSettings(mergeShopBookingSettings(data.settings ?? { ...settings, ...partial }));
      setSaved(true);
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage("Save request timed out.")
          : e instanceof Error
            ? e.message
            : "Could not save settings.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function toggleHybridPriority(priority: JobPriority) {
    if (!settings) return;
    const current = settings.hybridAutoPriorities;
    const next = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    void patch({ hybridAutoPriorities: next });
  }

  if (loading && !settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-3">
        <p className="text-sm text-rose-600">{error ?? "Could not load settings."}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const isControlMode = settings.schedulingMode === "control";
  const isHybridMode = settings.schedulingMode === "hybrid";
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
        <span className="text-sm font-medium text-slate-800">Enable customer time selection</span>
        <input
          type="checkbox"
          checked={settings.schedulingEnabled}
          disabled={saving}
          onChange={(e) => void patch({ schedulingEnabled: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300"
        />
      </label>

      <div>
        <p className="text-sm font-medium text-slate-800">Scheduling mode</p>
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

      {isHybridMode && settings.schedulingEnabled ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-4">
          <p className="text-sm font-medium text-slate-900">
            {settingsPage.hybridAutoPrioritiesLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {settingsPage.hybridAutoPrioritiesHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_JOB_PRIORITIES.map((priority) => {
              const checked = settings.hybridAutoPriorities.includes(priority);
              return (
                <label
                  key={priority}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    checked
                      ? "border-brand-400 bg-white text-slate-900"
                      : "border-slate-200 bg-white/80 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={saving}
                    onChange={() => toggleHybridPriority(priority)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {PRIORITY_LABELS[priority]}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {settings.schedulingMode === "speed" && settings.schedulingEnabled ? (
        <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {settingsPage.hybridAllSelectedNote}
        </p>
      ) : null}

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
                    {n}
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
        <p className="text-sm font-medium text-slate-800">Owner approval texts</p>
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

      <div>
        <label className="block">
          <span className="text-sm font-medium text-slate-800">
            {isEnglishUi() ? "Service area ZIP codes" : "서비스 지역 ZIP"}
          </span>
          <p className="mt-1 text-xs text-slate-500">
            {isEnglishUi()
              ? "Optional. Comma-separated 5-digit ZIPs. Leave empty to accept all areas."
              : "선택. 5자리 ZIP을 쉼표로 구분. 비우면 전 지역 허용."}
          </p>
          <input
            type="text"
            value={settings.serviceAreaZips.join(", ")}
            disabled={saving}
            placeholder={isEnglishUi() ? "78701, 78702" : "78701, 78702"}
            onChange={(e) => {
              const zips = e.target.value
                .split(/[,\s]+/)
                .map((z) => z.trim().slice(0, 5))
                .filter((z) => /^\d{5}$/.test(z));
              void patch({ serviceAreaZips: zips });
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
      {saved && <p className="text-sm text-emerald-600">Saved</p>}
    </div>
  );
}
