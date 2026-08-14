import { TOPIK_IBT_ORDER_BANK } from "@/topik/lib/quiz/question-bank-ibt-order";
import { TOPIK_QUIZ_BANK } from "@/topik/lib/quiz/questions";
import type { TopikExamSection, TopikLevel, TopikQuizQuestion } from "@/topik/types";
import { l } from "@/topik/lib/i18n/locale-text";

export type DrillType = "listening" | "reading" | "order" | "mixed";

export type DrillConfig = {
  id: DrillType;
  titleVi: string;
  descVi: string;
  count: number;
  section?: TopikExamSection;
};

export type DrillPreview = {
  questions: TopikQuizQuestion[];
  count: number;
  target: number;
  hasEnough: boolean;
  estimatedMin: number;
};

export const DRILL_TYPES: DrillConfig[] = [
  {
    id: "listening",
    titleVi: l("Nghe IBT · 10 câu", "IBT 듣기 · 10문항"),
    descVi: l("Script + TTS · giải thích tiếng Việt", "스크립트 + TTS · 해설"),
    count: 10,
    section: "listening",
  },
  {
    id: "reading",
    titleVi: l("Đọc IBT · 10 câu", "IBT 읽기 · 10문항"),
    descVi: l("Đoạn văn + trắc nghiệm", "지문 + 객관식"),
    count: 10,
    section: "reading",
  },
  {
    id: "order",
    titleVi: l("Sắp xếp câu IBT · 5 câu", "IBT 문장 배열 · 5문항"),
    descVi: l("Dạng kéo-thả thi máy · TOPIK Coach", "IBT 배열형 · TOPIK Coach"),
    count: 5,
  },
  {
    id: "mixed",
    titleVi: l("Mini set · 10 câu", "미니 세트 · 10문항"),
    descVi: l("5 nghe + 5 đọc — luyện nhanh", "듣기 5 + 읽기 5 — 빠른 연습"),
    count: 10,
  },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function poolBySection(level: TopikLevel, section: TopikExamSection): TopikQuizQuestion[] {
  return TOPIK_QUIZ_BANK.filter(
    (q) =>
      q.type !== "sentence_order" &&
      q.level <= level &&
      (q.examSection === section || q.category === section),
  );
}

function takeUnique(pool: TopikQuizQuestion[], count: number): TopikQuizQuestion[] {
  const shuffled = shuffle(pool);
  const seen = new Set<string>();
  const out: TopikQuizQuestion[] = [];
  for (const q of shuffled) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
    if (out.length >= count) break;
  }
  return out;
}

export function buildDrillQuestions(type: DrillType, level: TopikLevel): TopikQuizQuestion[] {
  if (type === "order") {
    const pool = TOPIK_IBT_ORDER_BANK.filter((q) => q.level <= level);
    return takeUnique(pool, 5);
  }

  if (type === "mixed") {
    const listening = takeUnique(poolBySection(level, "listening"), 5);
    const reading = takeUnique(poolBySection(level, "reading"), 5);
    return shuffle([...listening, ...reading]);
  }

  const config = DRILL_TYPES.find((d) => d.id === type);
  const section = config?.section ?? "listening";
  return takeUnique(poolBySection(level, section), config?.count ?? 10);
}

export function getDrillPreview(type: DrillType, level: TopikLevel): DrillPreview {
  const questions = buildDrillQuestions(type, level);
  const config = DRILL_TYPES.find((d) => d.id === type);
  const target = config?.count ?? 10;
  const minRequired = type === "order" ? 3 : Math.min(target, 5);

  return {
    questions,
    count: questions.length,
    target,
    hasEnough: questions.length >= minRequired,
    estimatedMin: Math.max(1, Math.ceil(questions.length * 0.75)),
  };
}
