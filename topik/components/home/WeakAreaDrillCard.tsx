"use client";

import Link from "next/link";
import type { TopikLevel } from "@/topik/types";
import { getDrillRecommendations } from "@/topik/lib/quiz/recommend-drill";
import { vi } from "@/topik/lib/i18n/vi";

type Props = {
  sectionStats?: Record<string, { correct: number; total: number }>;
  targetLevel: TopikLevel;
};

export function WeakAreaDrillCard({ sectionStats, targetLevel }: Props) {
  if (!sectionStats || Object.keys(sectionStats).length === 0) return null;

  const recommendations = getDrillRecommendations(sectionStats);
  if (recommendations.length === 0) return null;

  return (
    <section className="topik-result-recommend topik-animate-in">
      <p className="topik-result-breakdown-title">{vi.quiz.weakAreaTitle}</p>
      <p className="topik-result-subhint">{vi.quiz.weakAreaHint}</p>
      <ul className="topik-result-recommend-list">
        {recommendations.slice(0, 3).map((rec) => (
          <li key={rec.section}>
            <Link
              href={`${rec.href}${rec.href.includes("?") ? "&" : "?"}level=${targetLevel}`}
              className="topik-result-recommend-link"
            >
              <span className="topik-result-recommend-label">{rec.label}</span>
              <span className="topik-result-recommend-meta">{rec.reason}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
