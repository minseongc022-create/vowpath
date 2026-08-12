import { openAiJsonCompletion } from "@/lib/openai-json";
import { splitTextIntoChunks } from "@/learn/lib/ingest/chunker";
import type { MindmapTreeNode } from "@/learn/types/material";

export type AnalysisSection = {
  title: string;
  points: string[];
};

export type AnalysisResult = {
  summary: string;
  sections: AnalysisSection[];
  keyPoints: string[];
  keywords: string[];
  mindmapTree: MindmapTreeNode[];
};

type ChunkAnalysisJson = {
  sections?: AnalysisSection[];
  keywords?: string[];
};

type MergeAnalysisJson = {
  overview?: string;
  sections?: AnalysisSection[];
  keywords?: string[];
  mindmapTree?: MindmapTreeNode[];
};

/** Extract ALL key content from material — organized bullets, not prose. */
export async function analyzeMaterialContent(
  text: string,
  title: string,
): Promise<AnalysisResult> {
  const chunks = splitTextIntoChunks(text, { maxChars: 10_000, overlap: 400 });
  const sectionMap = new Map<string, Set<string>>();
  const keywordSet = new Set<string>();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const result = await openAiJsonCompletion<ChunkAnalysisJson>({
      system: `EFFIROAD 학습 AI. 강의/PDF/텍스트에서 **중요한 내용을 빠짐없이** 추출하세요.
규칙:
- 구구절절 장문 금지. 짧은 bullet만 (한 줄 40자 내외)
- 사소한 인사·잡담·반복은 생략, **학습에 필요한 개념·정의·공식·예시·주의점은 전부** 포함
- JSON만 반환:
{
  "sections": [{ "title": "주제/단원명", "points": ["핵심1", "핵심2", ...] }],
  "keywords": ["마인드맵용 키워드"]
}`,
      user: `자료 제목: ${title}\n청크 ${i + 1}/${chunks.length}:\n\n${chunk}`,
      temperature: 0.15,
      timeoutMs: 90_000,
    });

    for (const sec of result.sections ?? []) {
      if (!sec.title?.trim()) continue;
      const key = sec.title.trim();
      if (!sectionMap.has(key)) sectionMap.set(key, new Set());
      for (const p of sec.points ?? []) {
        const pt = p.trim();
        if (pt) sectionMap.get(key)!.add(pt);
      }
    }
    for (const kw of result.keywords ?? []) {
      if (kw.trim()) keywordSet.add(kw.trim());
    }
  }

  const mergedSections: AnalysisSection[] = [...sectionMap.entries()].map(
    ([t, pts]) => ({ title: t, points: [...pts] }),
  );

  const final = await openAiJsonCompletion<MergeAnalysisJson>({
    system: `학습 자료의 추출 결과를 정리합니다. 내용을 **삭제하지 말고** 중복만 제거·병합하세요.
JSON:
{
  "overview": "1문장 개요 (장문 금지)",
  "sections": [{ "title": "...", "points": ["..."] }],
  "keywords": ["..."],
  "mindmapTree": [{ "id": "root", "label": "...", "children": [...] }]
}
sections: 주제별로 묶되 points는 가능한 한 모두 유지. mindmapTree: 2-3단계, 한국어.`,
    user: `제목: ${title}\n\n추출된 섹션:\n${JSON.stringify(mergedSections).slice(0, 80_000)}\n\n키워드 후보: ${[...keywordSet].join(", ")}`,
    temperature: 0.1,
    timeoutMs: 90_000,
  });

  const sections =
    final.sections?.length ? dedupeSections(final.sections) : dedupeSections(mergedSections);

  const keyPoints = sections.flatMap((s) => s.points);
  const keywords = [
    ...new Set([...(final.keywords ?? []), ...keywordSet]),
  ].slice(0, 30);

  return {
    summary: final.overview?.trim() || `${title} — 핵심 ${keyPoints.length}항목`,
    sections,
    keyPoints,
    keywords,
    mindmapTree: normalizeMindmapTree(final.mindmapTree, title, sections),
  };
}

export async function refineTranscriptChunk(
  chunkText: string,
  context?: { prevTail?: string; nextHead?: string },
): Promise<string> {
  const result = await openAiJsonCompletion<{ refined?: string }>({
    system: `한/영 강의 스크립트를 교정합니다. 누락·깨진 문장·자막 gap을 복원하세요.
요약·축약 금지. JSON: { "refined": "..." }`,
    user: [
      context?.prevTail ? `앞 청크 끝: ...${context.prevTail.slice(-200)}` : "",
      `청크:\n${chunkText}`,
      context?.nextHead ? `다음 청크 시작: ${context.nextHead.slice(0, 200)}...` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    temperature: 0.1,
    timeoutMs: 60_000,
  });

  return result.refined?.trim() || chunkText;
}

export function demoAnalysis(title: string, text: string): AnalysisResult {
  const sentences = text
    .split(/[.!?。]\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  const points = sentences.length > 0 ? sentences : [text.slice(0, 120)];

  const sections: AnalysisSection[] = [
    { title: "핵심 내용", points: points.slice(0, 20) },
  ];

  if (points.length > 20) {
    sections.push({ title: "추가 포인트", points: points.slice(20, 40) });
  }

  return {
    summary: `「${title}」에서 ${points.length}개 핵심 항목 추출 (데모)`,
    sections,
    keyPoints: points.slice(0, 40),
    keywords: ["AI 학습", "스크립트", "마인드맵", title.slice(0, 16)],
    mindmapTree: buildMindmapFromSections(title, sections),
  };
}

function dedupeSections(sections: AnalysisSection[]): AnalysisSection[] {
  const out: AnalysisSection[] = [];
  const seenPoints = new Set<string>();

  for (const sec of sections) {
    const points: string[] = [];
    for (const p of sec.points ?? []) {
      const norm = p.trim().toLowerCase();
      if (!norm || seenPoints.has(norm)) continue;
      seenPoints.add(norm);
      points.push(p.trim());
    }
    if (points.length > 0) {
      out.push({ title: sec.title.trim(), points });
    }
  }
  return out;
}

function buildMindmapFromSections(
  title: string,
  sections: AnalysisSection[],
): MindmapTreeNode[] {
  return [
    {
      id: "root",
      label: title.slice(0, 40),
      children: sections.map((s, i) => ({
        id: `sec-${i}`,
        label: s.title,
        children: s.points.slice(0, 6).map((p, j) => ({
          id: `sec-${i}-${j}`,
          label: p.slice(0, 36),
        })),
      })),
    },
  ];
}

function normalizeMindmapTree(
  tree: MindmapTreeNode[] | undefined,
  fallbackTitle: string,
  sections: AnalysisSection[],
): MindmapTreeNode[] {
  if (!tree?.length) {
    return buildMindmapFromSections(fallbackTitle, sections);
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
