/**
 * 토스쇼핑 검색 상위노출 엔진 — 제목·키워드 최적화
 *
 * 왜 중요한가 (추측 아니라 우리 모델이 계산한 값):
 * profit-probability 시뮬레이션 결과, SEO 점수 70 → 85로 올리면
 * 월 1,000만 달성확률 90%에 필요한 누적 SKU가 **125개 → 75개**로 줄었다.
 * 즉 상위노출 최적화는 소싱량을 40% 절약하는 것과 같다.
 *
 * ⚠️ 정직하게: 토스쇼핑은 공식 랭킹 알고리즘을 공개하지 않는다.
 * 여기 규칙들은 (a) 토스 셀러 가이드가 명시한 것, (b) 검색형 마켓플레이스에
 * 공통으로 적용되는 검증된 원칙에 기반한다. 토스 전용 가중치를 안다고
 * 주장하지 않는다 — 대신 어떤 마켓에서도 손해 보지 않는 규칙만 넣었다.
 */

import type { TossShopCategory } from "../types";

export const TOSS_SEO_VERSION = "1.0";

/** 토스 상품명 권장 상한 (초과 시 잘림 → 검색 매칭 손실) */
const TITLE_MAX = 100;
const TITLE_SWEET_MIN = 25;
const TITLE_SWEET_MAX = 45;

/** 상품명에 넣으면 안 되는 것 — 어뷰징 판정·노출 불이익 */
const BANNED_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /(최저가|초특가|폭탄세일|땡처리)/, label: "과장 판매문구" },
  { re: /(정품보장|100%\s*정품|공식정품)/, label: "검증 불가 정품 주장" },
  { re: /(1위|베스트\s*1|판매량\s*1위)/, label: "근거 없는 순위 주장" },
  { re: /(무료배송|무배)/, label: "배송정책은 제목이 아니라 배송설정에" },
  { re: /[!]{2,}|[?]{2,}|[~]{3,}/, label: "특수문자 남발" },
  { re: /(\b\w+\b)(\s+\1){2,}/, label: "키워드 반복(스팸 판정)" },
];

export type SeoAnalysis = {
  score: number; // 0–100
  title: string;
  searchKeywords: string[];
  issues: string[];
  fixes: string[];
  /** 실제로 적용 가능한 최적화 제목 */
  optimizedTitle: string;
};

const CATEGORY_MODIFIERS: Record<TossShopCategory, string[]> = {
  food: ["대용량", "선물세트", "당일발송", "무료배송제외"],
  beauty: ["민감성", "데일리", "선물용", "대용량"],
  home: ["대용량", "다용도", "미끄럼방지", "간편설치"],
  digital: ["고속충전", "호환", "휴대용", "정품인증"],
  fashion: ["빅사이즈", "데일리", "사계절", "커플"],
  health: ["고함량", "국내산", "대용량", "1개월분"],
};

function tokenize(s: string): string[] {
  return s
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * 검색 키워드 세트 구성.
 * 원칙: 메인키워드 + 구매의도 조합어 + 카테고리 수식어.
 * 중복·초과 키워드는 오히려 관련성 희석 → 상한 10개.
 */
export function buildSearchKeywords(input: {
  mainKeyword: string;
  productName: string;
  category: TossShopCategory;
  relatedKeywords?: string[];
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (k: string) => {
    const t = k.trim();
    if (!t || t.length < 2 || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  push(input.mainKeyword);
  // 구매의도가 실린 조합어가 전환율이 높다 (검색량은 낮아도 경쟁이 훨씬 약함)
  for (const m of CATEGORY_MODIFIERS[input.category].slice(0, 2)) {
    push(`${input.mainKeyword} ${m}`);
  }
  for (const r of input.relatedKeywords ?? []) push(r);
  for (const t of tokenize(input.productName)) push(t);

  return out.slice(0, 10);
}

/**
 * 제목 최적화.
 * 규칙: [핵심키워드][속성/스펙][수량/규격] — 앞쪽에 검색어, 금지어 제거,
 * 25–45자 구간(모바일 검색결과에서 잘리지 않으면서 매칭 폭 확보).
 */
export function optimizeTitle(input: {
  mainKeyword: string;
  productName: string;
  category: TossShopCategory;
  spec?: string;
}): string {
  let base = input.productName;
  for (const b of BANNED_PATTERNS) base = base.replace(b.re, " ");
  base = base.replace(/\s+/g, " ").trim();

  const parts: string[] = [];
  // 1) 메인 키워드를 맨 앞에 (검색 매칭 가중치가 앞쪽에 높다)
  parts.push(input.mainKeyword);

  // 2) 상품명에서 메인키워드와 중복되지 않는 식별 토큰
  const kwTokens = new Set(tokenize(input.mainKeyword));
  const rest = tokenize(base)
    .filter((t) => !kwTokens.has(t))
    .slice(0, 6);
  if (rest.length) parts.push(rest.join(" "));

  // 3) 카테고리 수식어 1개 (구매의도 조합어 확보)
  const mod = CATEGORY_MODIFIERS[input.category][0];
  if (mod && !base.includes(mod)) parts.push(mod);

  if (input.spec) parts.push(input.spec);

  // 토스 공식 가이드: 수량·색상·맛은 상품명이 아니라 **검색 키워드 영역**에 등록한다.
  // (스마트스토어식으로 제목에 몰아넣으면 토스에서는 역효과)

  let title = parts
    .join(" ")
    .replace(/\d+\s*(개입|입|팩|세트|매|박스)/g, " ")
    .replace(/(블랙|화이트|레드|블루|그린|핑크|베이지|네이비)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length > TITLE_MAX) title = title.slice(0, TITLE_MAX).trim();
  return title;
}

export function analyzeTitleSeo(input: {
  title: string;
  mainKeyword: string;
  productName: string;
  category: TossShopCategory;
  searchKeywords?: string[];
}): SeoAnalysis {
  const issues: string[] = [];
  const fixes: string[] = [];
  let score = 100;

  const t = input.title ?? "";

  // 금지 패턴
  for (const b of BANNED_PATTERNS) {
    if (b.re.test(t)) {
      issues.push(`제목 금지요소: ${b.label}`);
      fixes.push(`제목에서 ${b.label} 제거`);
      score -= 14;
    }
  }

  // 메인 키워드 포함 여부 — 이게 없으면 해당 검색어로 아예 안 잡힌다
  if (!t.includes(input.mainKeyword)) {
    issues.push(`메인 키워드 「${input.mainKeyword}」가 제목에 없음`);
    fixes.push(`제목 맨 앞에 「${input.mainKeyword}」 배치`);
    score -= 30;
  } else {
    // 앞쪽 배치 가산
    const pos = t.indexOf(input.mainKeyword);
    if (pos > 12) {
      issues.push("메인 키워드가 제목 뒤쪽에 있음");
      fixes.push("메인 키워드를 제목 앞부분으로 이동");
      score -= 8;
    }
  }

  // 길이
  if (t.length < TITLE_SWEET_MIN) {
    issues.push(`제목 ${t.length}자 — 너무 짧아 매칭 키워드 부족`);
    fixes.push(`속성·규격을 추가해 ${TITLE_SWEET_MIN}자 이상으로`);
    score -= 12;
  } else if (t.length > TITLE_SWEET_MAX) {
    if (t.length > TITLE_MAX) {
      issues.push(`제목 ${t.length}자 — 상한 ${TITLE_MAX}자 초과(잘림)`);
      score -= 18;
    } else {
      issues.push(`제목 ${t.length}자 — 모바일에서 뒷부분 잘릴 수 있음`);
      score -= 5;
    }
    fixes.push(`핵심 정보를 앞 ${TITLE_SWEET_MAX}자 안에 배치`);
  }

  // 검색 키워드 세트
  const kws = input.searchKeywords ?? [];
  if (kws.length < 5) {
    issues.push(`검색 키워드 ${kws.length}개 — 노출 접점 부족`);
    fixes.push("구매의도 조합어를 포함해 8–10개로 확장");
    score -= 10;
  }
  if (kws.length > 10) {
    issues.push("검색 키워드 10개 초과 — 관련성 희석");
    fixes.push("상위 10개만 유지");
    score -= 6;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    title: t,
    searchKeywords: kws,
    issues,
    fixes,
    optimizedTitle: optimizeTitle({
      mainKeyword: input.mainKeyword,
      productName: input.productName,
      category: input.category,
    }),
  };
}
