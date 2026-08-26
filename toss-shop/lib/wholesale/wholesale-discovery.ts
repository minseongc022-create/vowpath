/**
 * 도매꾹 직접 발굴 — 카탈로그에 없는 걸 찾아온다
 *
 * ★ 왜 이게 필요했나
 *
 * 자비스가 "올릴 만한 게 없다"를 반복한 진짜 이유는 기준이 높아서가 아니었다.
 * 소싱 파이프라인이 **카탈로그에 이미 있는 상품에서만** 키워드를 뽑고 있었고,
 * 그 카탈로그가 데모 시드(p001…)였다. 그래서
 *
 *   · 후보 자체가 두어 개밖에 안 만들어졌고
 *   · 그 두어 개는 도매꾹에서 실시간 공급처가 안 잡혀
 *   · 확실성 게이트가 "공급처·원가가 실측이 아니다"로 전부 걷어냈다
 *
 * 게이트는 제 일을 한 것이다. 문제는 **게이트에 도달하는 후보가 가짜였다**는
 * 것이다. 기준을 낮추면 가짜에 광고비를 태우게 되므로, 고쳐야 할 건 입구다.
 *
 * ★ 이 모듈이 하는 일
 *
 * 도매꾹·도매매를 **직접** 넓게 훑어서 시장 표본을 실물로 가져온다. 그러면
 * 하류의 모든 판단(키워드 랭킹·경쟁 분석·가격·게이트)이 실측 위에서 돈다.
 * 카탈로그가 데모냐 아니냐와 무관해진다.
 *
 * ★ 두 시장을 다르게 쓴다 — 이게 핵심이다
 *
 *  · 도매매(supply, MOQ≤1) → **원가**. 위탁으로 한 개씩 발주할 수 있는 쪽.
 *  · 도매꾹(dome)          → **시세 기준선**. 같은 물건이 얼마에 거래되는지.
 *
 * 소매가를 원가에 마진율을 곱해 지어내지 않는다. 그렇게 하면 "마진 20% 확보"가
 * 동어반복이 되어 버린다 — 내가 정한 마진이 다시 근거로 돌아오는 것이라
 * 아무것도 검증하지 못한다. 시세는 반드시 바깥에서 관측한 값이어야 한다.
 */

import type { CatalogProduct, TossShopCategory } from "../types";
import { searchDomeggookMarket, searchDomemeUnitWholesale } from "./domeggook-api";
import type { WholesaleListing } from "./types";

export const WHOLESALE_DISCOVERY_VERSION = "1.0";

/**
 * 훑을 키워드 — 카테고리마다 넓게.
 *
 * 고른 기준은 "위탁으로 돌릴 수 있는가"다. 즉 가볍고(배송비가 마진을 안 먹고),
 * 규격이 단순하고(사이즈·색상 교환 분쟁이 적고), 반복 구매가 있는 것.
 * 명품·가전 대형·신선식품처럼 위탁 사고가 큰 품목은 일부러 뺐다.
 */
export const DISCOVERY_KEYWORDS: Record<TossShopCategory, string[]> = {
  home: [
    "주방정리함", "실리콘 주방매트", "욕실 선반", "수납 바구니", "빨래 건조대",
    "행거", "옷걸이", "밀폐용기", "도마", "칼갈이", "주방 세제", "청소솔",
    "물걸레 청소포", "먼지떨이", "제습제", "탈취제", "디퓨저", "방향제",
    "무드등", "led 센서등", "멀티탭", "케이블 정리", "커튼", "러그",
    "이불 커버", "베개 커버", "슬리퍼", "발매트", "우산꽂이", "신발 정리대",
    "쓰레기통", "종량제봉투 홀더", "위생장갑", "지퍼백", "food 랩", "키친타월",
  ],
  beauty: [
    "클렌징폼", "선크림", "수분크림", "토너 패드", "마스크팩", "립밤",
    "핸드크림", "바디로션", "샴푸", "트리트먼트", "헤어에센스", "헤어롤",
    "네일 스티커", "네일 리무버", "화장솜", "메이크업 브러시", "퍼프",
    "화장품 파우치", "향수 공병", "아이브로우", "쿠션 리필", "각질제거",
    "발 각질", "제모기", "면도기", "눈썹칼", "미스트", "앰플",
  ],
  health: [
    "비타민", "유산균", "오메가3", "루테인", "콜라겐", "밀크씨슬",
    "홍삼", "마그네슘", "아연", "프로틴 쉐이크", "다이어트 보조",
    "요가매트", "폼롤러", "마사지볼", "손목 보호대", "무릎 보호대",
    "자세교정 밴드", "발목 보호대", "찜질팩", "온열 안대", "코골이 방지",
    "체중계", "줄넘기", "아령", "푸시업바", "스트레칭 밴드",
  ],
  digital: [
    "무선 이어폰", "이어폰 케이스", "보조배터리", "고속 충전기", "c타입 케이블",
    "usb 허브", "무선 충전기", "차량용 거치대", "핸드폰 그립톡", "휴대폰 케이스",
    "강화유리 필름", "블루투스 스피커", "무선 마우스", "키보드", "마우스패드",
    "노트북 거치대", "노트북 파우치", "웹캠", "sd카드 리더기", "hdmi 케이블",
    "스마트워치 스트랩", "태블릿 거치대", "셀카봉", "미니 선풍기", "usb 가습기",
  ],
  fashion: [
    "양말", "수면양말", "덧신", "모자", "볼캡", "비니", "머플러", "장갑",
    "벨트", "지갑", "카드지갑", "에코백", "크로스백", "백팩", "파우치",
    "머리끈", "헤어핀", "곱창밴드", "귀걸이", "목걸이", "반지", "팔찌",
    "선글라스", "안경 닦이", "우산", "장우산", "레인부츠", "실내화",
  ],
  food: [
    "견과류", "아몬드", "호두", "건과일", "육포", "젤리", "사탕",
    "커피 원두", "드립백 커피", "티백", "홍차", "보리차", "옥수수수염차",
    "누룽지", "미숫가루", "곤약젤리", "단백질바", "시리얼", "오트밀",
    "김", "참기름", "올리브유", "소금", "후추", "간장",
  ],
};

/** 전체 키워드를 한 줄로 — 순회 순서는 카테고리를 번갈아 섞는다 */
export function allDiscoveryKeywords(): Array<{ keyword: string; category: TossShopCategory }> {
  const cats = Object.keys(DISCOVERY_KEYWORDS) as TossShopCategory[];
  const out: Array<{ keyword: string; category: TossShopCategory }> = [];
  const maxLen = Math.max(...cats.map((c) => DISCOVERY_KEYWORDS[c].length));
  // 카테고리를 번갈아 넣는 이유: 시간 예산이 중간에 끊겨도 한 카테고리만
  // 잔뜩 훑고 끝나지 않게 하기 위해서다. 어디서 끊기든 골고루 남는다.
  for (let i = 0; i < maxLen; i += 1) {
    for (const c of cats) {
      const kw = DISCOVERY_KEYWORDS[c][i];
      if (kw) out.push({ keyword: kw, category: c });
    }
  }
  return out;
}

/**
 * 이번 사이클에 훑을 구간을 고른다.
 *
 * 매번 앞에서부터 훑으면 뒤쪽 키워드는 영원히 안 본다. 사이클마다 시작점을
 * 옮겨 전체를 한 바퀴 돌게 한다 — "구석구석 다 본다"는 건 한 번에 다 보는 게
 * 아니라 빠짐없이 돈다는 뜻이다.
 */
export function rotatingSlice<T>(all: T[], size: number, cursor: number): { slice: T[]; next: number } {
  if (all.length === 0 || size <= 0) return { slice: [], next: 0 };
  const start = ((cursor % all.length) + all.length) % all.length;
  const slice: T[] = [];
  for (let i = 0; i < Math.min(size, all.length); i += 1) {
    slice.push(all[(start + i) % all.length]);
  }
  return { slice, next: (start + slice.length) % all.length };
}

/** 시세 기준선을 믿으려면 관측치가 이만큼은 있어야 한다 */
const MIN_ANCHOR_SAMPLES = 3;
/** 원가 대비 시세가 이 배수 미만이면 위탁 마진이 안 나온다 */
const MIN_PRICE_MULTIPLE = 1.35;
/** 시세가 원가의 이 배수를 넘으면 짝이 안 맞는 물건을 비교한 것이다 */
const MAX_PRICE_MULTIPLE = 12;

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export type DiscoveredKeyword = {
  keyword: string;
  category: TossShopCategory;
  /** 도매꾹에서 관측한 시세 중앙값 — 소매가를 지어내지 않기 위한 바깥 기준 */
  anchorPriceKrw: number;
  anchorSamples: number;
  /** 위탁 가능한(MOQ≤1) 실시간 공급 리스팅 */
  supply: WholesaleListing[];
};

export type DiscoveryResult = {
  keywordsScanned: number;
  keywordsWithSupply: number;
  /** 실측으로 만들어진 시장 표본 — 그대로 카탈로그로 쓴다 */
  products: CatalogProduct[];
  discovered: DiscoveredKeyword[];
  /** 다음 사이클이 이어서 훑을 위치 */
  nextCursor: number;
  /** 시간 예산에 걸려 중간에 멈췄는가 */
  truncated: boolean;
  /** API가 한 건도 응답하지 않았는가 — 키 문제와 "물건이 없음"을 구분한다 */
  apiSilent: boolean;
};

export type DiscoveryProgress = {
  done: number;
  total: number;
  keyword: string;
  found: number;
};

/**
 * 도매꾹·도매매를 직접 훑어 실측 시장 표본을 만든다.
 *
 * ★ 시간 예산을 반드시 둔다
 *
 * 서버리스 함수는 정해진 시간이 지나면 통째로 죽는다. 그러면 이번에 찾은 걸
 * 하나도 못 돌려주고 사장님 화면엔 또 "없습니다"가 뜬다. 그래서 예산이 다하면
 * **거기까지 찾은 것을 반환**하고 어디까지 봤는지(nextCursor) 남긴다.
 * 다음 사이클이 그 지점부터 이어서 돈다.
 */
export async function discoverWholesaleMarket(input: {
  keywords?: Array<{ keyword: string; category: TossShopCategory }>;
  /** 이번에 훑을 키워드 수 */
  size?: number;
  cursor?: number;
  /** 밀리초 예산 — 초과하면 찾은 만큼 돌려준다 */
  budgetMs?: number;
  concurrency?: number;
  onProgress?: (p: DiscoveryProgress) => void;
  now?: string;
}): Promise<DiscoveryResult> {
  const universe = input.keywords ?? allDiscoveryKeywords();
  const { slice, next } = rotatingSlice(universe, input.size ?? 24, input.cursor ?? 0);
  const budgetMs = input.budgetMs ?? 45_000;
  const concurrency = Math.max(1, input.concurrency ?? 4);
  const startedAt = Date.now();
  const now = input.now ?? new Date().toISOString();

  const discovered: DiscoveredKeyword[] = [];
  let scanned = 0;
  let truncated = false;
  let anyResponse = false;

  let cursorInSlice = 0;
  async function worker() {
    for (;;) {
      if (Date.now() - startedAt > budgetMs) {
        truncated = true;
        return;
      }
      const i = cursorInSlice;
      cursorInSlice += 1;
      if (i >= slice.length) return;
      const { keyword, category } = slice[i];

      // 두 시장을 동시에 친다 — 원가 쪽과 시세 쪽은 서로를 기다릴 이유가 없다
      const [supply, dome] = await Promise.all([
        searchDomemeUnitWholesale(keyword, 8),
        searchDomeggookMarket(keyword, "dome", 8),
      ]);
      scanned += 1;
      if (supply.length > 0 || dome.length > 0) anyResponse = true;

      const anchorPrices = dome.map((d) => d.unitPriceKrw).filter((p) => p > 0);
      if (supply.length > 0 && anchorPrices.length >= MIN_ANCHOR_SAMPLES) {
        discovered.push({
          keyword,
          category,
          anchorPriceKrw: median(anchorPrices),
          anchorSamples: anchorPrices.length,
          supply,
        });
      }
      input.onProgress?.({
        done: scanned,
        total: slice.length,
        keyword,
        found: discovered.length,
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, slice.length) }, worker));

  return {
    keywordsScanned: scanned,
    keywordsWithSupply: discovered.length,
    products: buildCatalogFromDiscovery(discovered, now),
    discovered,
    nextCursor: next,
    truncated,
    // 한 키워드도 응답이 없었다면 "팔 게 없는 것"이 아니라 연동이 끊긴 것이다.
    // 이 둘을 뭉뚱그리면 사장님은 영원히 원인을 모른 채 기다리게 된다.
    apiSilent: scanned > 0 && !anyResponse,
  };
}

/**
 * 발굴 결과를 카탈로그(시장 표본)로 바꾼다.
 *
 * ★ 값을 지어내지 않기 위해 지킨 것
 *
 *  · `priceKrw`는 도매꾹에서 **관측한 시세 중앙값**이다. 원가에 마진을 곱한
 *    값이 아니다. 그래야 하류의 마진 계산이 실제로 뭔가를 검증한다.
 *  · `reviewCount`·`rating`은 0이다. 도매꾹 검색 응답에 없는 값이라 모르는
 *    것이고, 모르는 값은 0으로 둔다. 그럴듯한 수를 넣으면 경쟁 분석이
 *    그 가짜 위에서 돌아간다.
 *  · `id`는 실물 상품번호에서 만든다. 데모 시드(p001 형식)와 형태가 달라야
 *    `inferDataQuality`가 이 표본을 실데이터로 인식한다.
 */
export function buildCatalogFromDiscovery(
  discovered: DiscoveredKeyword[],
  now: string,
): CatalogProduct[] {
  const products: CatalogProduct[] = [];
  const seen = new Set<string>();

  for (const d of discovered) {
    let rank = 1;
    for (const s of d.supply) {
      const multiple = s.unitPriceKrw > 0 ? d.anchorPriceKrw / s.unitPriceKrw : 0;
      // 시세가 원가에 너무 붙어 있으면 팔아도 남는 게 없고, 너무 벌어져 있으면
      // 애초에 다른 물건을 비교한 것이다(용량 차이·묶음 등). 둘 다 버린다.
      if (multiple < MIN_PRICE_MULTIPLE || multiple > MAX_PRICE_MULTIPLE) continue;

      const id = `dg-${s.platform}-${s.itemNo ?? s.title.slice(0, 12)}`;
      if (seen.has(id)) continue;
      seen.add(id);

      products.push({
        id,
        // 키워드를 앞에 붙인다 — 하류 키워드 랭킹이 상품명에서 키워드를 찾는데,
        // 공급처가 지은 제목에는 검색어가 안 들어 있는 경우가 흔하다.
        name: s.title.includes(d.keyword) ? s.title : `${d.keyword} ${s.title}`,
        category: d.category,
        priceKrw: d.anchorPriceKrw,
        reviewCount: 0,
        rating: 0,
        sellerName: s.sellerNick ?? s.sellerId ?? "공급처",
        imageUrl: s.imageUrl,
        rank,
        rankPrev: rank,
        updatedAt: now,
      });
      rank += 1;
    }
  }
  return products;
}
