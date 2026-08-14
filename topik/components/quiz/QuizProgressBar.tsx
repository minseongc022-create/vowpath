"use client";

type Props = {
  current: number;
  total: number;
  className?: string;
};

export function QuizProgressBar({ current, total, className }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={className ?? "topik-quiz-progress"}>
      <div className="topik-quiz-progress-track" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}>
        <div className="topik-quiz-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
