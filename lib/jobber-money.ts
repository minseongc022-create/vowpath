/** Parse Jobber Money scalar / object / number into USD cents. */
export function parseJobberMoneyCents(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as { amount?: unknown; value?: unknown };
    if ("amount" in obj) return parseJobberMoneyCents(obj.amount);
    if ("value" in obj) return parseJobberMoneyCents(obj.value);
  }
  return 0;
}
