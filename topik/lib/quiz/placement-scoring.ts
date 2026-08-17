import type { TopikExamSection, TopikLevel, TopikQuizQuestion } from "@/topik/types";
import { PLACEMENT_TEST } from "@/topik/lib/quiz/placement-test";
import { SECTION_PASS_THRESHOLD } from "@/topik/lib/quiz/difficulty-calibration";

export type PlacementAnswer = {
  questionId: string;
  selectedIndex: number;
};

export type PlacementSectionScore = {
  section: TopikExamSection;
  correct: number;
  total: number;
  accuracy: number;
};

export type PlacementGap = {
  section: TopikExamSection;
  labelVi: string;
  labelKo: string;
  accuracy: number;
  href: string;
  reasonVi: string;
  reasonKo: string;
};

export type PlacementResult = {
  level: TopikLevel;
  correct: number;
  total: number;
  accuracy: number;
  sectionScores: PlacementSectionScore[];
  gaps: PlacementGap[];
  recommendations: { titleVi: string; titleKo: string; href: string }[];
};

const SECTION_LABELS: Record<
  TopikExamSection,
  { vi: string; ko: string; drillType: string }
> = {
  listening: { vi: "Nghe", ko: "듣기", drillType: "listening" },
  reading: { vi: "Đọc hiểu", ko: "독해", drillType: "reading" },
  grammar: { vi: "Ngữ pháp", ko: "문법", drillType: "mixed" },
  vocabulary: { vi: "Từ vựng", ko: "어휘", drillType: "mixed" },
  writing: { vi: "Viết", ko: "쓰기", drillType: "mixed" },
};

/** Stricter than typical apps — mirrors real TOPIK cutoffs, then +one notch. */
export function estimateLevelFromScore(correct: number, total: number): TopikLevel {
  const pct = total > 0 ? correct / total : 0;
  if (pct >= 0.92) return 4;
  if (pct >= 0.8) return 3;
  if (pct >= 0.65) return 2;
  return 1;
}

function sectionHref(section: TopikExamSection, level: TopikLevel): string {
  const meta = SECTION_LABELS[section];
  if (section === "listening") return `/topik/drill?type=listening&level=${level}`;
  if (section === "reading") return `/topik/drill?type=reading&level=${level}`;
  if (section === "vocabulary") return `/topik/practice?level=${Math.max(1, level - 1)}`;
  return `/topik/practice?level=${level}`;
}

export function scorePlacementAnswers(
  answers: PlacementAnswer[],
  targetLevelHint?: TopikLevel,
): PlacementResult {
  const byId = new Map(PLACEMENT_TEST.map((q) => [q.id, q]));
  let correct = 0;
  const sectionBuckets = new Map<TopikExamSection, { correct: number; total: number }>();

  for (const answer of answers) {
    const q = byId.get(answer.questionId);
    if (!q) continue;
    const section = (q.examSection ?? q.category) as TopikExamSection;
    const bucket = sectionBuckets.get(section) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (answer.selectedIndex === q.correctIndex) {
      correct += 1;
      bucket.correct += 1;
    }
    sectionBuckets.set(section, bucket);
  }

  const total = PLACEMENT_TEST.length;
  const level = estimateLevelFromScore(correct, total);
  const drillLevel = targetLevelHint ?? level;

  const sectionScores: PlacementSectionScore[] = [...sectionBuckets.entries()]
    .map(([section, stats]) => ({
      section,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const gaps: PlacementGap[] = sectionScores
    .filter((s) => s.total > 0 && s.accuracy < SECTION_PASS_THRESHOLD)
    .map((s) => {
      const meta = SECTION_LABELS[s.section];
      return {
        section: s.section,
        labelVi: meta.vi,
        labelKo: meta.ko,
        accuracy: s.accuracy,
        href: sectionHref(s.section, drillLevel),
        reasonVi:
          s.accuracy < 0.45
            ? "Cơ bản chưa vững — cần luyện thêm trước khi thi thử"
            : "Gần đạt nhưng còn thiếu — drill theo dạng sẽ cải thiện nhanh",
        reasonKo:
          s.accuracy < 0.45
            ? "기초가 부족합니다 — 모의고사 전에 더 연습하세요"
            : "거의达标지만 부족 — 유형별 드릴로 빠르게 보완",
      };
    });

  const recommendations: PlacementResult["recommendations"] = [];
  if (!answers.length || correct === 0) {
    recommendations.push({
      titleVi: "Bắt đầu drill nghe cơ bản",
      titleKo: "기초 듣기 드릴 시작",
      href: `/topik/drill?type=listening&level=1`,
    });
  } else if (gaps.length > 0) {
    for (const gap of gaps.slice(0, 2)) {
      recommendations.push({
        titleVi: `Luyện ${gap.labelVi}`,
        titleKo: `${gap.labelKo} 연습`,
        href: gap.href,
      });
    }
  } else {
    recommendations.push({
      titleVi: "Thi thử mini TOPIK",
      titleKo: "TOPIK 미니 모의고사",
      href: `/topik/mock-exam?tier=${level <= 2 ? "topik-i" : "topik-ii"}`,
    });
  }

  return {
    level,
    correct,
    total,
    accuracy: total > 0 ? correct / total : 0,
    sectionScores,
    gaps,
    recommendations,
  };
}

export function placementSectionLabel(section: TopikExamSection, ko: boolean): string {
  const meta = SECTION_LABELS[section];
  return ko ? meta.ko : meta.vi;
}

export function validatePlacementPayload(answers: PlacementAnswer[]): boolean {
  if (!Array.isArray(answers) || answers.length !== PLACEMENT_TEST.length) return false;
  const ids = new Set(PLACEMENT_TEST.map((q) => q.id));
  const seen = new Set<string>();
  for (const a of answers) {
    if (
      typeof a.questionId !== "string" ||
      !ids.has(a.questionId) ||
      seen.has(a.questionId) ||
      typeof a.selectedIndex !== "number" ||
      a.selectedIndex < 0
    ) {
      return false;
    }
    seen.add(a.questionId);
  }
  return seen.size === PLACEMENT_TEST.length;
}
