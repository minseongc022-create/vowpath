/** Allow http(s) image URLs for merchant box photos. */
export function isAllowedGiuImageUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (value.length > 500) return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeOptionalImageUrl(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return isAllowedGiuImageUrl(trimmed) ? trimmed : undefined;
}
