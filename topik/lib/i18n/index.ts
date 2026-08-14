import { TOPIK_UI_LOCALE } from "@/topik/lib/i18n/locale";
import { ko } from "@/topik/lib/i18n/ko-strings";
import { viStrings } from "@/topik/lib/i18n/vi-strings";

export const vi = TOPIK_UI_LOCALE === "ko" ? ko : viStrings;
export type ViStrings = typeof vi;
