/** UI locale — production VN: vi. Dev: set NEXT_PUBLIC_TOPIK_LOCALE=ko */
export type TopikUiLocale = "ko" | "vi";

function defaultLocale(): TopikUiLocale {
  const env = process.env.NEXT_PUBLIC_TOPIK_LOCALE as TopikUiLocale | undefined;
  if (env === "ko" || env === "vi") return env;
  return process.env.NODE_ENV === "production" ? "vi" : "ko";
}

export const TOPIK_UI_LOCALE: TopikUiLocale = defaultLocale();
