import { competitionGradeLabel } from "@/toss-shop/lib/format";

const GRADE_CLASS: Record<string, string> = {
  excellent: "ts-grade-excellent",
  good: "ts-grade-good",
  fair: "ts-grade-fair",
  poor: "ts-grade-poor",
};

export function CompetitionBadge({ grade, intensity }: { grade: string; intensity?: number }) {
  return (
    <span className={`ts-grade-badge ${GRADE_CLASS[grade] ?? "ts-grade-fair"}`}>
      {intensity != null ? `${intensity} ` : ""}
      {competitionGradeLabel(grade)}
    </span>
  );
}

export function TrendBadge({ pct }: { pct: number }) {
  if (pct > 5) {
    return <span className="ts-trend-up">▲ {Math.abs(pct)}%</span>;
  }
  if (pct < -5) {
    return <span className="ts-trend-down">▼ {Math.abs(pct)}%</span>;
  }
  return <span className="ts-trend-flat">—</span>;
}
