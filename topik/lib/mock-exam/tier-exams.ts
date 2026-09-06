import { maxSelectableLevel } from "@/topik/lib/quiz/difficulty-calibration";
import { TOPIK_QUIZ_BANK, getQuestionsBySection } from "@/topik/lib/quiz/questions";
import { TOPIK_IBT_ORDER_BANK } from "@/topik/lib/quiz/question-bank-ibt-order";
import type { ExamTierId } from "@/topik/lib/exams/catalog";
import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";

export type MockExamTier = ExamTierId;

/** Question counts per tier — closer to real mini-exam length */
export const MOCK_QUESTION_COUNTS: Record<MockExamTier, number> = {
  "topik-i": 15,
  "topik-ii": 20,
  "topik-ibt": 20,
  "eps-topik": 15,
};

export function mockQuestionCount(tier: MockExamTier): number {
  return MOCK_QUESTION_COUNTS[tier] ?? 15;
}

/** TOPIK I mini: listening + reading, levels 1-2 only */
export function buildTopikIMock(count = mockQuestionCount("topik-i")): TopikQuizQuestion[] {
  const listening = getQuestionsBySection(2, "listening", Math.ceil(count * 0.35));
  const reading = getQuestionsBySection(2, "reading", Math.ceil(count * 0.35));
  const vocab = getQuestionsBySection(2, "vocabulary", Math.ceil(count * 0.2));
  const grammar = getQuestionsBySection(2, "grammar", Math.max(1, Math.ceil(count * 0.1)));
  return dedupeAndFill([...listening, ...reading, ...vocab, ...grammar], 2, count);
}

/** TOPIK II mini: listening + reading + grammar, up to target level */
export function buildTopikIIMock(level: TopikLevel, count = mockQuestionCount("topik-ii")): TopikQuizQuestion[] {
  const listening = getQuestionsBySection(level, "listening", Math.ceil(count * 0.3));
  const reading = getQuestionsBySection(level, "reading", Math.ceil(count * 0.35));
  const grammar = getQuestionsBySection(level, "grammar", Math.ceil(count * 0.2));
  const vocab = getQuestionsBySection(level, "vocabulary", Math.max(1, Math.ceil(count * 0.15)));
  return dedupeAndFill([...listening, ...reading, ...grammar, ...vocab], level, count);
}

/** IBT mini — listening + reading + sentence order + grammar */
export function buildIbtMock(level: TopikLevel, count = mockQuestionCount("topik-ibt")): TopikQuizQuestion[] {
  const listening = getQuestionsBySection(level, "listening", Math.ceil(count * 0.3));
  const reading = getQuestionsBySection(level, "reading", Math.ceil(count * 0.3));
  const orderCount = Math.max(2, Math.ceil(count * 0.2));
  const mockMax = maxSelectableLevel(level);
  const orderPool = TOPIK_IBT_ORDER_BANK.filter(
    (q) => q.level >= Math.max(1, level - 1) && q.level <= mockMax,
  );
  const order = [...orderPool].sort(() => Math.random() - 0.5).slice(0, orderCount);
  const grammar = getQuestionsBySection(level, "grammar", Math.max(1, Math.ceil(count * 0.1)));
  const vocab = getQuestionsBySection(level, "vocabulary", Math.max(1, Math.ceil(count * 0.1)));
  return dedupeAndFill([...listening, ...reading, ...order, ...grammar, ...vocab], level, count);
}

export function buildMockByTier(
  tier: MockExamTier,
  level: TopikLevel,
  count?: number,
): TopikQuizQuestion[] {
  const n = count ?? mockQuestionCount(tier);
  switch (tier) {
    case "topik-i":
      return buildTopikIMock(n);
    case "topik-ii":
      return buildTopikIIMock(level, n);
    case "topik-ibt":
      return buildIbtMock(level, n);
    case "eps-topik":
      return buildTopikIMock(n);
    default:
      return buildTopikIIMock(level, n);
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
    const hardMax = maxSelectableLevel(maxLevel);
    const fallback = TOPIK_QUIZ_BANK.filter(
      (q) => q.level <= hardMax && !seen.has(q.id),
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
