/** Allow http(s) image URLs and GIU-uploaded product photos. */
export function isAllowedGiuImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (/^\/api\/giu\/product-images\/[a-f0-9]{24}$/.test(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    if (/^\/api\/giu\/product-images\/[a-f0-9]{24}$/.test(u.pathname)) return true;
  } catch {
    /* not absolute URL */
  }
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (trimmed.length > 500) return false;
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
