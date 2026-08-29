/**
 * hookable-engine — 공개 진입점
 *
 * 이 파일이 export하는 것만 외부(다른 toss-shop 등 다른 세그먼트 포함)에서
 * 써야 한다. 내부 파일(market-analysis.ts 등)을 직접 import하지 말 것 —
 * 나중에 toss-shop과 연결할 때도 이 index.ts 하나만 거치게 하기 위함이다.
 *
 * 파이프라인: 입력 → 기획(시장분석+섹션계획) → 생성(카피+코드객체+HTML+GIF) → 내보내기
 * (Hookable 워크플로: 상품입력 → 기획 → 생성 → 수정 → 내보내기. "수정"은
 * 캔버스 편집 UI 몫이라 이 서버 사이드 엔진 범위 밖이다.)
 */

import type { HookableGenerationResult, ProductInput } from "./types";
import { analyzeMarket } from "./market-analysis";
import { planSections } from "./section-planner";
import { writeCopy } from "./copywriter";
import { buildDocument } from "./layout-objects";
import { renderDocumentToHtml } from "./html-renderer";
import { generateProductGif } from "./gif-generator";
import { hasOpenAiKey } from "./openai-client";

export const HOOKABLE_ENGINE_VERSION = "1.0";

export type {
  ProductInput,
  MarketAnalysis,
  SectionPlan,
  PlannedSection,
  SectionKind,
  CopyDraft,
  SectionCopy,
  CodeObject,
  DetailPageDocument,
  GifResult,
  HookableGenerationResult,
} from "./types";

export async function generateHookableDetailPage(input: ProductInput): Promise<HookableGenerationResult> {
  const startedAt = Date.now();

  const marketAnalysis = await analyzeMarket(input);
  const sectionPlan = planSections(input, marketAnalysis);
  const copy = await writeCopy(input, marketAnalysis, sectionPlan);
  const document = buildDocument(input, sectionPlan, copy);
  const html = renderDocumentToHtml(document, input);
  const gif = await generateProductGif(input.imageUrls);

  return {
    input,
    marketAnalysis,
    sectionPlan,
    copy,
    document,
    html,
    gif,
    meta: {
      version: HOOKABLE_ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      aiUsed: hasOpenAiKey() && (marketAnalysis.aiGenerated || copy.aiGenerated),
      durationMs: Date.now() - startedAt,
    },
  };
}
