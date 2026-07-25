/** UI locale — English default; Spanish on marketing; Korean on dashboard/settings. */

export type UiLocale = "en" | "es" | "ko";

/** Dashboard + settings toggle (excludes Spanish). */
export type DashboardUiLocale = "en" | "ko";

export const UI_LOCALE_STORAGE_KEY = "effiroad:ui-locale";
export const UI_LOCALE_COOKIE = "effiroad_locale";

export const UI_LOCALE = (process.env.NEXT_PUBLIC_LOCALE ?? "en").toLowerCase();

export function defaultUiLocale(): UiLocale {
  if (UI_LOCALE === "es" || UI_LOCALE.startsWith("es-")) return "es";
  return "en";
}

export function parseUiLocale(value: string | null | undefined): UiLocale | null {
  if (!value) return null;
  if (value === "ko" || value.startsWith("ko")) return "ko";
  if (value === "en" || value.startsWith("en")) return "en";
  if (value === "es" || value.startsWith("es")) return "es";
  return null;
}

export function isSpanishUiLocale(locale: UiLocale): boolean {
  return locale === "es";
}

export function isKoreanUiLocale(locale: UiLocale): boolean {
  return locale === "ko";
}

export function isEnglishUiLocale(locale: UiLocale): boolean {
  return locale === "en";
}

/** Marketing pages: English or Spanish (Korean maps to English on landing). */
export function marketingUiLocale(locale: UiLocale): "en" | "es" {
  return locale === "es" ? "es" : "en";
}

export function uiLocaleHtmlLang(locale: UiLocale): string {
  if (locale === "es") return "es";
  if (locale === "ko") return "ko";
  return "en";
}

/** Shop AI replies in English; forwarding help matches user question language. */
export function shopAiLocale(_locale: UiLocale = "en"): "en" {
  return "en";
}

/**
 * Runtime UI language check — uses cookie/localStorage on the client so the
 * dashboard KO/EN toggle actually switches status labels, priorities, etc.
 * On the server (no request cookies in this helper) falls back to env default.
 */
export function isEnglishUi(): boolean {
  return isEnglishUiLocale(runtimeUiLocale());
}

export function isEnglishMarketing(): boolean {
  return marketingUiLocale(defaultUiLocale()) === "en";
}

export async function resolveServerUiLocale(): Promise<UiLocale> {
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const fromCookie = parseUiLocale(jar.get(UI_LOCALE_COOKIE)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    // static build / edge without request cookies
  }
  return defaultUiLocale();
}

export function readClientUiLocale(): UiLocale {
  if (typeof window === "undefined") return defaultUiLocale();

  const stored = parseUiLocale(localStorage.getItem(UI_LOCALE_STORAGE_KEY));
  if (stored) return stored;

  const match = document.cookie.match(new RegExp(`${UI_LOCALE_COOKIE}=([^;]+)`));
  const fromCookie = parseUiLocale(match?.[1]);
  if (fromCookie) return fromCookie;

  // First visit on dashboard: prefer Korean browser if set
  if (typeof navigator !== "undefined") {
    const langs = [navigator.language, ...(navigator.languages ?? [])];
    if (langs.some((l) => l?.toLowerCase().startsWith("ko"))) {
      return "ko";
    }
  }

  return defaultUiLocale();
}

export function persistUiLocale(locale: UiLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  document.cookie = `${UI_LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.lang = uiLocaleHtmlLang(locale);
}

/** Locale for copy resolution — cookie/localStorage on client, env default on server. */
export function runtimeUiLocale(): UiLocale {
  if (typeof window !== "undefined") return readClientUiLocale();
  return defaultUiLocale();
}
