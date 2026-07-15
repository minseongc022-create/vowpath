/** UI locale — English default on app; Spanish on marketing site only. */

export type UiLocale = "en" | "es";

export const UI_LOCALE_STORAGE_KEY = "effiroad:ui-locale";
export const UI_LOCALE_COOKIE = "effiroad_locale";

export const UI_LOCALE = (process.env.NEXT_PUBLIC_LOCALE ?? "en").toLowerCase();

export function defaultUiLocale(): UiLocale {
  if (UI_LOCALE === "es" || UI_LOCALE.startsWith("es-")) return "es";
  return "en";
}

/** Legacy Korean values map to English. */
export function parseUiLocale(value: string | null | undefined): UiLocale | null {
  if (!value) return null;
  if (value === "ko" || value.startsWith("ko")) return "en";
  if (value === "en" || value.startsWith("en")) return "en";
  if (value === "es" || value.startsWith("es")) return "es";
  return null;
}

export function isSpanishUiLocale(locale: UiLocale): boolean {
  return locale === "es";
}

export function isEnglishUiLocale(locale: UiLocale): boolean {
  return locale === "en";
}

/** Marketing pages: English or Spanish. */
export function marketingUiLocale(locale: UiLocale): "en" | "es" {
  return locale === "es" ? "es" : "en";
}

export function uiLocaleHtmlLang(locale: UiLocale): string {
  return locale === "es" ? "es" : "en";
}

/** Dashboard and shop AI are English-only. */
export function shopAiLocale(_locale: UiLocale = "en"): "en" {
  return "en";
}

/** Build-time / fallback when no cookie is available. */
export function isEnglishUi(): boolean {
  return isEnglishUiLocale(defaultUiLocale());
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
  if (stored) {
    if (localStorage.getItem(UI_LOCALE_STORAGE_KEY) === "ko") {
      persistUiLocale("en");
    }
    return stored;
  }

  const match = document.cookie.match(new RegExp(`${UI_LOCALE_COOKIE}=([^;]+)`));
  const fromCookie = parseUiLocale(match?.[1]);
  if (fromCookie) {
    if (match?.[1] === "ko") {
      persistUiLocale("en");
    }
    return fromCookie;
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
