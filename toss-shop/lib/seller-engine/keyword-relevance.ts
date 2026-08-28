/**
 * 키워드↔상품 관련성 — "이 제목이 이 상품을 설명하는가"
 *
 * ★ 왜 이 게이트가 필요했나 — 제목이 상품과 무관하게 지어지고 있었다
 *
 * 소싱은 키워드에서 시작해 상품을 고른다. 그런데 고르는 코드가 이랬다:
 *
 *   intelligence.pickBestProductForKeyword:
 *     .filter(p => p.category === category || p.name.includes(keyword) || ...)
 *
 * `p.category === category`가 **단독으로** 통과 조건이다. 즉 카테고리만 같으면
 * 키워드와 아무 관계가 없어도 후보가 되고, 그 뒤 정렬은 `scoreOpportunity`
 * (수요·경쟁·마진)로만 한다 — **키워드와 얼마나 맞는지는 정렬에 들어가지도
 * 않는다.** 그래서 마진 좋은 엉뚱한 상품이 1등으로 뽑힌다.
 *
 * consignment.ts의 폴백은 한 술 더 뜬다:
 *
 *     ?? catalog.find(p => !used.has(p.id) && p.category === kw.category)
 *
 * 카테고리 안에서 **아무거나** 집는다. 그리고 그 상품에 키워드를 앞에 붙여
 * 제목을 만든다:
 *
 *     suggestedTitle("무선이어폰", "주방 세제") → "무선이어폰 주방 세제"
 *
 * 이게 실제로 관측된 "상품과 관련 없는 제목"의 정체다. 그리고 피해는 제목에서
 * 끝나지 않는다 — 이 픽 하나가 잘못된 키워드를 달고 파이프라인 전체를 지나간다:
 *
 *   · 검색 키워드도 그 키워드로 만들어진다 → 검색해서 들어온 사람이 즉시 이탈
 *   · 광고도 그 키워드로 집행된다 → 전환 0인 클릭에 돈을 태운다
 *   · 상세페이지 문구도 그 키워드로 생성된다 → 내용이 상품과 안 맞는다
 *   · 카탈로그 매칭이 엉뚱한 카탈로그에 붙어 반려·페널티로 이어진다
 *
 * 즉 **관련성은 SEO 문제가 아니라 돈 문제**다. 그래서 점수만 매기고 넘기지 않고,
 * 기준 미달이면 소싱 자체를 막는다.
 *
 * ★ 왜 형태소 분석기를 쓰지 않는가
 *
 * 한국어 상품명은 띄어쓰기가 불규칙하고("무선이어폰" vs "무선 이어폰"), 신조어와
 * 영문이 섞인다. 외부 형태소 분석기는 의존성과 실패 지점을 늘리는 데 비해,
 * 여기서 필요한 판단은 "이 두 문자열이 같은 물건을 가리키는가"뿐이다. 그래서
 * 공백을 지운 문자열 포함 관계 + n-gram 겹침으로 판정한다. 판정을 못 하겠으면
 * **모른다고 답하고 통과시키지 않는다**(fail-closed) — 이 저장소가 공급처 등급
 * 판독에서 쓰는 원칙과 같다.
 */

export const KEYWORD_RELEVANCE_VERSION = "1.0";

/**
 * 관련성 최소 점수.
 *
 * 0.35는 "키워드의 핵심 토큰 중 3분의 1 이상이 상품명에 실제로 나타난다"에
 * 해당한다. 이보다 낮추면 "대용량"처럼 어디에나 붙는 수식어 하나로 통과하고,
 * 이보다 높이면 표기 흔들림("이어폰" vs "이어 폰")에 정상 상품이 걸린다.
 *
 * ⚠️ 실측으로 조정해야 하는 값이다. 등록 후 검색 유입 대비 이탈률이 쌓이면
 * 그 데이터로 다시 잡는 게 맞다. 지금은 근거가 없으므로 보수적으로 둔다.
 */
export const MIN_RELEVANCE_SCORE = 0.35;

export type RelevanceVerdict = {
  engineVersion: string;
  /** 0–1. 높을수록 키워드가 상품을 설명한다 */
  score: number;
  /** 소싱해도 되는가 */
  relevant: boolean;
  /** 상품명에서 실제로 발견된 키워드 조각 */
  matched: string[];
  /** 키워드에 있으나 상품명에 없는 조각 */
  missing: string[];
  reason: string;
};

/** 비교용 정규화 — 공백·기호를 지우고 소문자로 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * 의미를 담지 않는 토큰.
 *
 * 이런 단어는 카테고리를 막론하고 어디에나 붙어서, 관련성 판정에 넣으면
 * 무관한 상품도 통과시킨다. 매칭에서 제외한다.
 */
const STOPWORDS = new Set([
  "대용량",
  "소용량",
  "세트",
  "선물",
  "선물세트",
  "정품",
  "무료배송",
  "당일발송",
  "특가",
  "할인",
  "신상",
  "인기",
  "추천",
  "국내산",
  "수입",
  "고급",
  "프리미엄",
  "휴대용",
  "다용도",
  "데일리",
]);

/** 키워드를 의미 있는 조각으로 나눈다 */
function meaningfulTokens(keyword: string): string[] {
  return keyword
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * 문자 n-gram 겹침 비율.
 *
 * "무선이어폰"과 "무선 이어폰 블루투스"처럼 띄어쓰기만 다른 경우를 잡기 위한
 * 것이다. 2-gram을 쓰는 이유는 한국어 명사가 2음절 단위로 의미를 갖는 경우가
 * 많아서다.
 */
function bigramOverlap(a: string, b: string): number {
  const grams = (s: string): Set<string> => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
    return out;
  };
  const ga = grams(a);
  if (ga.size === 0) return 0;
  const gb = grams(b);
  let hit = 0;
  for (const g of ga) if (gb.has(g)) hit += 1;
  return hit / ga.size;
}

/**
 * 이 키워드로 이 상품을 팔아도 되는가.
 *
 * 판정 순서:
 *  1. 키워드 전체가 상품명에 그대로 들어있으면 확실히 관련 있다 (score 1)
 *  2. 아니면 키워드 토큰 중 몇 개가 상품명에 있는지 센다
 *  3. 토큰 매칭이 약하면 문자 n-gram 겹침으로 보정한다 (띄어쓰기 흔들림 구제)
 */
export function assessKeywordRelevance(input: {
  keyword: string;
  productName: string;
  /** 있으면 함께 본다 — 공급처가 붙인 원본 상품명이 더 정확한 경우가 많다 */
  supplierTitle?: string;
}): RelevanceVerdict {
  const keyword = input.keyword?.trim() ?? "";
  const haystackRaw = [input.productName, input.supplierTitle].filter(Boolean).join(" ");

  if (!keyword || !haystackRaw.trim()) {
    return {
      engineVersion: KEYWORD_RELEVANCE_VERSION,
      score: 0,
      relevant: false,
      matched: [],
      missing: keyword ? [keyword] : [],
      reason: "키워드 또는 상품명이 비어 있어 관련성을 판정할 수 없다 — 통과시키지 않는다",
    };
  }

  const nKeyword = normalize(keyword);
  const nHay = normalize(haystackRaw);

  // 1) 키워드가 통째로 들어있다 — 더 볼 것 없다
  if (nKeyword.length > 1 && nHay.includes(nKeyword)) {
    return {
      engineVersion: KEYWORD_RELEVANCE_VERSION,
      score: 1,
      relevant: true,
      matched: [keyword],
      missing: [],
      reason: `상품명에 「${keyword}」가 그대로 포함됨`,
    };
  }

  // 2) 토큰 단위 매칭
  const tokens = meaningfulTokens(keyword);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const t of tokens) {
    const nt = normalize(t);
    if (nt.length > 1 && nHay.includes(nt)) matched.push(t);
    else missing.push(t);
  }
  const tokenScore = tokens.length > 0 ? matched.length / tokens.length : 0;

  // 3) n-gram 보정 — 띄어쓰기가 달라 토큰이 안 잡힌 경우를 구제한다.
  //
  // ⚠️ 반드시 **불용어를 뺀** 키워드로 계산한다. 원본 키워드로 재면
  // "대용량 생수" vs "대용량 물티슈"가 "대용/용량" 두 조각만으로 0.5를 받아
  // 통과한다 — 불용어를 거르는 이유가 그거였는데 여기서 도로 들어온다.
  // 띄어쓰기 구제("무선 이어폰" ↔ "무선이어폰")는 불용어를 빼도 그대로 된다.
  const gramScore = tokens.length > 0 ? bigramOverlap(normalize(tokens.join("")), nHay) : 0;
  const score = Math.round(Math.max(tokenScore, gramScore) * 100) / 100;
  const relevant = score >= MIN_RELEVANCE_SCORE;

  return {
    engineVersion: KEYWORD_RELEVANCE_VERSION,
    score,
    relevant,
    matched,
    missing,
    reason: relevant
      ? `관련성 ${score} — 「${matched.join(", ") || keyword}」가 상품명과 일치`
      : `관련성 ${score} (기준 ${MIN_RELEVANCE_SCORE} 미만) — 키워드 「${keyword}」가 상품 「${input.productName}」을 설명하지 않는다.` +
        ` 이 조합으로 제목을 만들면 검색해서 들어온 사람이 즉시 이탈하고 광고비만 나간다`,
  };
}

/**
 * 관련성이 확인된 제목만 만든다.
 *
 * 종전 `suggestedTitle`은 키워드를 상품명 앞에 무조건 붙였다. 관련이 없으면
 * "무선이어폰 주방 세제" 같은 제목이 나온다. 이제는 관련성을 먼저 보고,
 * 관련이 없으면 **키워드를 붙이지 않고 상품명을 그대로 쓴다** — 잘못된 키워드로
 * 검색 노출을 노리느니 노출이 적은 게 낫다.
 */
export function buildRelevantTitle(input: {
  keyword: string;
  productName: string;
  supplierTitle?: string;
  maxLength?: number;
}): { title: string; keywordApplied: boolean; verdict: RelevanceVerdict } {
  const verdict = assessKeywordRelevance(input);
  const max = input.maxLength ?? 45;
  const base = input.productName.trim();

  if (!verdict.relevant) {
    return { title: base.slice(0, max), keywordApplied: false, verdict };
  }

  // 이미 키워드가 들어 있으면 중복해서 붙이지 않는다 (키워드 반복은 스팸 판정)
  if (normalize(base).includes(normalize(input.keyword))) {
    return { title: base.slice(0, max), keywordApplied: true, verdict };
  }

  return {
    title: `${input.keyword} ${base}`.slice(0, max),
    keywordApplied: true,
    verdict,
  };
}
