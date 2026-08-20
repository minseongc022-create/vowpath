export function formatKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatDelta(value: number | null | undefined, unit = ""): string {
  if (value === null || value === undefined || value === 0) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ko-KR")}${unit}`;
}

/** Rank delta is inverted: a positive rank_delta means the product climbed (better). */
export function rankDeltaTone(value: number | null | undefined): "up" | "down" | "flat" {
  if (!value) return "flat";
  return value > 0 ? "up" : "down";
}

export function priceDeltaTone(value: number | null | undefined): "up" | "down" | "flat" {
  if (!value) return "flat";
  // A price increase is "up" numerically but bad for the shopper — callers style accordingly.
  return value > 0 ? "up" : "down";
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}
