import { getRequestTopikLocale } from "@/topik/lib/i18n/request-locale";
import { stringsForLocale } from "@/topik/lib/i18n/strings";

/** Server components only — respects cookie / ?lang=ko / /topik/ko */
export async function getUiStrings() {
  const locale = await getRequestTopikLocale();
  return stringsForLocale(locale);
}
