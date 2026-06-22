"use client";

import { useMemo, useState } from "react";
import type { SlotGridDay, SlotGridItem } from "@/lib/scheduling/slot-grid";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";

type LinkIntakeSlotCalendarProps = {
  days: SlotGridDay[];
  selectedSlotId: string | null;
  onSelect: (slot: SlotGridItem) => void;
  durationMinutes: number;
  bufferMinutes: number;
  maxConcurrentVisits: number;
};

export function LinkIntakeSlotCalendar({
  days,
  selectedSlotId,
  onSelect,
  durationMinutes,
  bufferMinutes,
  maxConcurrentVisits,
}: LinkIntakeSlotCalendarProps) {
  const firstWithOpen = days.find((d) => d.slots.some((s) => s.status === "available"));
  const [selectedDate, setSelectedDate] = useState(firstWithOpen?.date ?? days[0]?.date ?? "");

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? days[0],
    [days, selectedDate],
  );

  if (!days.length) {
    return <p className="text-sm text-slate-500">{copy.slotStepEmpty}</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">
        {copy.slotCalendarHint(durationMinutes, bufferMinutes, maxConcurrentVisits)}
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const openCount = day.slots.filter((s) => s.status === "available").length;
          const active = day.date === selectedDay?.date;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              className={`min-w-[4.5rem] shrink-0 rounded-2xl border px-3 py-3 text-center transition ${
                active
                  ? "border-brand-700 bg-brand-700 text-white shadow-md"
                  : openCount > 0
                    ? "border-slate-200 bg-white text-slate-800"
                    : "border-slate-100 bg-slate-50 text-slate-400"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">
                {day.weekdayLabel}
              </span>
              <span className="mt-0.5 block text-sm font-bold">{day.monthDayLabel}</span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">{copy.slotDayLabel(selectedDay.weekdayLabel)}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {selectedDay.slots.map((slot) => {
              const selectable = slot.status === "available";
              const selected = selectedSlotId === slot.id;
              const isPast = slot.status === "past";
              const isBlocked = slot.status === "blocked";
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => selectable && onSelect(slot)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                    isPast
                      ? "cursor-not-allowed border-slate-100 bg-slate-50/80 text-slate-400"
                      : isBlocked
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through decoration-slate-300/80"
                        : selected
                          ? "border-brand-700/40 bg-brand-700/5 text-brand-700 ring-2 ring-brand-500/15"
                          : "border-slate-200 bg-white text-slate-800 hover:border-brand-700/30"
                  }`}
                  aria-pressed={selected}
                  aria-disabled={!selectable}
                >
                  {slot.label}
                  {isBlocked ? (
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-300">
                      {copy.slotUnavailable}
                    </span>
                  ) : isPast ? (
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                      {copy.slotPast}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-slate-400">{copy.slotCalendarLegend}</p>
    </div>
  );
}
