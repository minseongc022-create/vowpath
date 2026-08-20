/**
 * Value normalization. Isolated so that "Toss started sending prices as
 * '19,900원'" is a one-file fix, not a hunt.
 */

const NUMERIC_JUNK = /[^\d.-]/g;

/** "19,900원" | 19900 | "19900.0" → 19900. Returns null when not a number. */
export function toInt(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(NUMERIC_JUNK, "");
    if (!cleaned || cleaned === "-" || cleaned === ".") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

/** Rating-style decimals: keeps two places, no rounding to int. */
export function toFloat(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.replace(NUMERIC_JUNK, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function toText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return null;
}

export function toBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "y", "yes", "1", "sold_out", "soldout"].includes(v)) return true;
    if (["false", "n", "no", "0", "on_sale", "onsale"].includes(v)) return false;
  }
  return null;
}

/** Product ids arrive as number or string; the time series needs one form. */
export function toId(value: unknown): string | null {
  const text = toText(value);
  if (!text) return null;
  return text.length > 128 ? text.slice(0, 128) : text;
}

export function toAbsoluteUrl(value: unknown, base: string): string | null {
  const text = toText(value);
  if (!text) return null;
  try {
    return new URL(text, base).toString();
  } catch {
    return null;
  }
}

/**
 * Collection day in KST. Snapshots are keyed by this, so a run at 23:50 KST
 * and a retry at 00:10 KST land on different days on purpose.
 */
export function kstDay(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
