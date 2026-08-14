import type { TopikQuizQuestion } from "@/topik/types";

export type QuizAnswerInput = {
  selectedIndex?: number | null;
  textAnswer?: string;
  order?: number[];
};

export function checkQuizAnswer(q: TopikQuizQuestion, answer: QuizAnswerInput): boolean {
  if (q.type === "multiple_choice") {
    return answer.selectedIndex === q.correctIndex;
  }
  if (q.type === "short_answer") {
    const normalized = (answer.textAnswer ?? "").trim().toLowerCase();
    const expected = (q.correctAnswer ?? "").trim().toLowerCase();
    return normalized === expected || normalized.includes(expected);
  }
  if (q.type === "sentence_order") {
    const correct = q.correctOrder ?? [];
    const given = answer.order ?? [];
    return given.length === correct.length && given.every((v, i) => v === correct[i]);
  }
  return false;
}

/** Human-readable correct answer for feedback panels */
export function getCorrectAnswerText(q: TopikQuizQuestion): string | null {
  if (q.type === "multiple_choice" && q.options && q.correctIndex !== undefined) {
    return q.options[q.correctIndex] ?? null;
  }
  if (q.type === "short_answer" && q.correctAnswer) {
    return q.correctAnswer;
  }
  if (q.type === "sentence_order" && q.fragments && q.correctOrder) {
    return q.correctOrder.map((i) => q.fragments![i]).join(" ");
  }
  return null;
}

export function assembleSentenceOrder(fragments: string[], order: number[]): string {
  return order.map((i) => fragments[i]).filter(Boolean).join(" ");
}

export type SessionStats = {
  total: number;
  correct: number;
  wrong: number;
  firstTryCorrect: number;
  bySection: Record<string, { correct: number; total: number }>;
};

export function emptySessionStats(): SessionStats {
  return { total: 0, correct: 0, wrong: 0, firstTryCorrect: 0, bySection: {} };
}

export function recordSessionAnswer(
  stats: SessionStats,
  section: string,
  isCorrect: boolean,
  firstTry: boolean,
): SessionStats {
  const bySection = { ...stats.bySection };
  const sec = bySection[section] ?? { correct: 0, total: 0 };
  sec.total++;
  if (isCorrect) sec.correct++;
  bySection[section] = sec;

  return {
    total: stats.total + 1,
    correct: stats.correct + (isCorrect ? 1 : 0),
    wrong: stats.wrong + (isCorrect ? 0 : 1),
    firstTryCorrect: stats.firstTryCorrect + (isCorrect && firstTry ? 1 : 0),
    bySection,
  };
}
