import type { MaterialAnalysisRecord } from "@/learn/types/material";
import type { QuizQuestion, QuizSet } from "@/learn/types/quiz";

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function makeDistractors(correct: string, pool: string[], count = 3): string[] {
  const others = pool.filter((p) => p !== correct && p.length > 2);
  const picked = pickRandom(others, count);
  while (picked.length < count) {
    picked.push(`관련 없는 선택지 ${picked.length + 1}`);
  }
  return picked;
}

export function generateQuizFromAnalysis(
  materialId: string,
  title: string,
  analysis: MaterialAnalysisRecord,
  maxQuestions = 5,
): QuizSet {
  const allPoints: { point: string; section: string }[] = [];
  for (const sec of analysis.sections) {
    for (const p of sec.points) {
      if (p.trim().length > 8) {
        allPoints.push({ point: p.trim(), section: sec.title });
      }
    }
  }

  if (allPoints.length === 0) {
    for (const kp of analysis.keyPoints) {
      if (kp.trim().length > 8) {
        allPoints.push({ point: kp.trim(), section: "핵심" });
      }
    }
  }

  const pool = allPoints.map((a) => a.point);
  const selected = pickRandom(allPoints, Math.min(maxQuestions, allPoints.length));
  const questions: QuizQuestion[] = selected.map((item, i) => {
    const distractors = makeDistractors(item.point, pool);
    const options = pickRandom([item.point, ...distractors], 4);
    const correctIndex = options.indexOf(item.point);
    return {
      id: `q-${i}-${Date.now()}`,
      question: `"${item.section}"에서 설명한 내용으로 올바른 것은?`,
      options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      explanation: item.point,
      sectionTitle: item.section,
    };
  });

  // Fallback if no sections
  if (questions.length === 0 && analysis.summary) {
    questions.push({
      id: `q-fallback-${Date.now()}`,
      question: `${title}의 핵심 요약으로 가장 적절한 것은?`,
      options: [
        analysis.summary.slice(0, 80),
        "이 강의는 학습과 무관한 내용입니다.",
        "핵심 개념 없이 잡담만 다룹니다.",
        "요약할 내용이 없습니다.",
      ],
      correctIndex: 0,
      explanation: analysis.summary,
    });
  }

  return {
    materialId,
    title,
    questions,
    generatedAt: new Date().toISOString(),
  };
}
