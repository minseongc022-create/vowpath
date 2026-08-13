"use client";

import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { TOPIK_LOCALES } from "@/topik/lib/i18n";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { cn } from "@/learn/lib/utils";

export function SettingsClient() {
  const { locale, setLocale, t } = useTopikLocale();

  return (
    <div className="topik-animate-in">
      <TopikPageHeader title={t.modes.settings} subtitle="Ngôn ngữ giao diện · Interface language" />

      <p className="topik-section-title mb-3">Ngôn ngữ / Language</p>
      <div className="topik-mode-list">
        {TOPIK_LOCALES.map((loc) => (
          <button
            key={loc.code}
            type="button"
            className={cn("topik-mode-row w-full text-left", locale === loc.code && "bg-[var(--topik-primary-soft)]")}
            onClick={() => setLocale(loc.code)}
          >
            <span className="flex-1 text-sm font-medium text-learn-ink">{loc.native}</span>
            <span className="text-xs text-learn-ink-muted">{loc.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs text-learn-ink-muted leading-relaxed">
        Hỗ trợ người học tiếng Hàn từ Việt Nam, Trung Quốc, Indonesia, Thái Lan, Nhật Bản và quốc tế (English).
      </p>
    </div>
  );
}
