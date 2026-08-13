import { viMessages } from "./vi-messages";
import { en } from "./en";
import { zh } from "./zh";
import { id } from "./id";
import { th } from "./th";
import { ja } from "./ja";
import type { TopikLocale, TopikStrings } from "./types";

export type { TopikLocale, TopikStrings };
export { TOPIK_LOCALES } from "./types";

const MAP: Record<TopikLocale, TopikStrings> = {
  vi: viMessages,
  en,
  zh,
  id,
  th,
  ja,
};

export function getTopikStrings(locale: TopikLocale = "vi"): TopikStrings {
  return MAP[locale] ?? MAP.vi;
}

export function parseTopikLocale(raw?: string | null): TopikLocale {
  if (raw && raw in MAP) return raw as TopikLocale;
  return "vi";
}
