import { cookies } from "next/headers";
import { GIU_LOCALE_COOKIE, normalizeGiuLocale, type GiuLocale } from "./i18n";

/** Server-side locale from cookie (defaults to Vietnamese). */
export async function getGiuLocaleServer(): Promise<GiuLocale> {
  const jar = await cookies();
  const raw = jar.get(GIU_LOCALE_COOKIE)?.value;
  if (!raw) return "vi";
  return normalizeGiuLocale(raw);
}
