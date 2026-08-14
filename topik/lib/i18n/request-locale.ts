import { cache } from "react";
import { cookies, headers } from "next/headers";
import { defaultLocale, type TopikUiLocale } from "@/topik/lib/i18n/locale";

export const TOPIK_LOCALE_COOKIE = "topik-locale";

/** Per-request locale — cookie overrides env default (VN production stays vi without cookie). */
export const getRequestTopikLocale = cache(async (): Promise<TopikUiLocale> => {
  const h = await headers();
  const fromHeader = h.get("x-topik-locale");
  if (fromHeader === "ko" || fromHeader === "vi") return fromHeader;

  const cookieVal = (await cookies()).get(TOPIK_LOCALE_COOKIE)?.value;
  if (cookieVal === "ko" || cookieVal === "vi") return cookieVal;

  return defaultLocale();
});
