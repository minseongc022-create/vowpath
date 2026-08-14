import { TOPIK_UI_LOCALE } from "@/topik/lib/i18n/locale";
import { stringsForLocale, type ViStrings } from "@/topik/lib/i18n/strings";

export { stringsForLocale, type ViStrings } from "@/topik/lib/i18n/strings";

/** Legacy — use getUiStrings() from server-strings in Server Components */
export const vi = stringsForLocale(TOPIK_UI_LOCALE);
