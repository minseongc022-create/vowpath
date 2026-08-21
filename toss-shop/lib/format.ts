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
