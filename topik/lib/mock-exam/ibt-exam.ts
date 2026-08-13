import { TOPIK_QUIZ_BANK } from "@/topik/lib/quiz/questions";
import type { MockExamConfig, TopikLevel, TopikQuizQuestion } from "@/topik/types";

export const IBT_MOCK_CONFIG: MockExamConfig = {
  level: 3,
  durationMin: 20,
  sections: ["listening", "reading", "writing"],
};

export function buildMockExamQuestions(level: TopikLevel, count = 10): TopikQuizQuestion[] {
  const pool = TOPIK_QUIZ_BANK.filter((q) => q.level <= level);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  if (selected.length >= count) return selected;

  const fallback = TOPIK_QUIZ_BANK.filter((q) => !selected.some((s) => s.id === q.id));
  while (selected.length < count && fallback.length > 0) {
    const pick = fallback.shift()!;
    selected.push(pick);
  }

  return selected;
}

export function getMockExamQuestionsByIds(ids: string[]): TopikQuizQuestion[] {
  return ids
    .map((id) => TOPIK_QUIZ_BANK.find((q) => q.id === id))
    .filter((q): q is TopikQuizQuestion => !!q);
}

export function scoreMockExam(
  questions: TopikQuizQuestion[],
  answers: Record<string, number | string>,
): { correct: number; total: number; score: number; maxScore: number } {
  let correct = 0;
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans === undefined) continue;
    if (q.type === "multiple_choice") {
      if (ans === q.correctIndex) correct++;
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

export function ibtSectionLabel(section: string): string {
  switch (section) {
    case "listening":
      return "Nghe (Listening)";
    case "reading":
      return "Đọc (Reading)";
    case "writing":
      return "Viết (Writing)";
    default:
      return section;
  }
}
