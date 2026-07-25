"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";
import {
  DAY_OPTIONS,
  formatScheduleSentence,
  HOURS,
  MINUTES,
  pad,
  getScheduleAlwaysOnLabel,
  type ScheduleRow,
} from "@/lib/schedule-format";

type ScheduleEditorProps = {
  rows: ScheduleRow[];
  onChange: (rows: ScheduleRow[]) => void;
  alwaysOn?: boolean;
  onAlwaysOnChange?: (alwaysOn: boolean) => void;
  /** Settings page: compact dropdown height so steps 2–3 fit on one screen */
  compact?: boolean;
};

export function ScheduleEditor({
  rows,
  onChange,
  alwaysOn = false,
  onAlwaysOnChange,
  compact = false,
}: ScheduleEditorProps) {
  const settingsPage = useSettingsPage();
  function updateRow(
    id: string,
    patch: Partial<Pick<ScheduleRow, "startHour" | "startMinute" | "endHour" | "endMinute">>,
  ) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function toggleDay(id: string, dayId: number) {
    onChange(
      rows.map((row) => {
        if (row.id !== id) return row;
        const has = row.days.includes(dayId);
        const days = has ? row.days.filter((d) => d !== dayId) : [...row.days, dayId];
        return { ...row, days };
      }),
    );
  }

  function addRow() {
    onChange([
      ...rows,
      {
        id: `w-${Date.now()}`,
        days: [1, 2, 3, 4, 5],
        startHour: 17,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
      },
    ]);
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id));
  }

  const selectClass = compact
    ? "w-full rounded-lg border border-surface-border bg-white px-2 py-2 text-sm font-medium text-slate-900 shadow-sm"
    : "h-28 w-full rounded-lg border border-surface-border bg-slate-50 p-2 text-sm font-medium text-slate-900";

  return (
    <div className="space-y-3 text-slate-900">
      {onAlwaysOnChange ? (
        <div className="rounded-lg border border-surface-border bg-white p-4">
          <button
            type="button"
            onClick={() => onAlwaysOnChange(!alwaysOn)}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              alwaysOn
                ? "border-brand-500 bg-brand-50 text-brand-900"
                : "border-surface-border bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {settingsPage.scheduleAlwaysOn}
          </button>
          {alwaysOn ? (
            <>
              <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
                {getScheduleAlwaysOnLabel()}
              </p>
              <p className="mt-2 text-xs text-slate-500">{settingsPage.scheduleAlwaysOnHint}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {!alwaysOn
        ? rows.map((row, index) => (
        <div
          key={row.id}
          className="space-y-3 rounded-lg border border-surface-border bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {settingsPage.scheduleWindowLabel(index + 1)}
            </p>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                {settingsPage.scheduleRemove}
              </button>
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">{settingsPage.scheduleDaysLabel}</p>
            <div className="grid grid-cols-7 gap-1 rounded-lg border border-surface-border bg-slate-50 p-2">
              {DAY_OPTIONS.map((day) => {
                const selected = row.days.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(row.id, day.id)}
                    className={`rounded-md px-2 py-2 text-xs font-semibold ${
                      selected
                        ? "bg-brand-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{settingsPage.scheduleStartLabel}</p>
              <div className="flex items-center gap-1.5">
                <select
                  size={compact ? undefined : 5}
                  value={row.startHour}
                  onChange={(e) => updateRow(row.id, { startHour: Number(e.target.value) })}
                  className={selectClass}
                  aria-label="Start hour"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h} className="text-slate-900">
                      {pad(h)}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-semibold text-slate-500" aria-hidden>
                  {settingsPage.scheduleHourUnit}
                </span>
                <span className="text-slate-400" aria-hidden>
                  :
                </span>
                <select
                  size={compact ? undefined : 5}
                  value={row.startMinute}
                  onChange={(e) => updateRow(row.id, { startMinute: Number(e.target.value) })}
                  className={selectClass}
                  aria-label="Start minute"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m} className="text-slate-900">
                      {pad(m)}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-semibold text-slate-500" aria-hidden>
                  {settingsPage.scheduleMinuteUnit}
                </span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">{settingsPage.scheduleEndLabel}</p>
              <div className="flex items-center gap-1.5">
                <select
                  size={compact ? undefined : 5}
                  value={row.endHour}
                  onChange={(e) => updateRow(row.id, { endHour: Number(e.target.value) })}
                  className={selectClass}
                  aria-label="End hour"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h} className="text-slate-900">
                      {pad(h)}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-semibold text-slate-500" aria-hidden>
                  {settingsPage.scheduleHourUnit}
                </span>
                <span className="text-slate-400" aria-hidden>
                  :
                </span>
                <select
                  size={compact ? undefined : 5}
                  value={row.endMinute}
                  onChange={(e) => updateRow(row.id, { endMinute: Number(e.target.value) })}
                  className={selectClass}
                  aria-label="End minute"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m} className="text-slate-900">
                      {pad(m)}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-semibold text-slate-500" aria-hidden>
                  {settingsPage.scheduleMinuteUnit}
                </span>
              </div>
            </div>
          </div>

          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
            {formatScheduleSentence(row)}
          </p>
        </div>
        ))
        : null}

      {!alwaysOn ? (
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {settingsPage.scheduleAddWindow}
        </button>
      ) : null}
    </div>
  );
}
