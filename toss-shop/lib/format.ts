export function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatPct(value: number, signed = true): string {
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

export function formatRankDelta(current: number, prev: number): { delta: number; label: string } {
  const delta = prev - current;
  if (delta > 0) return { delta, label: `▲${delta}` };
  if (delta < 0) return { delta, label: `▼${Math.abs(delta)}` };
  return { delta: 0, label: "—" };
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Minute bucket for real-time snapshots (UTC). */
export function minuteKey(d = new Date()): string {
  return d.toISOString().slice(0, 16);
}

export const MAX_SNAPSHOTS_PER_SERIES = 1440;

export function appendCapped<T>(arr: T[], item: T, max = MAX_SNAPSHOTS_PER_SERIES): T[] {
  const next = [...arr, item];
  return next.length > max ? next.slice(next.length - max) : next;
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    food: "식품",
    beauty: "뷰티",
    home: "생활/가전",
    digital: "디지털",
    fashion: "패션",
    health: "건강",
  };
  return labels[category] ?? category;
}

export function competitionGradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    excellent: "아주좋음",
    good: "좋음",
    fair: "보통",
    poor: "나쁨",
  };
  return labels[grade] ?? grade;
}

export function formatCompact(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString("ko-KR");
}
