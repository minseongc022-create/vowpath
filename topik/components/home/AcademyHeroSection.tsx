"use client";

import { useTopikVi, useIsKoLocale } from "@/topik/lib/i18n/TopikLocaleProvider";

export function AcademyHeroSection() {
  const vi = useTopikVi();
  const ko = useIsKoLocale();

  return (
    <section className="topik-card-soft mb-4 overflow-hidden topik-animate-in">
      <div className="bg-gradient-to-br from-[#2d4a6f] via-learn-primary to-[#e8a855] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
          {ko ? vi.academy.badgeKo : vi.academy.badge}
        </p>
        <h2 className="mt-1 text-lg font-bold leading-snug">
          {ko ? vi.academy.headlineKo : vi.academy.headline}
        </h2>
        <p className="mt-2 text-sm opacity-90 leading-relaxed">
          {ko ? vi.academy.subheadKo : vi.academy.subhead}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(ko ? vi.academy.statsKo : vi.academy.stats).map((s) => (
            <div key={s.label} className="rounded-xl bg-white/15 px-2 py-2 text-center">
              <p className="text-base font-bold">{s.value}</p>
              <p className="text-[10px] leading-tight opacity-90">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
