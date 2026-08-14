import { TOPIK_QUIZ_BANK, getQuestionsBySection } from "@/topik/lib/quiz/questions";
import type { ExamTierId } from "@/topik/lib/exams/catalog";
import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";

export type MockExamTier = ExamTierId;

/** TOPIK I mini: listening + reading, levels 1-2 only */
export function buildTopikIMock(count = 10): TopikQuizQuestion[] {
  const listening = getQuestionsBySection(2, "listening", 4);
  const reading = getQuestionsBySection(2, "reading", 3);
  const vocab = getQuestionsBySection(2, "vocabulary", 2);
  const grammar = getQuestionsBySection(2, "grammar", 1);
  return dedupeAndFill([...listening, ...reading, ...vocab, ...grammar], 2, count);
}

/** TOPIK II mini: listening + reading + grammar, up to target level */
export function buildTopikIIMock(level: TopikLevel, count = 10): TopikQuizQuestion[] {
  const listening = getQuestionsBySection(level, "listening", 3);
  const reading = getQuestionsBySection(level, "reading", 4);
  const grammar = getQuestionsBySection(level, "grammar", 2);
  const vocab = getQuestionsBySection(level, "vocabulary", 1);
  return dedupeAndFill([...listening, ...reading, ...grammar, ...vocab], level, count);
}

/** IBT mini — re-export structure from ibt-exam */
export function buildIbtMock(level: TopikLevel, count = 10): TopikQuizQuestion[] {
  const listening = getQuestionsBySection(level, "listening", 3);
  const reading = getQuestionsBySection(level, "reading", 4);
  const grammar = getQuestionsBySection(level, "grammar", 2);
  const writing = TOPIK_QUIZ_BANK.filter(
    (q) => q.category === "writing" && q.level <= level,
  ).slice(0, 1);
  return dedupeAndFill([...listening, ...reading, ...grammar, ...writing], level, count);
}

export function buildMockByTier(
  tier: MockExamTier,
  level: TopikLevel,
  count = 10,
): TopikQuizQuestion[] {
  switch (tier) {
    case "topik-i":
      return buildTopikIMock(count);
    case "topik-ii":
      return buildTopikIIMock(level, count);
    case "topik-ibt":
      return buildIbtMock(level, count);
    case "eps-topik":
      return buildTopikIMock(count);
    default:
      return buildTopikIIMock(level, count);
  }
}

function dedupeAndFill(
  selected: TopikQuizQuestion[],
  maxLevel: TopikLevel,
  count: number,
): TopikQuizQuestion[] {
  const seen = new Set<string>();
  const out: TopikQuizQuestion[] = [];
  for (const q of selected) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  if (out.length < count) {
    const fallback = TOPIK_QUIZ_BANK.filter(
      (q) => q.level <= maxLevel && !seen.has(q.id),
    ).sort(() => Math.random() - 0.5);
    for (const q of fallback) {
      if (out.length >= count) break;
      out.push(q);
    }
  }
  return out.slice(0, count);
}

import { l } from "@/topik/lib/i18n/locale-text";

export function tierLabelVi(tier: MockExamTier): string {
  switch (tier) {
    case "topik-i":
      return l("TOPIK I (cấp 1–2)", "TOPIK I (1–2급)");
    case "topik-ii":
      return l("TOPIK II (cấp 3–6)", "TOPIK II (3–6급)");
    case "topik-ibt":
      return "TOPIK IBT";
    case "eps-topik":
      return "EPS-TOPIK";
    default:
      return "TOPIK";
  }
}
