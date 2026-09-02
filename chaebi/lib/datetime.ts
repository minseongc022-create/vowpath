/**
 * 시간 계산 — 전부 Asia/Seoul 기준.
 *
 * 서버는 UTC로 돈다. "오늘 저녁"이 서버 기준으로 어제가 되는 사고를 막으려면
 * 날짜 판단이 한 곳에만 있어야 해서, 날짜·시각을 다루는 코드는 전부 여기 모은다.
 * 한국은 서머타임이 없어 UTC+9 고정이라 오프셋 계산이 단순하다.
 */

const TZ = "Asia/Seoul";
const KST_OFFSET_MIN = 9 * 60;

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "2026-08-30" (서울 기준 오늘) */
export function seoulDateISO(at: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(at);
}

/** "14:05" (서울 기준 현재 시각) */
export function seoulTime(at: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(at);
}

/** 0=일요일 */
export function dayOfWeek(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split("-").map(Number);
  const [y2, m2, d2] = toISO.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

/** "8월 31일 (일)" */
export function formatKoreanDate(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number);
  return `${m}월 ${d}일 (${DAY_NAMES[dayOfWeek(dateISO)]})`;
}

/** "오늘", "내일", "모레", 그 밖에는 날짜 */
export function relativeDayLabel(dateISO: string, todayISO: string): string {
  const diff = daysBetween(todayISO, dateISO);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  if (diff < 0) return formatKoreanDate(dateISO);
  if (diff <= 7) return `${formatKoreanDate(dateISO)} · ${diff}일 뒤`;
  return formatKoreanDate(dateISO);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "오후 7시", "오후 7시 30분" — 화면에 쓰는 표기 */
export function formatKoreanTime(time: string): string {
  const total = timeToMinutes(time);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const period = h24 < 12 ? "오전" : "오후";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${period} ${h12}시` : `${period} ${h12}시 ${m}분`;
}

/** 서울 기준 (날짜, 시각)을 epoch ms로. */
export function seoulEpoch(dateISO: string, time: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, timeToMinutes(time) - KST_OFFSET_MIN);
}

/** 지금부터 그 시각까지 남은 시간(시간 단위, 소수 가능). 지났으면 음수. */
export function hoursUntil(dateISO: string, time: string, now: Date = new Date()): number {
  return (seoulEpoch(dateISO, time) - now.getTime()) / 3_600_000;
}

/** "3시간 20분 뒤", "2일 뒤" — 카운트다운 표기 */
export function formatCountdown(targetEpoch: number, now: number): string {
  const diffMs = targetEpoch - now;
  if (diffMs <= 0) return "지금";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}분 뒤`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}시간 ${rest}분 뒤` : `${hours}시간 뒤`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days}일 ${restHours}시간 뒤` : `${days}일 뒤`;
}
