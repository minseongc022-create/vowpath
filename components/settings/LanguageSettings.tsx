"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { UiLocale } from "@/lib/locale";

const OPTIONS: { id: UiLocale; labelEn: string; labelKo: string; native: string }[] = [
  { id: "en", labelEn: "English", labelKo: "영어", native: "English" },
  { id: "ko", labelEn: "Korean", labelKo: "한국어", native: "한국어" },
];

export function LanguageSettings({
  compact = false,
  variant = "dark",
}: {
  compact?: boolean;
  variant?: "dark" | "light";
}) {
  const { locale, setLocale, isEnglish } = useLocale();
  const light = variant === "light";

  if (compact) {
    return (
      <div
        className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${
          light
            ? "border-brand-200/80 bg-brand-50/60"
            : "border-white/10 bg-white/[0.03]"
        }`}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id)}
            className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
              locale === opt.id
                ? light
                  ? "bg-white text-brand-900 shadow-sm"
                  : "bg-brand-500/20 text-brand-200"
                : light
                  ? "text-stone-600 hover:text-brand-900"
                  : "text-slate-400 hover:text-slate-200"
            }`}
            aria-pressed={locale === opt.id}
          >
            {opt.id.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {isEnglish ? "Language" : "언어"}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        {isEnglish
          ? "Choose the dashboard language. Built-in English and Korean avoid browser auto-translate breaking the app."
          : "대시보드 표시 언어를 선택하세요. 영어·한국어는 앱에 내장되어 있어 브라우저 자동 번역 없이 안정적으로 보입니다."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              locale === opt.id
                ? "border-brand-500 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
            aria-pressed={locale === opt.id}
          >
            {opt.native}
            <span className="ml-1.5 text-xs font-medium text-slate-500">
              ({isEnglish ? opt.labelEn : opt.labelKo})
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
