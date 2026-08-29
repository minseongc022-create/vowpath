/**
 * hookable-engine — 독립 모듈 타입 정의
 *
 * 이 디렉토리는 toss-shop과 완전히 분리되어 있다. toss-shop의 타입/모듈을
 * import하지 않고, toss-shop도 이 모듈을 import하지 않는다. 나중에 연결할
 * 계획이 있어도, 그 연결은 이 모듈의 index.ts가 내보내는 공개 함수를 통해서만
 * 이루어져야 한다 (내부 파일을 직접 참조하지 않는다).
 */

export type ProductInput = {
  /** 상품명 */
  name: string;
  /** 카테고리 (자유 텍스트) */
  category?: string;
  /** 판매가 (원) */
  priceKrw?: number;
  /** 상품 특징/스펙 — 아는 사실만 나열 */
  features: string[];
  /** 자유 서술형 설명 (있으면 AI 분석 입력에 포함) */
  description?: string;
  /** 실제 상품 이미지 URL 목록 (없어도 동작하지만 갤러리/GIF가 비게 된다) */
  imageUrls: string[];
  /** 검색 키워드 — 시장 분석에 사용 */
  keyword?: string;
  /** 타깃 고객 설명 (없으면 AI가 카테고리로 추론) */
  targetAudience?: string;
};

export type MarketAnalysis = {
  /** 시장/카테고리 트렌드 한줄 요약 */
  trendSummary: string;
  /** 경쟁 구도에 대한 인사이트 */
  competitorInsight: string;
  /** 소비자가 이 카테고리에서 흔히 갖는 니즈/불안 */
  consumerNeeds: string[];
  /** 도출된 판매 소구점(셀링포인트) 후보 */
  recommendedSellingPoints: string[];
  /** 카피 톤 */
  tone: "trust" | "premium" | "playful" | "value";
  /** AI로 생성됐는지, 휴리스틱 폴백인지 */
  aiGenerated: boolean;
};

export const SECTION_KINDS = [
  "hook",
  "problem",
  "solution",
  "features",
  "proof",
  "spec",
  "guarantee",
  "faq",
  "cta",
] as const;

export type SectionKind = (typeof SECTION_KINDS)[number];

export type PlannedSection = {
  kind: SectionKind;
  order: number;
  /** 이 섹션을 이 순서/내용으로 넣은 이유 (기획 근거, 검증용 화면에 노출) */
  rationale: string;
};

export type SectionPlan = {
  sections: PlannedSection[];
  aiGenerated: boolean;
};

export type SectionCopy = {
  kind: SectionKind;
  heading: string;
  body: string[];
  /** spec 섹션용 표 데이터 */
  rows?: Array<{ label: string; value: string }>;
  /** faq 섹션용 Q&A */
  qa?: Array<{ q: string; a: string }>;
};

export type CopyDraft = {
  sections: SectionCopy[];
  aiGenerated: boolean;
};

/** 캔버스에서 편집 가능한 최소 단위 — Hookable의 "코드 객체" 편집 모델을 재현 */
export type CodeObject =
  | { id: string; type: "section"; kind: SectionKind; order: number; childIds: string[] }
  | { id: string; type: "text"; sectionKind: SectionKind; role: "heading" | "body" | "caption"; content: string }
  | { id: string; type: "image"; sectionKind: SectionKind; src: string; alt: string }
  | { id: string; type: "table"; sectionKind: SectionKind; rows: Array<{ label: string; value: string }> }
  | { id: string; type: "qa"; sectionKind: SectionKind; items: Array<{ q: string; a: string }> };

export type DetailPageDocument = {
  objects: CodeObject[];
  sectionOrder: SectionKind[];
};

export type GifResult = {
  dataUrl: string;
  frameCount: number;
  width: number;
  height: number;
  bytes: number;
};

export type HookableGenerationResult = {
  input: ProductInput;
  marketAnalysis: MarketAnalysis;
  sectionPlan: SectionPlan;
  copy: CopyDraft;
  document: DetailPageDocument;
  html: string;
  gif: GifResult | null;
  meta: {
    version: string;
    generatedAt: string;
    aiUsed: boolean;
    durationMs: number;
  };
};
