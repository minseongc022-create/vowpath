"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";
import {
  appointmentIntervalMinutes,
  coalesceSchedulingSettingsPatch,
  formatVisitHourLabel,
  mergeShopBookingSettings,
  patchAppointmentInterval,
  sanitizeVisitWindowPatch,
  VISIT_HOUR_OPTIONS,
  type OwnerApprovalSms,
  type ShopBookingSettings,
} from "@/lib/booking-settings";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { useLocale, useSettingsPage } from "@/components/providers/LocaleProvider";

const INTERVAL_PRESET_MINUTES = [60, 90, 120, 180] as const;

export function BookingSettingsEditor() {
  const settingsPage = useSettingsPage();
  const { isEnglish } = useLocale();
  const [settings, setSettings] = useState<ShopBookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intervalDraft, setIntervalDraft] = useState("120");
  const [showTeamCapacity, setShowTeamCapacity] = useState(false);

  const ownerSmsLabels = useMemo<Record<OwnerApprovalSms, string>>(
    () =>
      isEnglish
        ? { off: "Off", p1_only: "Urgent only", all: "Every time" }
        : { off: "끔", p1_only: "P1만", all: "전체" },
    [isEnglish],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch("/api/shop/settings", undefined, 8_000);
      const data = (await res.json()) as { settings?: ShopBookingSettings; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not load settings.");
      setSettings(mergeShopBookingSettings(data.settings));
      if (data.settings) {
        setIntervalDraft(String(appointmentIntervalMinutes(data.settings)));
        setShowTeamCapacity((data.settings.maxConcurrentVisits ?? 1) > 1);
      }
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

  function updateLocal(partial: Partial<ShopBookingSettings>) {
    if (!settings) return;
    const coalesced = coalesceSchedulingSettingsPatch(settings, partial);
    const next = mergeShopBookingSettings({ ...settings, ...coalesced });
    setSettings(next);
    setIntervalDraft(String(appointmentIntervalMinutes(next)));
    setError(null);
  }

  const persist = useCallback(async () => {
    if (!settings) return false;
    try {
      const res = await clientFetch(
        "/api/shop/settings",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedulingEnabled: settings.schedulingEnabled,
            ownerApprovalSms: settings.ownerApprovalSms,
            undoWindowMinutes: settings.undoWindowMinutes,
            shadowModeRemaining: settings.shadowModeRemaining,
            avgJobTicketUsd: settings.avgJobTicketUsd,
            defaultDurationMinutes: settings.defaultDurationMinutes,
            slotBufferMinutes: settings.slotBufferMinutes,
            maxConcurrentVisits: settings.maxConcurrentVisits,
            serviceAreaZips: settings.serviceAreaZips,
            amWindowStart: settings.amWindowStart,
            amWindowEnd: settings.amWindowEnd,
            pmWindowStart: settings.pmWindowStart,
            pmWindowEnd: settings.pmWindowEnd,
          }),
        },
        12_000,
      );
      const data = (await res.json()) as { settings?: ShopBookingSettings; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save settings.");
      const next = mergeShopBookingSettings(data.settings ?? settings);
      setSettings(next);
      setIntervalDraft(String(appointmentIntervalMinutes(next)));
      return true;
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage("Save request timed out.")
          : e instanceof Error
            ? e.message
            : "Could not save settings.";
      setError(msg);
      return false;
    }
  }, [settings]);

  useSettingsSaveRegistration("booking", persist, !loading && Boolean(settings));

  function applyInterval(raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 15 || n > 720) return;
    updateLocal(patchAppointmentInterval(n));
  }

  function applyVisitWindows(
    partial: Partial<
      Pick<ShopBookingSettings, "amWindowStart" | "amWindowEnd" | "pmWindowStart" | "pmWindowEnd">
    >,
  ) {
    if (!settings) return;
    const sanitized = sanitizeVisitWindowPatch({ ...settings, ...partial });
    if (!sanitized) {
      setError(isEnglish ? "Morning must end before afternoon starts." : "오전 구간은 오후 시작 전에 끝나야 합니다.");
      return;
    }
    updateLocal(sanitized);
  }

  function visitHourSelect(
    value: number,
    onChange: (hour: number) => void,
    id: string,
  ) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vow-settings-input mt-1 min-w-[7rem]"
      >
        {VISIT_HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>
            {formatVisitHourLabel(h)}
          </option>
        ))}
      </select>
    );
  }

  if (loading && !settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm text-slate-500">{settingsPage.bookingLoadingLabel}</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-3">
        <p className="text-sm text-rose-600">{error ?? settingsPage.bookingLoadingLabel}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {settingsPage.bookingTryAgainLabel}
        </button>
      </div>
    );
  }

  const intervalMinutes = appointmentIntervalMinutes(settings);
  const intervalHours = Math.floor(intervalMinutes / 60);
  const intervalMins = intervalMinutes % 60;

  return (
    <div className="vow-settings-block rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-5">
      <div>
        <p className="vow-settings-eyebrow">{settingsPage.bookingPolicyTitle}</p>
        <p className="vow-settings-hint mt-1">{settingsPage.bookingPolicyDescription}</p>
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="vow-settings-label">{settingsPage.bookingSchedulingEnabledLabel}</span>
        <input
          type="checkbox"
          checked={settings.schedulingEnabled}
          onChange={(e) => updateLocal({ schedulingEnabled: e.target.checked })}
          className="h-5 w-5 rounded border-slate-300"
        />
      </label>

      <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-4">
        <p className="vow-settings-label">{settingsPage.smartAutoBookingTitle}</p>
        <p className="vow-settings-hint mt-1">{settingsPage.smartAutoBookingIntro}</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
          {settingsPage.smartAutoBookingRules.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {settings.schedulingEnabled ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4">
          <div>
            <p className="vow-settings-label">{settingsPage.visitHoursTitle}</p>
            <p className="vow-settings-hint mt-1">{settingsPage.visitHoursHint}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-medium text-slate-800">{settingsPage.visitHoursAmLabel}</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                {visitHourSelect(settings.amWindowStart, (h) => applyVisitWindows({ amWindowStart: h }), "am-start")}
                <span className="pb-2 text-sm text-slate-500">{settingsPage.visitHoursToLabel}</span>
                {visitHourSelect(settings.amWindowEnd, (h) => applyVisitWindows({ amWindowEnd: h }), "am-end")}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-medium text-slate-800">{settingsPage.visitHoursPmLabel}</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                {visitHourSelect(settings.pmWindowStart, (h) => applyVisitWindows({ pmWindowStart: h }), "pm-start")}
                <span className="pb-2 text-sm text-slate-500">{settingsPage.visitHoursToLabel}</span>
                {visitHourSelect(settings.pmWindowEnd, (h) => applyVisitWindows({ pmWindowEnd: h }), "pm-end")}
              </div>
            </div>
          </div>

          <p className="text-sm text-brand-800">
            {settingsPage.visitHoursExample(
              `${formatVisitHourLabel(settings.amWindowStart)}–${formatVisitHourLabel(settings.amWindowEnd)}`,
              `${formatVisitHourLabel(settings.pmWindowStart)}–${formatVisitHourLabel(settings.pmWindowEnd)}`,
            )}
          </p>
        </div>
      ) : null}

      {settings.schedulingEnabled ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4">
          <div>
            <p className="vow-settings-label">{settingsPage.visitTimingTitle}</p>
            <p className="vow-settings-hint mt-1">{settingsPage.visitTimingHint}</p>
          </div>

          <div>
            <p className="vow-settings-label">{settingsPage.appointmentIntervalLabel}</p>
            <p className="vow-settings-hint mt-1">{settingsPage.appointmentIntervalHint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERVAL_PRESET_MINUTES.map((minutes, i) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setIntervalDraft(String(minutes));
                    updateLocal(patchAppointmentInterval(minutes));
                  }}
                  className={`vow-settings-chip ${
                    intervalMinutes === minutes
                      ? "vow-settings-chip-active"
                      : "vow-settings-chip-inactive"
                  }`}
                >
                  {settingsPage.appointmentIntervalPresets[i]}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="text-sm font-medium text-stone-600">
                {isEnglish ? "Custom (minutes)" : "직접 입력 (분)"}
              </span>
              <input
                type="number"
                min={15}
                max={720}
                step={15}
                value={intervalDraft}
                onChange={(e) => setIntervalDraft(e.target.value)}
                onBlur={() => applyInterval(intervalDraft)}
                className="vow-settings-input mt-1 max-w-xs"
              />
            </label>
            <p className="mt-2 text-sm text-brand-800">
              {settingsPage.appointmentIntervalExample(intervalHours, intervalMins)}
            </p>
          </div>

          <details
            open={showTeamCapacity}
            className="rounded-lg border border-slate-200 bg-white"
            onToggle={(e) => setShowTeamCapacity((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer px-3 py-2.5 text-base font-medium text-slate-800">
              {settingsPage.teamCapacityTitle}
            </summary>
            <div className="border-t border-slate-100 px-3 py-3">
              <p className="vow-settings-hint">{settingsPage.teamCapacityHint}</p>
              <label className="mt-3 block max-w-xs">
                <span className="text-sm font-medium text-slate-800">
                  {settingsPage.maxConcurrentVisitsLabel}
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={settings.maxConcurrentVisits}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 1 && n <= 20) {
                      updateLocal({ maxConcurrentVisits: n });
                    }
                  }}
                  className="vow-settings-input mt-1"
                />
                <p className="vow-settings-hint mt-1">
                  {settingsPage.maxConcurrentVisitsHint}
                </p>
              </label>
            </div>
          </details>
        </div>
      ) : null}

      {settings.schedulingEnabled ? (
        <label className="block">
          <span className="vow-settings-label">{settingsPage.undoWindowLabel}</span>
          <input
            type="number"
            min={5}
            max={120}
            value={settings.undoWindowMinutes}
            onChange={(e) => updateLocal({ undoWindowMinutes: Number(e.target.value) })}
            className="vow-settings-input mt-1 max-w-xs"
          />
          <p className="vow-settings-hint mt-1">{settingsPage.undoWindowHint}</p>
        </label>
      ) : null}

      <div>
        <p className="vow-settings-label">{settingsPage.ownerApprovalSmsLabel}</p>
        <p className="vow-settings-hint mt-1">{settingsPage.ownerApprovalSmsHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["off", "p1_only", "all"] as OwnerApprovalSms[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateLocal({ ownerApprovalSms: level })}
              className={`vow-settings-chip ${
                settings.ownerApprovalSms === level
                  ? "vow-settings-chip-active"
                  : "vow-settings-chip-inactive"
              }`}
            >
              {ownerSmsLabels[level]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block">
          <span className="vow-settings-label">{settingsPage.serviceAreaZipsLabel}</span>
          <p className="vow-settings-hint mt-1">{settingsPage.serviceAreaZipsHint}</p>
          <input
            type="text"
            value={settings.serviceAreaZips.join(", ")}
            placeholder={settingsPage.serviceAreaZipsPlaceholder}
            onChange={(e) => {
              const zips = e.target.value
                .split(/[,\s]+/)
                .map((z) => z.trim().slice(0, 5))
                .filter((z) => /^\d{5}$/.test(z));
              updateLocal({ serviceAreaZips: zips });
            }}
            className="vow-settings-input mt-2"
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
        <label className="block">
          <span className="vow-settings-label">{settingsPage.shadowModeLabel}</span>
          <p className="vow-settings-hint mt-1">{settingsPage.shadowModeIntro}</p>
          <input
            type="number"
            min={0}
            max={50}
            value={settings.shadowModeRemaining}
            onChange={(e) => updateLocal({ shadowModeRemaining: Number(e.target.value) })}
            className="vow-settings-input mt-3 max-w-xs"
          />
        </label>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
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

      {error ? <p className="text-base text-red-600">{error}</p> : null}
    </div>
  );
}
