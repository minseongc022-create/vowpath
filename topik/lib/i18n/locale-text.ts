import { TOPIK_UI_LOCALE, type TopikUiLocale } from "@/topik/lib/i18n/locale";

export function isKoLocale(): boolean {
  return TOPIK_UI_LOCALE === "ko";
}

export function getUiLocale(): TopikUiLocale {
  return TOPIK_UI_LOCALE;
}

/** Pick Vietnamese or Korean UI string */
export function l(vi: string, ko: string): string {
  return isKoLocale() ? ko : vi;
}
