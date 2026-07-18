import type { UiLocale } from "./locale";

/** Deep-merge overlay onto base (overlay wins on conflicts). */
export function mergeDeep(base: unknown, overlay: unknown): unknown {
  if (overlay === null || overlay === undefined) return base;
  if (typeof overlay !== "object" || Array.isArray(overlay)) return overlay;
  if (typeof base !== "object" || base === null || Array.isArray(base)) return { ...overlay };
  const b = base as Record<string, unknown>;
  const o = overlay as Record<string, unknown>;
  const out: Record<string, unknown> = { ...b };
  for (const key of Object.keys(o)) {
    out[key] = mergeDeep(b[key], o[key]);
  }
  return out;
}

export function pickLocaleCopy<T>(locale: UiLocale, ko: unknown, en: unknown): T {
  if (locale === "ko") {
    return mergeDeep(en, ko) as T;
  }
  return mergeDeep(ko, en) as T;
}
