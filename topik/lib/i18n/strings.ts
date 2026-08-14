import type { TopikUiLocale } from "@/topik/lib/i18n/locale";
import { ko } from "@/topik/lib/i18n/ko-strings";
import { viStrings } from "@/topik/lib/i18n/vi-strings";

export type ViStrings = typeof viStrings;

export function stringsForLocale(locale: TopikUiLocale): ViStrings {
  return (locale === "ko" ? ko : viStrings) as ViStrings;
}

export { ko, viStrings };
