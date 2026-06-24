"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/lib/constants";
import { getVowDashboardCopy } from "@/lib/content";
import { runtimeUiLocale, isEnglishUi } from "@/lib/locale";
import { safeDashboardFetch } from "@/lib/dashboard-fetch";
import {
  buildMonthGrid,
  calendarPriorityMeta,
  endOfMonth,
  eventsOnDay,
  isSameDay,
  monthTitle,
  startOfMonth,
  type CalendarEvent,
} from "@/lib/calendar-events";

type ScheduleResponse = {
  events: CalendarEvent[];
  from: string;
  to: string;
  error?: string;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayHeading(day: Date): string {
  return day.toLocaleDateString(isEnglishUi() ? "en-US" : "ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatEventTimeShort(startAt: string): string {
  return new Date(startAt).toLocaleTimeString(isEnglishUi() ? "en-US" : "ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type CalendarLabels = ReturnType<typeof getVowDashboardCopy>["calendar"];

function DayEventsListPanel({
  day,
  events,
  selectedEventId,
  onSelectEvent,
  labels,
}: {
  day: Date;
  events: CalendarEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: CalendarEvent) => void;
  labels: CalendarLabels;
}) {
  return (
    <div className="rounded-2xl border border-brand-200/70 bg-white p-5">
      <h2 className="text-lg font-semibold text-brand-950">{formatDayHeading(day)}</h2>
      <p className="mt-1 text-sm text-stone-600">{labels.dayEventsTitle(events.length)}</p>

      {events.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">{labels.noEventsOnDay}</p>
      ) : (
        <ul className="mt-4 max-h-[min(60vh,520px)] space-y-2 overflow-y-auto pr-1">
          {events.map((ev) => {
            const active = selectedEventId === ev.id;
            const pri = ev.priority ? calendarPriorityMeta(ev.priority) : null;
            const sourceCls =
              ev.source === "vowroad"
                ? "bg-brand-100 text-brand-800"
                : "bg-sky-100 text-sky-800";

            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(ev)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-brand-500/50 bg-brand-500/15 ring-1 ring-brand-500/30"
                      : "border-brand-200 bg-white hover:border-brand-300 hover:bg-brand-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-950">{ev.customerName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceCls}`}>
                      {ev.source === "vowroad" ? labels.sourceVowroad : labels.sourceJobber}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-brand-300">{formatEventTimeShort(ev.startAt)}</p>
                  <p className="mt-1 truncate text-xs text-stone-600">{ev.issue}</p>
                  {pri ? (
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${pri.chipClass}`}
                    >
                      {pri.label}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EventDetailPanel({
  event,
  onBack,
  labels,
}: {
  event: CalendarEvent;
  onBack: () => void;
  labels: CalendarLabels;
}) {
  const sourceLabel =
    event.source === "vowroad" ? labels.sourceVowroad : labels.sourceJobber;
  const sourceCls =
    event.source === "vowroad"
      ? "bg-brand-500/20 text-brand-200"
      : "bg-sky-500/20 text-sky-200";

  return (
    <div className="rounded-2xl border border-brand-200/70 bg-white p-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-brand-800 hover:text-brand-900 hover:underline"
      >
        {labels.backToDayList}
      </button>

      <div className="mt-4 flex items-start justify-between gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sourceCls}`}>
          {sourceLabel}
        </span>
      </div>

      <h2 className="mt-3 text-lg font-semibold text-brand-950">{event.customerName}</h2>
      <p className="mt-1 text-sm text-brand-300">{event.timeLabel}</p>

      <dl className="mt-5 space-y-3 text-sm">
        {event.phone ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {labels.phone}
            </dt>
            <dd className="mt-0.5 text-stone-700">
              <a href={`tel:${event.phone}`} className="hover:text-brand-300">
                {event.phone}
              </a>
            </dd>
          </div>
        ) : null}
        {event.address ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {labels.address}
            </dt>
            <dd className="mt-0.5 text-stone-700">{event.address}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {labels.issue}
          </dt>
          <dd className="mt-0.5 text-stone-700">{event.issue}</dd>
        </div>
        {event.arrivalWindow ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {labels.time}
            </dt>
            <dd className="mt-0.5 text-stone-700">{event.arrivalWindow}</dd>
          </div>
        ) : null}
        {event.priority ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {labels.priority}
            </dt>
            <dd className="mt-0.5">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${calendarPriorityMeta(event.priority).chipClass}`}
              >
                {calendarPriorityMeta(event.priority).label}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>

      {event.bookingId ? (
        <Link
          href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(event.bookingId)}`}
          className="mt-5 inline-block text-sm font-medium text-brand-300 hover:underline"
        >
          {labels.viewBooking}
        </Link>
      ) : null}
    </div>
  );
}

function SidePanel({
  selectedDay,
  selectedEvent,
  events,
  onSelectEvent,
  onBackToList,
  labels,
}: {
  selectedDay: Date | null;
  selectedEvent: CalendarEvent | null;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onBackToList: () => void;
  labels: CalendarLabels;
}) {
  if (!selectedDay) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-brand-200/70 bg-stone-50 p-6 text-center">
        <p className="text-sm text-stone-600">{labels.selectDay}</p>
      </div>
    );
  }

  if (selectedEvent) {
    return <EventDetailPanel event={selectedEvent} onBack={onBackToList} labels={labels} />;
  }

  const dayEvents = eventsOnDay(events, selectedDay).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <DayEventsListPanel
      day={selectedDay}
      events={dayEvents}
      selectedEventId={null}
      onSelectEvent={onSelectEvent}
      labels={labels}
    />
  );
}

export function CalendarView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const c = getVowDashboardCopy(runtimeUiLocale()).calendar;
  const today = useMemo(() => new Date(), []);
  const gridDays = useMemo(() => buildMonthGrid(month), [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = startOfMonth(month);
      const to = endOfMonth(month);
      const q = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
      const res = await safeDashboardFetch(`/api/jobber/schedule?${q}`, 14_000);
      if (!res) {
        throw new Error(
          isEnglishUi() ? "Schedule request timed out." : "일정 요청 시간이 초과되었습니다.",
        );
      }
      const json = (await res.json()) as ScheduleResponse;
      if (!res.ok) throw new Error(json.error ?? "Load failed");
      setEvents(json.events ?? []);
      setError(null);
      setSelectedEvent((prev) => {
        if (!prev) return null;
        return (json.events ?? []).find((e) => e.id === prev.id) ?? null;
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isEnglishUi()
            ? "Couldn't load schedule."
            : "일정을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  function clearSelection() {
    setSelectedDay(null);
    setSelectedEvent(null);
  }

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    clearSelection();
  }

  function selectDay(day: Date) {
    setSelectedDay(day);
    setSelectedEvent(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-950">{c.title}</h1>
          <p className="mt-1 text-sm text-stone-600">{c.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="vow-dash-btn-secondary rounded-lg px-3 py-1.5 text-sm"
            aria-label={c.prevMonth}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => {
              setMonth(startOfMonth(new Date()));
              clearSelection();
            }}
            className="vow-dash-btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            {c.today}
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="vow-dash-btn-secondary rounded-lg px-3 py-1.5 text-sm"
            aria-label={c.nextMonth}
          >
            →
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="vow-dash-btn-secondary rounded-lg px-3 py-1.5 text-sm"
          >
            {c.refresh}
          </button>
        </div>
      </div>

      <p className="text-center text-lg font-semibold text-brand-950">{monthTitle(month)}</p>

      {loading && <p className="text-sm text-stone-600">{c.loading}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-2xl border border-brand-200/70 bg-white">
          <div className="grid grid-cols-7 border-b border-brand-200/70 bg-brand-50/80">
            {c.weekdays.map((wd, i) => (
              <div
                key={wd}
                className={`px-1 py-2 text-center text-xs font-semibold ${
                  i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-stone-600"
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {gridDays.map((day) => {
              const inMonth = day.getMonth() === month.getMonth();
              const dayEvents = eventsOnDay(events, day);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={toIsoDate(day)}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`min-h-[88px] border-b border-r border-brand-200/60 p-1.5 text-left transition sm:min-h-[96px] sm:p-2 ${
                    inMonth ? "bg-white" : "bg-stone-50/80"
                  } ${
                    isSelected
                      ? "ring-2 ring-inset ring-brand-500/60 bg-brand-50"
                      : "hover:bg-brand-50/50"
                  }`}
                >
                  <p
                    className={`mb-1 text-right text-xs font-semibold ${
                      isToday
                        ? "font-bold text-black"
                        : inMonth
                          ? "text-stone-500"
                          : "text-stone-400"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                  <div className="clear-both flex min-h-[2rem] flex-col items-center justify-center">
                    {hasEvents ? (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white sm:text-xs">
                        {c.eventCount(dayEvents.length)}
                      </span>
                    ) : inMonth ? (
                      <span className="hidden text-[10px] text-stone-400 sm:block">{c.noEventsDay}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <SidePanel
            selectedDay={selectedDay}
            selectedEvent={selectedEvent}
            events={events}
            onSelectEvent={setSelectedEvent}
            onBackToList={() => setSelectedEvent(null)}
            labels={c}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-brand-500/50" aria-hidden />
          {c.sourceVowroad}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-sky-500/50" aria-hidden />
          {c.sourceJobber}
        </span>
      </div>
    </div>
  );
}
