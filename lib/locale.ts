/** UI locale — English default; Korean + user override via cookie/localStorage. */

export type UiLocale = "en" | "ko";

export const UI_LOCALE_STORAGE_KEY = "vowpath:ui-locale";
export const UI_LOCALE_COOKIE = "vowpath_locale";

export const UI_LOCALE = (process.env.NEXT_PUBLIC_LOCALE ?? "en").toLowerCase();

export function defaultUiLocale(): UiLocale {
  if (UI_LOCALE === "ko" || UI_LOCALE.startsWith("ko-")) return "ko";
  return "en";
}

export function parseUiLocale(value: string | null | undefined): UiLocale | null {
  if (value === "en" || value === "ko") return value;
  if (value?.startsWith("ko")) return "ko";
  if (value?.startsWith("en")) return "en";
  return null;
}

export function isEnglishUiLocale(locale: UiLocale): boolean {
  return locale !== "ko";
}

/** Build-time / fallback when no cookie is available. */
export function isEnglishUi(): boolean {
  return isEnglishUiLocale(defaultUiLocale());
}

export function isEnglishMarketing(): boolean {
  return isEnglishUi();
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

  return defaultUiLocale();
}

export function persistUiLocale(locale: UiLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  document.cookie = `${UI_LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.lang = locale === "ko" ? "ko" : "en";
}

/** Locale for copy resolution — cookie/localStorage on client, env default on server. */
export function runtimeUiLocale(): UiLocale {
  if (typeof window !== "undefined") return readClientUiLocale();
  return defaultUiLocale();
}
