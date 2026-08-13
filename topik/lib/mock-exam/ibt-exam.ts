import {
  getQuestionsBySection,
  TOPIK_QUIZ_BANK,
} from "@/topik/lib/quiz/questions";
import type { MockExamConfig, TopikLevel, TopikQuizQuestion } from "@/topik/types";

export const IBT_MOCK_CONFIG: MockExamConfig = {
  level: 3,
  durationMin: 20,
  sections: ["listening", "reading", "writing"],
};

/** IBT mini mock: 3 listening + 5 reading + 2 grammar (10 total) */
export function buildMockExamQuestions(level: TopikLevel, count = 10): TopikQuizQuestion[] {
  const listening = getQuestionsBySection(level, "listening", 3);
  const reading = getQuestionsBySection(level, "reading", 4);
  const grammar = getQuestionsBySection(level, "grammar", 2);
  const vocab = getQuestionsBySection(level, "vocabulary", 1);

  let selected = [...listening, ...reading, ...grammar, ...vocab];

  if (selected.length < count) {
    const used = new Set(selected.map((q) => q.id));
    const fallback = TOPIK_QUIZ_BANK.filter(
      (q) => q.level <= level && !used.has(q.id),
    ).sort(() => Math.random() - 0.5);
    for (const q of fallback) {
      if (selected.length >= count) break;
      selected.push(q);
    }
  }

  return selected.slice(0, count);
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
    case "grammar":
      return "Ngữ pháp";
    case "vocabulary":
      return "Từ vựng";
    default:
      return section;
  }
}

export function getQuestionSection(q: TopikQuizQuestion): string {
  return q.examSection ?? q.category;
}
