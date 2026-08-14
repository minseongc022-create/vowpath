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
