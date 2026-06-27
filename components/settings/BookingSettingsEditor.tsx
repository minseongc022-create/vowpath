"use client";

import { useCallback, useEffect, useState } from "react";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";
import {
  BOOKING_RULE_ICONS,
  SettingsSectionHeader,
  SettingsSubsection,
} from "@/components/settings/SettingsSectionHeader";
import {
  appointmentIntervalMinutes,
  coalesceSchedulingSettingsPatch,
  formatVisitHourLabel,
  isContinuousVisitWindows,
  mergeShopBookingSettings,
  patchAppointmentInterval,
  patchContinuousVisitWindow,
  sanitizeVisitWindowPatch,
  VISIT_HOUR_OPTIONS,
  VISIT_WINDOW_PRESETS,
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
            undoWindowMinutes: settings.undoWindowMinutes,
            shadowModeRemaining: settings.shadowModeRemaining,
            avgJobTicketUsd: settings.avgJobTicketUsd,
            defaultDurationMinutes: settings.defaultDurationMinutes,
            slotBufferMinutes: settings.slotBufferMinutes,
            maxConcurrentVisits: settings.maxConcurrentVisits,
            serviceAreaZips: settings.serviceAreaZips,
            stormModeEnabled: settings.stormModeEnabled,
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
      setError(
        isEnglish
          ? "Morning must end before afternoon starts."
          : "오전 구간은 오후 시작 전에 끝나야 합니다.",
      );
      return;
    }
    updateLocal(sanitized);
  }

  function applyContinuousWindow(startHour: number, endHour: number) {
    const patched = patchContinuousVisitWindow(startHour, endHour);
    if (!patched) {
      setError(isEnglish ? "Close time must be after open time." : "종료 시간은 시작보다 늦어야 합니다.");
      return;
    }
    updateLocal(patched);
  }

  function setVisitLayout(mode: "split" | "continuous") {
    if (!settings) return;
    if (mode === "continuous") {
      applyContinuousWindow(
        settings.amWindowStart,
        Math.max(settings.amWindowEnd, settings.pmWindowEnd),
      );
      return;
    }
    applyVisitWindows(VISIT_WINDOW_PRESETS.splitStandard);
  }

  function applyVisitPreset(preset: keyof typeof VISIT_WINDOW_PRESETS) {
    updateLocal(VISIT_WINDOW_PRESETS[preset]);
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
  const continuousHours = isContinuousVisitWindows(settings);

  return (
    <div className="vow-settings-block rounded-2xl border border-brand-200/70 bg-white p-5 shadow-card space-y-5 sm:p-6">
      <SettingsSectionHeader
        icon="📅"
        eyebrow={settingsPage.bookingPolicyTitle}
        title={isEnglish ? "Booking & visit times" : "예약 · 방문 시간"}
        hint={settingsPage.bookingPolicyDescription}
      />

      <label className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3">
        <span className="flex items-center gap-2 vow-settings-label">
          <span aria-hidden>🗓️</span>
          {settingsPage.bookingSchedulingEnabledLabel}
        </span>
        <input
          type="checkbox"
          checked={settings.schedulingEnabled}
          onChange={(e) => updateLocal({ schedulingEnabled: e.target.checked })}
          className="h-5 w-5 rounded border-slate-300"
        />
      </label>

      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
        <p className="flex items-center gap-2 vow-settings-label">
          <span aria-hidden>✨</span>
          {settingsPage.smartAutoBookingTitle}
        </p>
        <p className="vow-settings-hint mt-1">{settingsPage.smartAutoBookingIntro}</p>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-stone-700">
          {settingsPage.smartAutoBookingRules.map((rule, i) => (
            <li key={rule} className="flex gap-2.5">
              <span className="shrink-0 text-base" aria-hidden>
                {BOOKING_RULE_ICONS[i] ?? "•"}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {settings.schedulingEnabled ? (
        <SettingsSubsection
          icon="🌅"
          title={settingsPage.visitHoursTitle}
          hint={settingsPage.visitHoursHint}
          className="space-y-4"
        >
          <div>
            <p className="vow-settings-label">{settingsPage.visitHoursLayoutLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVisitLayout("split")}
                className={`vow-settings-chip ${
                  !continuousHours ? "vow-settings-chip-active" : "vow-settings-chip-inactive"
                }`}
              >
                {settingsPage.visitHoursLayoutSplit}
              </button>
              <button
                type="button"
                onClick={() => setVisitLayout("continuous")}
                className={`vow-settings-chip ${
                  continuousHours ? "vow-settings-chip-active" : "vow-settings-chip-inactive"
                }`}
              >
                {settingsPage.visitHoursLayoutContinuous}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyVisitPreset("splitStandard")}
              className="vow-settings-chip vow-settings-chip-inactive text-sm"
            >
              {settingsPage.visitHoursPresetStandard}
            </button>
            <button
              type="button"
              onClick={() => applyVisitPreset("continuousFullDay")}
              className="vow-settings-chip vow-settings-chip-inactive text-sm"
            >
              {settingsPage.visitHoursPresetFullDay}
            </button>
            <button
              type="button"
              onClick={() => applyVisitPreset("continuousExtended")}
              className="vow-settings-chip vow-settings-chip-inactive text-sm"
            >
              {settingsPage.visitHoursPresetExtended}
            </button>
          </div>

          {continuousHours ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-800">
                    {settingsPage.visitHoursContinuousStartLabel}
                  </span>
                  {visitHourSelect(settings.amWindowStart, (h) => {
                    applyContinuousWindow(h, settings.amWindowEnd);
                  }, "day-start")}
                </label>
                <span className="pb-2 text-sm text-slate-500">{settingsPage.visitHoursToLabel}</span>
                <label className="block">
                  <span className="text-sm font-medium text-slate-800">
                    {settingsPage.visitHoursContinuousEndLabel}
                  </span>
                  {visitHourSelect(settings.amWindowEnd, (h) => {
                    applyContinuousWindow(settings.amWindowStart, h);
                  }, "day-end")}
                </label>
              </div>
            </div>
          ) : (
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
          )}

          <p className="text-sm text-brand-800">
            {continuousHours
              ? settingsPage.visitHoursExampleContinuous(
                  `${formatVisitHourLabel(settings.amWindowStart)}–${formatVisitHourLabel(settings.amWindowEnd)}`,
                )
              : settingsPage.visitHoursExample(
                  `${formatVisitHourLabel(settings.amWindowStart)}–${formatVisitHourLabel(settings.amWindowEnd)}`,
                  `${formatVisitHourLabel(settings.pmWindowStart)}–${formatVisitHourLabel(settings.pmWindowEnd)}`,
                )}
          </p>
        </SettingsSubsection>
      ) : null}

      {settings.schedulingEnabled ? (
        <SettingsSubsection
          icon="⏱️"
          title={settingsPage.visitTimingTitle}
          hint={settingsPage.visitTimingHint}
          className="space-y-4"
        >
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
            className="rounded-xl border border-slate-200 bg-white"
            onToggle={(e) => setShowTeamCapacity((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-base font-medium text-slate-800">
              <span aria-hidden>👥</span>
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
        </SettingsSubsection>
      ) : null}

      {settings.schedulingEnabled ? (
        <SettingsSubsection icon="↩️" title={settingsPage.undoWindowLabel} hint={settingsPage.undoWindowHint}>
          <input
            type="number"
            min={5}
            max={120}
            value={settings.undoWindowMinutes}
            onChange={(e) => updateLocal({ undoWindowMinutes: Number(e.target.value) })}
            className="vow-settings-input max-w-xs"
          />
        </SettingsSubsection>
      ) : null}

      <SettingsSubsection
        icon="⛈️"
        title={settingsPage.stormModeLabel}
        hint={settingsPage.stormModeHint}
      >
        <label className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3">
          <span className="vow-settings-label">{settingsPage.stormModeToggleLabel}</span>
          <input
            type="checkbox"
            checked={settings.stormModeEnabled}
            onChange={(e) => updateLocal({ stormModeEnabled: e.target.checked })}
            className="h-5 w-5 rounded border-slate-300"
          />
        </label>
      </SettingsSubsection>

      <SettingsSubsection icon="📍" title={settingsPage.serviceAreaZipsLabel} hint={settingsPage.serviceAreaZipsHint}>
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
          className="vow-settings-input"
        />
      </SettingsSubsection>

      <SettingsSubsection
        icon="🧪"
        title={settingsPage.shadowModeLabel}
        hint={settingsPage.shadowModeIntro}
      >
        <input
          type="number"
          min={0}
          max={50}
          value={settings.shadowModeRemaining}
          onChange={(e) => updateLocal({ shadowModeRemaining: Number(e.target.value) })}
          className="vow-settings-input max-w-xs"
        />
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          <li className="flex gap-2">
            <span className="shrink-0" aria-hidden>🟢</span>
            <span>{settingsPage.shadowModeLive}</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0" aria-hidden>🟡</span>
            <span>{settingsPage.shadowModePractice}</span>
          </li>
        </ul>
      </SettingsSubsection>

      {error ? <p className="text-base text-red-600">{error}</p> : null}
    </div>
  );
}
