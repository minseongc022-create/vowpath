"use client";

import Link from "next/link";
import type { SessionStats } from "@/topik/lib/quiz/check-answer";
import { ibtSectionLabel } from "@/topik/lib/mock-exam/ibt-exam";
import { vi } from "@/topik/lib/i18n/vi";
import { IconCheckCircle } from "@/topik/components/ui/TopikIcons";

type Props = {
  title: string;
  stats: SessionStats;
  onRetry: () => void;
  wrongNotesHref?: string;
  homeHref?: string;
};

export function QuizResultSummary({
  title,
  stats,
  onRetry,
  wrongNotesHref = "/topik/wrong-notes",
  homeHref = "/topik",
}: Props) {
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const sections = Object.entries(stats.bySection).filter(([, v]) => v.total > 0);

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

      {sections.length > 1 && (
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

      <div className="topik-result-actions">
        <button type="button" onClick={onRetry} className="topik-btn topik-btn-primary topik-btn-lg">
          {vi.common.retry}
        </button>
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
