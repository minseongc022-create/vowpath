/**
 * 검색어 ↔ 상품 관련성, 그리고 고객에게 보일 제목 만들기
 *
 * ★ 왜 관련성을 따로 재는가
 *
 * 도매 검색은 카테고리만 겹쳐도 결과를 준다. 그 결과에 검색어를 그대로
 * 앞에 붙여 제목을 만들면 **"무선이어폰 주방 세제"** 같은 조합이 실제로
 * 만들어진다. 잘못된 키워드는 제목만 망치는 게 아니라 검색 노출·광고
 * 집행·상세 문구까지 전부 오염시킨다.
 *
 * ★ 왜 공급처 제목을 그대로 쓰면 안 되는가
 *
 * 도매 제목은 **셀러끼리 보는 말**이다:
 *
 *     [무료배송] 대박특가 주방 정리함 10P 도매 사입 B2B
 *
 * 여기서 `무료배송`(우리 배송 조건이 아님), `대박특가`(과장 광고),
 * `10P`(우리는 낱개로 판다), `도매/사입/B2B`(고객과 무관)는 전부
 * 고객 화면에 나가면 안 된다. 특히 `10P`는 **거짓 정보**다 —
 * 낱개를 파는데 10개 세트로 읽힌다.
 */

/** 조사·접속사 등 의미 없는 토막 */
const STOPWORDS = new Set([
  "및", "그리고", "또는", "용", "형", "형태", "제품", "상품", "세트",
  "정품", "국산", "수입", "신상", "인기", "추천", "베스트",
]);

/**
 * 고객 화면에 절대 나가면 안 되는 말.
 *
 * 두 부류다:
 *  1. 셀러 전문용어 — 고객이 이해할 이유가 없다 (도매/사입/B2B/OEM)
 *  2. 우리 조건과 다른 사실 — 그대로 두면 거짓말이 된다
 *     (`무료배송`은 우리가 정할 값이고, `10P`는 낱개 판매와 모순된다)
 */
const SELLER_JARGON =
  /(도매|사입|b2b|oem|odm|위탁|공급가|납품|벌크|대량구매|묶음배송|무료배송|택배비|배송비|당일발송|무한리필|최저가|대박특가|초특가|땡처리|재고정리|이월|샘플)/gi;

/**
 * `10P`, `5개입`, `20매`, `x3` 같은 수량 표기 — 낱개 판매와 모순된다.
 *
 * ⚠️ 한글 단위에는 `\b`를 쓰면 안 된다. JS의 `\b`는 `[A-Za-z0-9_]` 기준이라
 * 한글은 비단어 문자로 취급된다 — `개입\b`는 문자열 끝에서 경계가 성립하지
 * 않아 "5개입"이 그대로 통과했다(테스트가 잡아냈다). 그래서 라틴 단위와
 * 한글 단위를 갈라 쓴다.
 */
const BULK_QTY =
  /(\b\d+\s*(?:p|ea|pcs)\b|\d+\s*(?:개입|개셋트|개세트|매입|매|팩|세트|입|장|구)|\bx\s*\d+\b)/gi;

/** `[무료배송]`, `(당일)` 같은 괄호 프로모션 블록 */
const BRACKET_PROMO = /[[(【（][^\])】）]{0,20}[\])】）]/g;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * 검색어와 상품 제목이 같은 물건을 가리키는가 (0~1).
 *
 * 한국어 상품명은 붙여 쓰는 일이 많아("주방수납선반") 단어 단위 일치만으로는
 * 놓친다. 그래서 토큰 일치와 **부분 문자열 포함**을 같이 본다.
 */
export function scoreRelevance(keyword: string, productTitle: string): number {
  const kwTokens = tokenize(keyword);
  if (!kwTokens.length) return 0;

  const titleRaw = productTitle.toLowerCase().replace(/\s+/g, "");
  const titleTokens = new Set(tokenize(productTitle));

  let hits = 0;
  for (const token of kwTokens) {
    if (titleTokens.has(token)) {
      hits += 1;
      continue;
    }
    // 붙여 쓴 제목 안에 들어 있으면 부분 점수
    if (token.length >= 2 && titleRaw.includes(token)) {
      hits += 0.8;
      continue;
    }
    // 검색어 토큰이 길면 앞 두 글자만 겹쳐도 약한 신호로 본다
    if (token.length >= 3 && titleRaw.includes(token.slice(0, 2))) {
      hits += 0.3;
    }
  }

  return Math.min(1, hits / kwTokens.length);
}

/**
 * 공급처 제목을 고객이 읽을 제목으로 다듬는다.
 *
 * 순서가 중요하다. 괄호 블록을 먼저 걷어내야 그 안의 홍보 문구가 남지 않고,
 * 수량 표기를 지운 뒤에 공백을 정리해야 "정리함  10P  세트" 같은 자국이
 * 남지 않는다.
 */
export function cleanSupplierTitle(supplierTitle: string): string {
  return supplierTitle
    .replace(BRACKET_PROMO, " ")
    .replace(SELLER_JARGON, " ")
    .replace(BULK_QTY, " ")
    .replace(/[^가-힣a-zA-Z0-9\s.\-+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 등록할 상품명.
 *
 * 검색어를 앞에 붙이는 건 노출에 도움이 되지만, **관련성이 확인된 경우에만**
 * 한다. 이미 제목에 검색어가 들어 있으면 또 붙이지 않는다("거치대 차량용
 * 거치대"처럼 되면 오히려 조잡해 보인다).
 */
export function buildTitle(keyword: string, supplierTitle: string): string {
  const cleaned = cleanSupplierTitle(supplierTitle);
  const compact = cleaned.replace(/\s+/g, "");
  const kwCompact = keyword.replace(/\s+/g, "");

  // 다듬고 나니 남는 게 없으면 검색어라도 쓴다 — 빈 제목보다 낫다
  if (cleaned.length < 4) return keyword;

  const alreadyHas = compact.includes(kwCompact);
  const title = alreadyHas ? cleaned : `${keyword} ${cleaned}`;

  // 토스 상품명 한도에 맞춰 자른다. 단어 중간에서 자르지 않는다.
  const MAX = 60;
  if (title.length <= MAX) return title;
  const cut = title.slice(0, MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
}

/** 상세페이지 문구에 셀러 용어가 섞였는지 — 나가기 전 마지막 확인 */
export function hasSellerJargon(text: string): boolean {
  SELLER_JARGON.lastIndex = 0;
  BULK_QTY.lastIndex = 0;
  return SELLER_JARGON.test(text) || BULK_QTY.test(text);
}
