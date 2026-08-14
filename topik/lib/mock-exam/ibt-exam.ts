import { buildMockByTier, type MockExamTier } from "@/topik/lib/mock-exam/tier-exams";
import { TOPIK_QUIZ_BANK } from "@/topik/lib/quiz/questions";
import type { MockExamConfig, TopikLevel, TopikQuizQuestion } from "@/topik/types";

export const IBT_MOCK_CONFIG: MockExamConfig = {
  level: 3,
  durationMin: 20,
  sections: ["listening", "reading", "writing"],
};

/** @deprecated use buildMockByTier */
export function buildMockExamQuestions(level: TopikLevel, count = 10): TopikQuizQuestion[] {
  return buildMockByTier("topik-ibt", level, count);
}

export { buildMockByTier };

export function getMockExamQuestionsByIds(ids: string[]): TopikQuizQuestion[] {
  return ids
    .map((id) => TOPIK_QUIZ_BANK.find((q) => q.id === id))
    .filter((q): q is TopikQuizQuestion => !!q);
}

export type MockExamAnswer = number | string | number[];

export function scoreMockExam(
  questions: TopikQuizQuestion[],
  answers: Record<string, MockExamAnswer>,
): { correct: number; total: number; score: number; maxScore: number } {
  let correct = 0;
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans === undefined) continue;
    if (q.type === "multiple_choice") {
      if (ans === q.correctIndex) correct++;
    } else if (q.type === "sentence_order") {
      const given = Array.isArray(ans) ? (ans as number[]) : [];
      const expected = q.correctOrder ?? [];
      if (given.length === expected.length && given.every((v, i) => v === expected[i])) correct++;
    } else {
      const normalized = String(ans).trim().toLowerCase();
      const expected = (q.correctAnswer ?? "").trim().toLowerCase();
      if (normalized === expected || normalized.includes(expected)) correct++;
    }
  }
  const total = questions.length;
  const maxScore = total * 10;
  const score = correct * 10;
  return { correct, total, score, maxScore };
}

import { l } from "@/topik/lib/i18n/locale-text";

export function ibtSectionLabel(section: string): string {
  switch (section) {
    case "listening":
      return l("Nghe (Listening)", "듣기 (Listening)");
    case "reading":
      return l("Đọc (Reading)", "읽기 (Reading)");
    case "writing":
      return l("Viết (Writing)", "쓰기 (Writing)");
    case "grammar":
      return l("Ngữ pháp", "문법");
    case "vocabulary":
      return l("Từ vựng", "어휘");
    default:
      return section;
  }
}

export function getQuestionSection(q: TopikQuizQuestion): string {
  return q.examSection ?? q.category;
}
