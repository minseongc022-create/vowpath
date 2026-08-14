/** UI locale — dev: ko. Production VN launch: change to "vi" */
export type TopikUiLocale = "ko" | "vi";

export const TOPIK_UI_LOCALE: TopikUiLocale =
  (process.env.NEXT_PUBLIC_TOPIK_LOCALE as TopikUiLocale | undefined) ?? "ko";
