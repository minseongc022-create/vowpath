import { openAiJsonCompletion } from "@/lib/openai-json";
import type { MindmapTreeNode } from "@/learn/types/material";

export type AnalysisResult = {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  mindmapTree: MindmapTreeNode[];
};

type AnalysisJson = {
  summary?: string;
  keyPoints?: string[];
  keywords?: string[];
  mindmapTree?: MindmapTreeNode[];
};

function isAnalysisJson(v: unknown): v is AnalysisJson {
  return typeof v === "object" && v !== null;
}

/** Real-time OpenAI analysis: summary + mindmap keywords. */
export async function analyzeMaterialContent(
  text: string,
  title: string,
): Promise<AnalysisResult> {
  const excerpt = text.slice(0, 120_000);

  const result = await openAiJsonCompletion<AnalysisJson>({
    system: `You are EFFIROAD's learning ingestion AI. Analyze study material in Korean.
Return JSON:
{
  "summary": "핵심 요약 5문장 이내, 명확하고 학습용",
  "keyPoints": ["bullet1", "bullet2", ... up to 8],
  "keywords": ["keyword1", ... up to 15 for mindmap],
  "mindmapTree": [{ "id": "root", "label": "...", "summary": "...", "children": [...] }]
}
mindmapTree: 2-3 levels deep, 3-6 top branches, Korean labels.`,
    user: `Title: ${title}\n\nContent:\n${excerpt}`,
    temperature: 0.2,
    timeoutMs: 45_000,
  });

  if (!isAnalysisJson(result)) {
    throw new Error("OPENAI_SCHEMA_MISMATCH");
  }

  return {
    summary: result.summary?.trim() || "요약을 생성하지 못했습니다.",
    keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints.slice(0, 8) : [],
    keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 15) : [],
    mindmapTree: normalizeMindmapTree(result.mindmapTree, title),
  };
}

/** Refine a transcript chunk — fix gaps, stutters, missing particles (Megastudy-style fix). */
export async function refineTranscriptChunk(
  chunkText: string,
  context?: { prevTail?: string; nextHead?: string },
): Promise<string> {
  const result = await openAiJsonCompletion<{ refined?: string }>({
    system: `You refine Korean/English lecture transcripts. Fix missing words, broken sentences, and subtitle gaps.
Do NOT summarize or shorten. Preserve all educational content. Return JSON: { "refined": "..." }`,
    user: [
      context?.prevTail ? `Previous tail: ...${context.prevTail.slice(-200)}` : "",
      `Chunk:\n${chunkText}`,
      context?.nextHead ? `Next head: ${context.nextHead.slice(0, 200)}...` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    temperature: 0.1,
    timeoutMs: 60_000,
  });

  return result.refined?.trim() || chunkText;
}

export function demoAnalysis(title: string, text: string): AnalysisResult {
  const preview = text.slice(0, 200).replace(/\s+/g, " ");
  return {
    summary: `「${title}」의 핵심: ${preview}… 내용을 AI가 분석했습니다. (데모 모드)`,
    keyPoints: [
      "청크 단위 처리로 누락 없는 전체 스크립트",
      "외부 자료와 플랫폼 데이터 통합",
      "실시간 요약 및 마인드맵 키워드 추출",
    ],
    keywords: ["AI 학습", "스크립트", "마인드맵", "핵심 요약", title.slice(0, 20)],
    mindmapTree: [
      {
        id: "root",
        label: title.slice(0, 40),
        summary: "AI 분석 결과",
        children: [
          {
            id: "k1",
            label: "핵심 개념",
            children: [{ id: "k1a", label: "청크 처리" }, { id: "k1b", label: "스크립트 병합" }],
          },
          {
            id: "k2",
            label: "학습 포인트",
            children: [{ id: "k2a", label: "요약" }, { id: "k2b", label: "키워드" }],
          },
        ],
      },
    ],
  };
}

function normalizeMindmapTree(
  tree: MindmapTreeNode[] | undefined,
  fallbackTitle: string,
): MindmapTreeNode[] {
  if (!tree?.length) {
    return demoAnalysis(fallbackTitle, "").mindmapTree;
  }
  return tree.map((node, i) => ({
    id: node.id || `n-${i}`,
    label: node.label || "개념",
    summary: node.summary,
    children: node.children?.map((c, j) => ({
      id: c.id || `n-${i}-${j}`,
      label: c.label || "하위",
      summary: c.summary,
      children: c.children,
    })),
  }));
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
