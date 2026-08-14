"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { getStudyModes } from "@/topik/lib/study-modes";
import { EXAM_CATALOG, SECTION_DRILLS, COMPETITOR_ADVANTAGES_VI } from "@/topik/lib/exams/catalog";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { TopikModeRow } from "@/topik/components/ui/TopikModeRow";

/** All TOPIK study modes + exam catalog + competitor-inspired advantages */
export function StudyHubClient() {
  const vi = useTopikVi();
  const studyModes = useMemo(() => getStudyModes(vi), [vi]);

  return (
    <div className="topik-animate-in space-y-6">
      <TopikPageHeader title={vi.studyHub.title} subtitle={vi.studyHub.subtitle} />

      <section>
        <p className="topik-section-title">{vi.exams.title}</p>
        <div className="topik-exam-catalog">
          {EXAM_CATALOG.map((exam) => (
            <Link key={exam.id} href={exam.href} className="topik-exam-card">
              <div className="topik-exam-card-head">
                <span className="topik-exam-card-title">{exam.titleVi}</span>
                {exam.badge && <span className="topik-badge">{exam.badge}</span>}
              </div>
              <p className="topik-exam-card-sub">{exam.subtitleVi}</p>
              <p className="topik-exam-card-meta">{exam.levels} · {exam.durationVi}</p>
            </Link>
          ))}
        </div>
        <Link href="/topik/placement" className="topik-btn topik-btn-outline topik-btn-lg mt-3">
          {vi.placement.title}
        </Link>
      </section>

      <section>
        <p className="topik-section-title">{vi.exams.sectionDrills}</p>
        <div className="topik-section-drill-grid">
          {SECTION_DRILLS.map((d) => (
            <Link key={d.id} href={d.href} className="topik-section-drill">
              <span className="topik-section-drill-title">{d.titleVi}</span>
              <span className="topik-section-drill-desc">{d.descVi}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="topik-section-title">{vi.studyHub.allModes}</p>
        <div className="topik-mode-list topik-study-hub-list">
          {studyModes.map((mode) => (
            <TopikModeRow key={mode.id} mode={mode} />
          ))}
        </div>
      </section>

      <section className="topik-advantages-box">
        <p className="topik-section-title">{vi.studyHub.whyUs}</p>
        <ul className="topik-advantages-list">
          {COMPETITOR_ADVANTAGES_VI.map((a) => (
            <li key={a.from}>
              <strong>{a.from}</strong> — {a.take}
              {a.avoid !== "—" && (
                <span className="block text-xs text-learn-ink-muted mt-0.5">✗ {a.avoid}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
