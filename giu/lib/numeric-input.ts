/** Strip leading zeros and non-digits for quantity-style inputs. */
export function sanitizeQuantityInput(raw: string, max = 50): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = Math.min(max, parseInt(digits, 10));
  if (!Number.isFinite(n) || n < 1) return "";
  return String(n);
}

export function parseQuantityInput(raw: string, max = 50): number | null {
  const cleaned = sanitizeQuantityInput(raw, max);
  if (!cleaned) return null;
  return parseInt(cleaned, 10);
}
