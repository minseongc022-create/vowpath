"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { DashboardUiLocale } from "@/lib/locale";

/** Dashboard language — English or Korean (restoration shop owners). */
export function DashboardLocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  function pick(next: DashboardUiLocale) {
    setLocale(next);
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-brand-200 bg-white p-0.5 text-[11px] font-semibold shadow-sm sm:text-xs ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        className={`min-h-[28px] rounded-full px-2.5 py-0.5 transition sm:min-h-[32px] sm:px-3 sm:py-1 ${
          locale === "en" ? "bg-brand-900 text-white" : "text-stone-600 hover:text-brand-900"
        }`}
        aria-pressed={locale === "en"}
        onClick={() => pick("en")}
      >
        English
      </button>
      <button
        type="button"
        className={`min-h-[28px] rounded-full px-2.5 py-0.5 transition sm:min-h-[32px] sm:px-3 sm:py-1 ${
          locale === "ko" ? "bg-brand-900 text-white" : "text-stone-600 hover:text-brand-900"
        }`}
        aria-pressed={locale === "ko"}
        onClick={() => pick("ko")}
      >
        한국어
      </button>
    </div>
  );
}
