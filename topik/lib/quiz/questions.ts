import { TOPIK_QUESTION_BANK } from "@/topik/lib/quiz/question-bank";
import { TOPIK_QUESTION_BANK_EXTRA } from "@/topik/lib/quiz/question-bank-extra";
import type { TopikExamSection, TopikLevel, TopikQuizQuestion } from "@/topik/types";

export const TOPIK_QUIZ_BANK: TopikQuizQuestion[] = [
  ...TOPIK_QUESTION_BANK,
  ...TOPIK_QUESTION_BANK_EXTRA,
];

export function getQuestions(params: {
  level?: TopikLevel;
  category?: string;
  examSection?: TopikExamSection;
  limit?: number;
}): TopikQuizQuestion[] {
  let qs = [...TOPIK_QUIZ_BANK];
  if (params.level) qs = qs.filter((q) => q.level === params.level);
  if (params.category) qs = qs.filter((q) => q.category === params.category);
  if (params.examSection) qs = qs.filter((q) => q.examSection === params.examSection);
  qs.sort(() => Math.random() - 0.5);
  return qs.slice(0, params.limit ?? qs.length);
}

export function getQuestionById(id: string): TopikQuizQuestion | undefined {
  return TOPIK_QUIZ_BANK.find((q) => q.id === id);
}

export function getQuestionsBySection(
  level: TopikLevel,
  section: TopikExamSection,
  limit: number,
): TopikQuizQuestion[] {
  const pool = TOPIK_QUIZ_BANK.filter(
    (q) => q.level <= level && (q.examSection === section || q.category === section),
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}
