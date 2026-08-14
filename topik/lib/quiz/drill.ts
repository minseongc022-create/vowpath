import { TOPIK_IBT_ORDER_BANK } from "@/topik/lib/quiz/question-bank-ibt-order";
import { TOPIK_QUIZ_BANK } from "@/topik/lib/quiz/questions";
import type { TopikExamSection, TopikLevel, TopikQuizQuestion } from "@/topik/types";

export type DrillType = "listening" | "reading" | "order" | "mixed";

export type DrillConfig = {
  id: DrillType;
  titleVi: string;
  descVi: string;
  count: number;
  section?: TopikExamSection;
};

import { l } from "@/topik/lib/i18n/locale-text";

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

export function buildDrillQuestions(type: DrillType, level: TopikLevel): TopikQuizQuestion[] {
  if (type === "order") {
    const pool = TOPIK_IBT_ORDER_BANK.filter((q) => q.level <= level);
    return shuffle(pool).slice(0, 5);
  }

  if (type === "mixed") {
    const listening = shuffle(
      TOPIK_QUIZ_BANK.filter(
        (q) => q.level <= level && (q.examSection === "listening" || q.category === "listening"),
      ),
    ).slice(0, 5);
    const reading = shuffle(
      TOPIK_QUIZ_BANK.filter(
        (q) => q.level <= level && (q.examSection === "reading" || q.category === "reading"),
      ),
    ).slice(0, 5);
    return shuffle([...listening, ...reading]);
  }

  const config = DRILL_TYPES.find((d) => d.id === type);
  const section = config?.section ?? "listening";
  const pool = TOPIK_QUIZ_BANK.filter(
    (q) => q.level <= level && (q.examSection === section || q.category === section),
  );
  return shuffle(pool).slice(0, config?.count ?? 10);
}
