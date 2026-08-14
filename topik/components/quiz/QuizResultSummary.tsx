"use client";

import Link from "next/link";
import type { SessionStats } from "@/topik/lib/quiz/check-answer";
import { getDrillRecommendations } from "@/topik/lib/quiz/recommend-drill";
import { ibtSectionLabel } from "@/topik/lib/mock-exam/ibt-exam";
import { vi } from "@/topik/lib/i18n/vi";
import { IconCheckCircle } from "@/topik/components/ui/TopikIcons";

type Props = {
  title: string;
  stats: SessionStats;
  onRetry: () => void;
  wrongNotesHref?: string;
  homeHref?: string;
  level?: number;
};

export function QuizResultSummary({
  title,
  stats,
  onRetry,
  wrongNotesHref = "/topik/wrong-notes",
  homeHref = "/topik",
  level,
}: Props) {
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const sections = Object.entries(stats.bySection).filter(([, v]) => v.total > 0);
  const recommendations = getDrillRecommendations(stats.bySection);

  function withLevel(href: string): string {
    if (!level) return href;
    return `${href}${href.includes("?") ? "&" : "?"}level=${level}`;
  }

  return (
    <div className="topik-card topik-card-pad text-center topik-animate-in">
      <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
      <p className="topik-result-label">{title}</p>
      <p className="topik-result-score">
        {stats.correct} / {stats.total}
      </p>
      <p className="topik-result-hint">{pct}%</p>

      {stats.firstTryCorrect > 0 && stats.firstTryCorrect < stats.total && (
        <p className="topik-result-subhint">
          {vi.quiz.firstTryCorrect.replace("{n}", String(stats.firstTryCorrect)).replace("{total}", String(stats.total))}
        </p>
      )}

      {sections.length > 0 && (
        <div className="topik-result-breakdown">
          <p className="topik-result-breakdown-title">{vi.quiz.sectionBreakdown}</p>
          <ul className="topik-result-breakdown-list">
            {sections.map(([section, { correct, total }]) => (
              <li key={section}>
                <span>{ibtSectionLabel(section)}</span>
                <span>
                  {correct}/{total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="topik-result-recommend">
          <p className="topik-result-breakdown-title">{vi.quiz.weakAreaTitle}</p>
          <p className="topik-result-subhint">{vi.quiz.weakAreaHint}</p>
          <ul className="topik-result-recommend-list">
            {recommendations.slice(0, 3).map((rec) => (
              <li key={rec.section}>
                <Link href={withLevel(rec.href)} className="topik-result-recommend-link">
                  <span className="topik-result-recommend-label">{rec.label}</span>
                  <span className="topik-result-recommend-meta">{rec.reason}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="topik-result-actions">
        <button type="button" onClick={onRetry} className="topik-btn topik-btn-primary topik-btn-lg">
          {vi.common.retry}
        </button>
        {recommendations[0] && (
          <Link href={withLevel(recommendations[0].href)} className="topik-btn topik-btn-accent topik-btn-lg">
            {vi.quiz.startDrill}
          </Link>
        )}
        {stats.wrong > 0 && (
          <Link href={wrongNotesHref} className="topik-btn topik-btn-outline topik-btn-lg">
            {vi.practice.reviewWrong} ({stats.wrong})
          </Link>
        )}
        <Link href={homeHref} className="topik-btn topik-btn-outline topik-btn-lg">
          {vi.mockExam.backHome}
        </Link>
      </div>
    </div>
  );
}
