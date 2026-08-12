import { learnOpenAiJsonCompletion } from "@/learn/lib/openai/json";
import type { MaterialAnalysisRecord, MindmapTreeNode } from "@/learn/types/material";
import type { QuizQuestion, QuizQuestionType, QuizSet } from "@/learn/types/quiz";
import { resolveEvidenceAnchor } from "@/learn/lib/quiz/evidence";
import { isLearnOpenAiReady } from "@/learn/lib/openai-config";
import { parseTranscript } from "@/learn/lib/mindmap/transcript-parse";
import { enrichMindmapAnchors } from "@/learn/lib/mindmap/anchors";

type AiQuizJson = {
  questions?: {
    type?: "multiple_choice" | "short_answer";
    question?: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string;
    explanation?: string;
    evidenceQuote?: string;
    sectionTitle?: string;
  }[];
};

function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function buildSourceText(
  title: string,
  analysis: MaterialAnalysisRecord,
  fullTranscript?: string | null,
): string {
  const parts: string[] = [`# ${title}`, analysis.summary];
  for (const sec of analysis.sections) {
    parts.push(`## ${sec.title}`);
    for (const p of sec.points) parts.push(`- ${p}`);
  }
  if (fullTranscript?.trim()) {
    parts.push("\n--- 원문 ---\n", fullTranscript.slice(0, 12_000));
  }
  return parts.join("\n");
}

/** OpenAI-powered quiz — grounded strictly in user material */
export async function generateQuizWithOpenAI(
  materialId: string,
  title: string,
  analysis: MaterialAnalysisRecord,
  fullTranscript?: string | null,
  maxQuestions = 6,
): Promise<QuizSet> {
  const sourceText = buildSourceText(title, analysis, fullTranscript);
  const transcriptLines = parseTranscript(fullTranscript);
  const mindmapTree = enrichMindmapAnchors(analysis.mindmapTree ?? [], transcriptLines);

  try {
    const result = await learnOpenAiJsonCompletion<AiQuizJson>({
      system: `Lane Learn 퀴즈 AI. 사용자가 업로드한 학습 자료 **내용만**으로 문제를 만드세요.
규칙:
- 외부 지식·추측 금지. 자료에 없는 내용 출제 금지
- 객관식(multiple_choice) 4지선다 + 단답형(short_answer) 혼합
- 객관식 ${Math.ceil(maxQuestions * 0.7)}개, 단답형 ${Math.floor(maxQuestions * 0.3)}개 목표
- evidenceQuote: 정답 근거가 되는 **자료 원문 그대로** 인용 (20~120자)
- explanation: 왜 정답인지 1~2문장
- JSON만 반환:
{
  "questions": [{
    "type": "multiple_choice" | "short_answer",
    "question": "문제",
    "options": ["A","B","C","D"],
    "correctIndex": 0,
    "correctAnswer": "단답 정답",
    "explanation": "해설",
    "evidenceQuote": "원문 인용",
    "sectionTitle": "관련 단원"
  }]
}`,
      user: `다음 학습 자료로 ${maxQuestions}문제 생성:\n\n${sourceText}`,
      temperature: 0.25,
      timeoutMs: 90_000,
    });

    const questions: QuizQuestion[] = (result.questions ?? [])
      .slice(0, maxQuestions)
      .map((q, i) => {
        const type: QuizQuestionType =
          q.type === "short_answer" ? "short_answer" : "multiple_choice";
        const evidence = resolveEvidenceAnchor(
          q.evidenceQuote ?? q.explanation ?? "",
          transcriptLines,
          mindmapTree,
          q.sectionTitle,
        );

        if (type === "short_answer") {
          return {
            id: `q-${i}-${Date.now()}`,
            type,
            question: q.question ?? "다음 내용을 설명하세요.",
            correctAnswer: q.correctAnswer ?? q.explanation ?? "",
            explanation: q.explanation ?? "",
            sectionTitle: q.sectionTitle,
            evidence,
          };
        }

        const options = (q.options ?? []).slice(0, 4);
        while (options.length < 4) options.push(`선택지 ${options.length + 1}`);

        return {
          id: `q-${i}-${Date.now()}`,
          type,
          question: q.question ?? "올바른 것은?",
          options,
          correctIndex: Math.min(Math.max(q.correctIndex ?? 0, 0), options.length - 1),
          explanation: q.explanation ?? "",
          sectionTitle: q.sectionTitle,
          evidence,
        };
      })
      .filter((q) => q.question.length > 4);

    if (questions.length >= 3) {
      return {
        materialId,
        title,
        questions,
        generatedAt: new Date().toISOString(),
        source: "openai",
      };
    }
  } catch {
    // fall through to rule-based
  }

  return generateQuizFallback(materialId, title, analysis, fullTranscript);
}

/** Rule-based fallback when OpenAI unavailable */
export function generateQuizFallback(
  materialId: string,
  title: string,
  analysis: MaterialAnalysisRecord,
  fullTranscript?: string | null,
  maxQuestions = 5,
): QuizSet {
  const transcriptLines = parseTranscript(fullTranscript);
  const mindmapTree = enrichMindmapAnchors(analysis.mindmapTree ?? [], transcriptLines);

  const allPoints: { point: string; section: string }[] = [];
  for (const sec of analysis.sections) {
    for (const p of sec.points) {
      if (p.trim().length > 8) allPoints.push({ point: p.trim(), section: sec.title });
    }
  }
  if (allPoints.length === 0) {
    for (const kp of analysis.keyPoints) {
      if (kp.trim().length > 8) allPoints.push({ point: kp.trim(), section: "핵심" });
    }
  }

  const pool = allPoints.map((a) => a.point);
  const selected = pickRandom(allPoints, Math.min(maxQuestions, allPoints.length));

  const questions: QuizQuestion[] = selected.map((item, i) => {
    const others = pool.filter((p) => p !== item.point && p.length > 2);
    const distractors = pickRandom(others, 3);
    const options = pickRandom([item.point, ...distractors], 4);
    const evidence = resolveEvidenceAnchor(item.point, transcriptLines, mindmapTree, item.section);

    return {
      id: `q-${i}-${Date.now()}`,
      type: "multiple_choice" as const,
      question: `"${item.section}"에서 설명한 내용으로 올바른 것은?`,
      options,
      correctIndex: options.indexOf(item.point),
      explanation: item.point,
      sectionTitle: item.section,
      evidence,
    };
  });

  if (questions.length === 0 && analysis.summary) {
    questions.push({
      id: `q-fallback-${Date.now()}`,
      type: "multiple_choice",
      question: `${title}의 핵심 요약으로 가장 적절한 것은?`,
      options: [
        analysis.summary.slice(0, 80),
        "이 강의는 학습과 무관한 내용입니다.",
        "핵심 개념 없이 잡담만 다룹니다.",
        "요약할 내용이 없습니다.",
      ],
      correctIndex: 0,
      explanation: analysis.summary,
      evidence: resolveEvidenceAnchor(analysis.summary, transcriptLines, mindmapTree),
    });
  }

  return {
    materialId,
    title,
    questions,
    generatedAt: new Date().toISOString(),
    source: "fallback",
  };
}

export async function generateQuiz(
  materialId: string,
  title: string,
  analysis: MaterialAnalysisRecord,
  fullTranscript?: string | null,
): Promise<QuizSet> {
  if (isLearnOpenAiReady()) {
    return generateQuizWithOpenAI(materialId, title, analysis, fullTranscript);
  }
  return generateQuizFallback(materialId, title, analysis, fullTranscript);
}

/** @deprecated use generateQuiz */
export function generateQuizFromAnalysis(
  materialId: string,
  title: string,
  analysis: MaterialAnalysisRecord,
): QuizSet {
  return generateQuizFallback(materialId, title, analysis);
}
