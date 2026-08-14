import type { TopikLesson, TopikQuizQuestion } from "@/topik/types";
import { isKoLocale, l } from "@/topik/lib/i18n/locale-text";

/** Question prompt shown to learner */
export function quizQuestionText(q: Pick<TopikQuizQuestion, "question" | "questionVi">): string {
  return isKoLocale() ? q.question : (q.questionVi ?? q.question);
}

/** Explanation after answering */
export function quizExplanationText(
  q: Pick<TopikQuizQuestion, "explanation" | "explanationVi">,
): string {
  return isKoLocale() ? q.explanation : q.explanationVi;
}

/** Optional listening script translation — hidden in Korean dev UI */
export function quizListeningScriptVi(q: { listeningScriptVi?: string }): string | undefined {
  return isKoLocale() ? undefined : q.listeningScriptVi;
}

/** Localize inline Vietnamese/Korean content fields */
export function contentText(vi: string, ko: string): string {
  return l(vi, ko);
}

/** Lesson / vocab meaning shown in UI */
export function vocabMeaningText(vi: string, ko?: string): string {
  return isKoLocale() ? (ko ?? vi) : vi;
}

export function lessonTitle(lesson: Pick<TopikLesson, "title" | "titleVi">): string {
  return isKoLocale() ? lesson.title : lesson.titleVi;
}

export function lessonDescription(lesson: Pick<TopikLesson, "description" | "descriptionVi">): string {
  return isKoLocale() ? lesson.description : lesson.descriptionVi;
}
