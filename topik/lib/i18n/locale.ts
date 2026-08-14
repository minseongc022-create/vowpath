/** UI locale — production VN: vi. Dev: set NEXT_PUBLIC_TOPIK_LOCALE=ko */
export type TopikUiLocale = "ko" | "vi";

export function defaultLocale(): TopikUiLocale {
  const env = process.env.NEXT_PUBLIC_TOPIK_LOCALE as TopikUiLocale | undefined;
  if (env === "ko" || env === "vi") return env;
  return process.env.NODE_ENV === "production" ? "vi" : "ko";
}

/** Build-time fallback — prefer getRequestTopikLocale() on the server. */
export const TOPIK_UI_LOCALE: TopikUiLocale = defaultLocale();
