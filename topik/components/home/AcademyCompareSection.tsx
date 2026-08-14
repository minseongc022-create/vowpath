"use client";

import { ACADEMY_COMPARE_ROWS, APP_COMPARE_ROWS } from "@/topik/lib/academy/academy-compare";
import { useTopikVi, useIsKoLocale } from "@/topik/lib/i18n/TopikLocaleProvider";

export function AcademyCompareSection() {
  const vi = useTopikVi();
  const ko = useIsKoLocale();

  return (
    <section className="topik-advantages-box mb-5 topik-animate-in">
      <p className="topik-section-title">{ko ? vi.academy.compareTitleKo : vi.academy.compareTitle}</p>
      <p className="mb-3 text-xs text-learn-ink-muted">
        {ko ? vi.academy.compareHintKo : vi.academy.compareHint}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-xs">
          <thead>
            <tr className="text-left text-learn-ink-muted">
              <th className="pb-2 pr-2 font-semibold" />
              <th className="pb-2 pr-2 font-semibold">{ko ? vi.academy.colAcademyKo : vi.academy.colAcademy}</th>
              <th className="pb-2 font-semibold text-learn-primary">
                {ko ? vi.academy.colUsKo : vi.academy.colUs}
              </th>
            </tr>
          </thead>
          <tbody>
            {ACADEMY_COMPARE_ROWS.map((row) => (
              <tr key={row.id} className="border-t border-learn-border">
                <td className="py-2 pr-2 font-medium text-learn-ink">
                  {ko ? row.categoryKo : row.categoryVi}
                </td>
                <td className="py-2 pr-2 text-learn-ink-muted">{ko ? row.academyKo : row.academyVi}</td>
                <td className="py-2 font-medium text-learn-ink">{ko ? row.usKo : row.usVi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="topik-advantages-list mt-4">
        {APP_COMPARE_ROWS.map((row) => (
          <li key={row.id}>
            <strong>{ko ? row.nameKo : row.nameVi}</strong>
            <span className="block text-learn-ink">✓ {ko ? row.usKo : row.usVi}</span>
            <span className="block text-xs text-learn-ink-muted mt-0.5">✗ {ko ? row.themKo : row.themVi}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
