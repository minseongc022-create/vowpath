"use client";

import Link from "next/link";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { IconGear, IconTrophy } from "@/topik/components/ui/TopikIcons";

type Props = {
  current: number;
  total: number;
  backHref?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideNav?: boolean;
};

/** Malhaeboka quiz session shell — progress bar, back, settings */
export function QuizSessionShell({
  current,
  total,
  backHref = "/topik",
  children,
  footer,
}: Props) {
  const t = useTopikStrings();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="topik-quiz-session">
      <header className="topik-quiz-header">
        <Link href={backHref} className="topik-quiz-back" aria-label={t.common.back}>
          ‹
        </Link>
        <div className="topik-quiz-progress-wrap">
          <IconTrophy size={18} />
          <span className="text-xs font-semibold text-learn-ink-muted">
            {current}/{total}
          </span>
          <div className="topik-quiz-progress-bar">
            <div className="topik-quiz-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Link href="/topik/settings" className="topik-quiz-settings" aria-label={t.common.settings}>
          <IconGear size={20} />
        </Link>
      </header>

      <div className="topik-quiz-body">{children}</div>

      {footer ? <footer className="topik-quiz-footer">{footer}</footer> : null}
    </div>
  );
}

export function QuizLevelBadge({ level, isNew }: { level: string | number; isNew?: boolean }) {
  const t = useTopikStrings();
  return (
    <div className="topik-quiz-badges">
      <span className="topik-quiz-level">
        {t.quiz.level} {level}
      </span>
      {isNew ? <span className="topik-quiz-new">{t.quiz.newTag}</span> : null}
    </div>
  );
}
