/** Locale-aware UI strings — client-safe re-export */
import { TOPIK_UI_LOCALE } from "@/topik/lib/i18n/locale";
import { stringsForLocale, type ViStrings } from "@/topik/lib/i18n/strings";

export type { ViStrings };
export const vi = stringsForLocale(TOPIK_UI_LOCALE);
