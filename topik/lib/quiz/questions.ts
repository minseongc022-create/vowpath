import { TOPIK_QUESTION_BANK } from "@/topik/lib/quiz/question-bank";
import { TOPIK_QUESTION_BANK_EXTRA } from "@/topik/lib/quiz/question-bank-extra";
import { TOPIK_QUESTION_BANK_EXPANDED } from "@/topik/lib/quiz/question-bank-expanded";
import { TOPIK_IBT_ORDER_BANK } from "@/topik/lib/quiz/question-bank-ibt-order";
import { TOPIK_DRILL_BANK } from "@/topik/lib/quiz/question-bank-drill";
import { TOPIK_MASS_BANK } from "@/topik/lib/quiz/question-bank-mass";
import { selectHarderQuestions } from "@/topik/lib/quiz/difficulty-calibration";
import type { TopikExamSection, TopikLevel, TopikQuizQuestion } from "@/topik/types";

export const TOPIK_QUIZ_BANK: TopikQuizQuestion[] = [
  ...TOPIK_QUESTION_BANK,
  ...TOPIK_QUESTION_BANK_EXTRA,
  ...TOPIK_QUESTION_BANK_EXPANDED,
  ...TOPIK_IBT_ORDER_BANK,
  ...TOPIK_DRILL_BANK,
  ...TOPIK_MASS_BANK,
];

export function getQuestions(params: {
  level?: TopikLevel;
  category?: string;
  examSection?: TopikExamSection;
  limit?: number;
  /** When true, mix in items up to +1 level with harder bias (default for timed modes). */
  harder?: boolean;
}): TopikQuizQuestion[] {
  let qs = [...TOPIK_QUIZ_BANK];
  if (params.level) {
    if (params.harder !== false) {
      const maxLevel = Math.min(6, params.level + 1) as TopikLevel;
      qs = qs.filter((q) => q.level >= params.level! && q.level <= maxLevel);
      if (qs.length < (params.limit ?? 5)) {
        qs = TOPIK_QUIZ_BANK.filter((q) => q.level === params.level);
      }
    } else {
      qs = qs.filter((q) => q.level === params.level);
    }
  }
  if (params.category) qs = qs.filter((q) => q.category === params.category);
  if (params.examSection) qs = qs.filter((q) => q.examSection === params.examSection);
  const limit = params.limit ?? qs.length;
  if (params.level && params.harder !== false) {
    return selectHarderQuestions(qs, params.level, limit);
  }
  qs.sort(() => Math.random() - 0.5);
  return qs.slice(0, limit);
}

export function getQuestionById(id: string): TopikQuizQuestion | undefined {
  return TOPIK_QUIZ_BANK.find((q) => q.id === id);
}

export function getQuestionsBySection(
  level: TopikLevel,
  section: TopikExamSection,
  limit: number,
): TopikQuizQuestion[] {
  const maxLevel = Math.min(6, level + 1) as TopikLevel;
  const pool = TOPIK_QUIZ_BANK.filter(
    (q) =>
      q.level >= Math.max(1, level - 1) &&
      q.level <= maxLevel &&
      (q.examSection === section || q.category === section),
  );
  return selectHarderQuestions(pool, level, limit);
}
