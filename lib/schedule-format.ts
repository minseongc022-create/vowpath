import { isEnglishUi } from "./locale";

export type ScheduleRow = {
  id: string;
  days: number[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  alwaysOn?: boolean;
};

export const SCHEDULE_ALWAYS_ON_LABEL = isEnglishUi()
  ? "Vowpath answers calls 24/7"
  : "24시간 Vowpath가 전화를 받습니다";

const DAY_OPTIONS_EN = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
] as const;

const DAY_OPTIONS_KO = [
  { id: 0, label: "일" },
  { id: 1, label: "월" },
  { id: 2, label: "화" },
  { id: 3, label: "수" },
  { id: 4, label: "목" },
  { id: 5, label: "금" },
  { id: 6, label: "토" },
] as const;

export const DAY_OPTIONS = isEnglishUi() ? DAY_OPTIONS_EN : DAY_OPTIONS_KO;

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTES = [0, 10, 20, 30, 40, 50];

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatTime(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

export function dayText(days: number[]) {
  return DAY_OPTIONS.filter((d) => days.includes(d.id))
    .map((d) => d.label)
    .join(", ");
}

export function isOvernight(row: ScheduleRow) {
  const start = row.startHour * 60 + row.startMinute;
  const end = row.endHour * 60 + row.endMinute;
  return end <= start;
}

export function formatScheduleSentence(row: ScheduleRow): string {
  if (row.alwaysOn) return SCHEDULE_ALWAYS_ON_LABEL;
  const days = dayText(row.days) || (isEnglishUi() ? "No days selected" : "요일 미선택");
  const start = formatTime(row.startHour, row.startMinute);
  const end = formatTime(row.endHour, row.endMinute);
  const endLabel = isOvernight(row)
    ? isEnglishUi()
      ? `next day ${end}`
      : `익일 ${end}`
    : end;
  return isEnglishUi()
    ? `${days} · ${start}–${endLabel} — Vowpath answers`
    : `${days} · ${start}~${endLabel}에 Vowpath가 전화를 받습니다`;
}

type StoredSchedulePayload = {
  days: number[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  alwaysOn?: boolean;
};

function parsePayload(value: string): StoredSchedulePayload | null {
  try {
    const data = JSON.parse(value) as StoredSchedulePayload;
    if (data.alwaysOn === true) {
      return { alwaysOn: true, days: [], startHour: 0, startMinute: 0, endHour: 0, endMinute: 0 };
    }
    if (!Array.isArray(data.days)) return null;
    return data;
  } catch {
    return null;
  }
}

export function alwaysOnScheduleRow(): ScheduleRow {
  return {
    id: "always-on",
    days: [0, 1, 2, 3, 4, 5, 6],
    startHour: 0,
    startMinute: 0,
    endHour: 23,
    endMinute: 59,
    alwaysOn: true,
  };
}

export function alwaysOnWindow() {
  return {
    id: "always-on",
    label: SCHEDULE_ALWAYS_ON_LABEL,
    value: JSON.stringify({ alwaysOn: true }),
  };
}

export function isAlwaysOnFromWindows(
  windows: { value: string }[],
  scheduleAlwaysOn?: boolean,
): boolean {
  if (scheduleAlwaysOn === true) return true;
  return windows.some((w) => {
    try {
      const data = JSON.parse(w.value) as { alwaysOn?: boolean };
      return data.alwaysOn === true;
    } catch {
      return false;
    }
  });
}

export function rowToWindow(row: ScheduleRow) {
  if (row.alwaysOn) return alwaysOnWindow();
  return {
    id: row.id,
    label: formatScheduleSentence(row),
    value: JSON.stringify({
      days: row.days,
      startHour: row.startHour,
      startMinute: row.startMinute,
      endHour: row.endHour,
      endMinute: row.endMinute,
    }),
  };
}

export function defaultScheduleRows(): ScheduleRow[] {
  return [
    {
      id: "w-1",
      days: [1, 2, 3, 4, 5],
      startHour: 17,
      startMinute: 0,
      endHour: 8,
      endMinute: 0,
    },
  ];
}

export function parseRowsFromStored(
  windows: { id: string; label: string; value: string }[],
): ScheduleRow[] {
  const safe = Array.isArray(windows)
    ? windows.filter(
        (w): w is { id: string; label: string; value: string } =>
          Boolean(w) &&
          typeof w.value === "string" &&
          typeof w.label === "string",
      )
    : [];
  if (safe.length === 0) return defaultScheduleRows();

  return safe.map((w, idx) => {
    const payload = parsePayload(w.value);
    if (payload) {
      if (payload.alwaysOn) return alwaysOnScheduleRow();
      return {
        id: w.id || `w-${idx + 1}`,
        days: payload.days,
        startHour: payload.startHour,
        startMinute: payload.startMinute,
        endHour: payload.endHour,
        endMinute: payload.endMinute,
      };
    }

    const days: number[] = [];
    if (/월/.test(w.label + w.value)) days.push(1);
    if (/화/.test(w.label + w.value)) days.push(2);
    if (/수/.test(w.label + w.value)) days.push(3);
    if (/목/.test(w.label + w.value)) days.push(4);
    if (/금/.test(w.label + w.value)) days.push(5);
    if (/토/.test(w.label + w.value)) days.push(6);
    if (/일/.test(w.label + w.value)) days.push(0);
    if (days.length === 0) days.push(1, 2, 3, 4, 5);

    const match = w.value.match(/(\d{2}):(\d{2}).*?(\d{2}):(\d{2})/);
    return {
      id: w.id || `w-${idx + 1}`,
      days,
      startHour: match ? Number(match[1]) : 17,
      startMinute: match ? Number(match[2]) : 0,
      endHour: match ? Number(match[3]) : 8,
      endMinute: match ? Number(match[4]) : 0,
    };
  });
}
