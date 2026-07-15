"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { UiLocale } from "@/lib/locale";

/** Public marketing language — English or Spanish. */
export function PublicLocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  function pick(next: UiLocale) {
    setLocale(next);
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-brand-200 bg-white p-0.5 text-xs font-semibold shadow-sm ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        className={`min-h-[32px] rounded-full px-3 py-1 transition ${
          locale === "en" ? "bg-brand-900 text-white" : "text-stone-600 hover:text-brand-900"
        }`}
        aria-pressed={locale === "en"}
        onClick={() => pick("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={`min-h-[32px] rounded-full px-3 py-1 transition ${
          locale === "es" ? "bg-brand-900 text-white" : "text-stone-600 hover:text-brand-900"
        }`}
        aria-pressed={locale === "es"}
        onClick={() => pick("es")}
      >
        ES
      </button>
    </div>
  );
}
