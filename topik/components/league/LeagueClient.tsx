"use client";

import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";

export function LeagueClient() {
  const t = useTopikStrings();
  return (
    <div className="topik-animate-in">
      <TopikPageHeader title={t.league.title} subtitle={t.league.comingSoon} />
      <div className="topik-card flex flex-col items-center p-8 text-center">
        <span className="text-4xl" aria-hidden>
          🏛️
        </span>
        <p className="mt-4 text-sm text-learn-ink-muted">{t.league.comingSoon}</p>
      </div>
    </div>
  );
}
