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
 * ★ 두 시장을 다르게 쓴다
 *
 *  · 도매매(supply, MOQ≤1) → **원가**. 위탁으로 한 개씩 발주할 수 있는 쪽.
 *  · 도매꾹(dome)          → **바닥 확인**. 같은 물건이 대량으로 얼마에 도는지.
 *
 * ★ 소매가를 관측하려던 시도는 실측으로 폐기했다
 *
 * 처음엔 도매꾹 시세를 소매 기준선으로 쓰려 했다. 실제로 돌려보니 원가 대비
 * 배수가 40배~6,800배로 나왔다 — 도매꾹 리스팅의 price는 **묶음 전체 가격**
 * 이라 낱개 단가와 비교 자체가 성립하지 않았다. 그리고 정규화해도 도매꾹은
 * 여전히 도매가다. 소매가가 아니다.
 *
 * 그래서 이렇게 정리했다:
 *
 *  · **원가는 실측이다** — 도매매 낱개 공급가. 이건 진짜 확인된 값이다.
 *  · **판매가는 제안이다** — 원가에 수수료와 목표 마진을 얹어 계산한 값.
 *    관측한 값이 아니므로 사실이라고 말하지 않는다.
 *
 * 이 구분이 중요한 이유: "이 가격에 팔면 마진 20%"는 참이지만, "이 가격에
 * 팔린다"는 아직 아무도 확인하지 않았다. 그 검증은 토스 카탈로그가 붙은
 * 뒤에 경쟁 분석이 한다. 확실성 게이트의 catalog 근거가 그 자리를 지킨다 —
 * 그래서 여기서 판매가를 제안으로 두어도 검증 없는 SKU가 새어 나가지 않는다.
 */

import type { CatalogProduct, TossShopCategory } from "../types";
import {
  clearDomeggookError,
  getLastDomeggookError,
  getLastDomeggookItemFields,
  searchDomeggookMarket,
  searchDomemeUnitWholesale,
} from "./domeggook-api";
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

/**
 * 토스 판매수수료·결제수수료·반품 여유를 합쳐 잡은 값.
 *
 * 배송 인센티브(수수료 0%)를 받는 상태를 전제로 잡지 않는다 — 그건 발송기한
 * 100% 준수 같은 조건이 붙어 있고, 못 지키면 마진이 통째로 어긋난다.
 * 못 받는 쪽을 기본으로 두면 실제로 받을 때 여유가 생길 뿐이다.
 */
const ASSUMED_FEE_RATE = 0.12;
/** 광고·반품·프로모션을 감당하고 남아야 하는 순마진 */
const TARGET_NET_MARGIN = 0.25;

/**
 * 원가에서 판매가를 계산한다 — **제안이지 관측이 아니다**.
 *
 * 원가 = 판매가 × (1 - 수수료 - 마진) 을 뒤집은 것이다. 배송비는 원가에
 * 포함해서 계산한다: 무료배송으로 걸어놓고 배송비를 빼먹으면 팔수록 손해다.
 */
export function proposeRetailKrw(landedCostKrw: number): number {
  const divisor = 1 - ASSUMED_FEE_RATE - TARGET_NET_MARGIN;
  const raw = landedCostKrw / divisor;
  // 990원 단위로 맞춘다 — 가격 끝자리는 전환율에 실제로 영향을 준다
  return Math.max(1000, Math.round(raw / 100) * 100 - 10);
}

/** 이 값보다 싼 물건은 배송비가 마진을 통째로 먹는다 */
/**
 * 도매 원가 하한 — 목표에서 역산한 값.
 *
 * ★ 왜 1,200원에서 올렸나
 *
 * 종전 하한은 1,200원이었다. 그 상품은 순마진 25%를 지켜도 개당 598원이고,
 * 그 숫자로 월 1,000만원을 만들려면 한 달에 16,722개를 팔아야 한다 —
 * 위탁판매로 불가능한 수다. 즉 **아무리 많이 발굴해도 목표에 못 닿는
 * 상품들로 후보 자리를 채우고 있었다.**
 *
 * 시뮬레이션 실측(SKU 300개 기준):
 *   개당 3,300원 → 달성확률  3.9%
 *   개당 4,500원 → 달성확률 52.8%
 *   개당 6,000원 → 달성확률 95.5%
 *
 * 개당 3,200원(= 원가 약 8,000원)이 SKU 300개로 목표를 여는 최소선이다.
 * 여기에 약간 여유를 둬 6,000원부터 본다 — 너무 좁게 잡으면 공급이 말라
 * 발굴 자체가 멈추기 때문이다. 그 위의 선별은 인증 게이트가 맡는다.
 */
const MIN_LANDED_COST_KRW = 6000;
/** 위탁 한 건에 이만큼 넘게 묶이면 반품 한 건의 타격이 너무 크다 */
/**
 * 도매 원가 상한 — 소비자가 실제로 사는 가격대에서 역산한다.
 *
 * ★ 실측으로 드러난 사고
 *
 * 원가 100,409원짜리를 소싱해 **판매가 159,380원**으로 올렸다.
 * 시리얼 한 세트가 15만원이다. 도매꾹에서 30개들이 박스를 낱개로 착각한
 * 것인데, 우리 가격 계산에는 "이 값이 소비자가 살 만한 값인가"를 보는
 * 단계가 아예 없었다 — 원가에 마진만 얹으면 얼마가 나오든 그대로 올렸다.
 *
 * 상한 120,000원은 제안가 190,490원이 된다. 리뷰 하나 없는 신규 셀러의
 * 19만원짜리 상품은 팔리지 않는다. 소비자가 실제로 사는 구간(5만원 이하)에
 * 맞춰 상한을 정한다.
 */
const MAX_LANDED_COST_KRW = 31_500;

/**
 * 낱개가 아니라 **묶음·박스**로 파는 상품의 신호.
 *
 * 도매꾹에는 업소용 대량 상품이 섞여 있다. 그건 소비자가 토스에서 살
 * 물건이 아니고, 낱개로 착각하면 위 사고처럼 값이 터무니없어진다.
 */
const BULK_LOT_PATTERNS = [
  /\b\d{2,}\s*(개|입|매|장|포|봉|병|캔|팩)입?\b/,
  /x\s*\d{2,}\b/i,
  /(박스|케이스|BOX|카톤)\s*(단위|판매)?/i,
  /(업소용|대용량|벌크|도매전용|대량)/,
];

function looksLikeBulkLot(title: string): boolean {
  return BULK_LOT_PATTERNS.some((re) => re.test(title));
}

/**
 * 같은 키워드의 다른 공급처들과 견줘 **혼자만 비싼** 물건을 걸러낸다.
 *
 * ★ 이게 진짜 경쟁 분석이다
 *
 * 종전엔 "경쟁사 가격"이라고 부르던 값이 사실 **우리가 만든 제안가끼리의
 * 비교**였다. 카탈로그가 전부 우리 계산 결과라 순환 참조였고, 그래서
 * 시장에서 말이 안 되는 값도 아무 데서도 안 걸렸다.
 *
 * 반면 같은 키워드로 검색된 공급처들의 도매가는 **실제 시장 데이터**다.
 * 다들 8천~1만2천 원에 파는데 혼자 10만원이면, 그건 같은 물건이 아니라
 * 묶음이거나 다른 상품이다. 중앙값의 몇 배가 넘으면 뺀다.
 */
const PEER_PRICE_MULTIPLE_LIMIT = 3;

function medianPrice(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export type DiscoveredKeyword = {
  keyword: string;
  category: TossShopCategory;
  /** 도매꾹 묶음 리스팅 수 — 이 물건이 실제로 도는지 확인하는 용도 */
  domeListings: number;
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
  /** 도매꾹이 돌려준 오류 원문 — 있으면 이게 진짜 원인이다 */
  apiError?: { code: string; message: string };
  /** 응답 상품이 실제로 담고 있던 필드 — 가정이 아니라 실측으로 짜기 위해 */
  itemFields?: string[];
  /** 관측된 낱개 공급가 표본 — 왜 걸러졌는지 판단 근거 */
  costSamples?: number[];
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
  // 지난 번 오류가 이번 결과에 묻어나지 않게 지우고 시작한다
  clearDomeggookError();

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

      // 도매꾹 리스팅은 이 물건이 시장에서 실제로 도는지 확인하는 데만 쓴다.
      // 가격은 묶음 단위라 낱개 원가와 비교가 성립하지 않는다(실측으로 확인).
      if (supply.length > 0) {
        discovered.push({ keyword, category, domeListings: dome.length, supply });
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
    apiError: getLastDomeggookError() ?? undefined,
    itemFields: getLastDomeggookItemFields() ?? undefined,
    // 원가 표본 — 걸러진 이유를 판단할 근거로 남긴다
    // 관측된 낱개 공급가 전체 범위 — "왜 하나도 안 남았나"를 판단할 근거.
    // 표본을 앞 몇 개만 보면 정렬이 밀어주는 쪽만 보고 오판하게 된다.
    costSamples: (() => {
      const all = discovered.flatMap((d) => d.supply.map((x) => x.unitPriceKrw)).filter((n) => n > 0);
      if (all.length === 0) return [];
      const sorted = [...all].sort((a, b) => a - b);
      return [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1], all.length];
    })(),
  };
}

/**
 * 발굴 결과를 소싱 후보 표본으로 바꾼다.
 *
 * ★ 값을 지어내지 않기 위해 지킨 것
 *
 *  · `priceKrw`는 원가에서 계산한 **제안가**다. 관측한 소매가가 아니다.
 *    이 구분은 확실성 게이트가 지킨다 — 게이트는 공급처와 원가가 실측인지만
 *    필수로 따지고, "이 가격에 팔리는가"는 카탈로그 근거가 따로 검증한다.
 *  · `reviewCount`·`rating`은 0이다. 도매꾹 검색 응답에 없는 값이라 모르는
 *    것이고, 모르는 값은 0으로 둔다. 그럴듯한 수를 넣으면 경쟁 분석이
 *    그 가짜 위에서 돌아간다.
 *  · `id`는 실물 상품번호에서 만든다. 데모 시드(p001 형식)와 형태가 달라야
 *    `inferDataQuality`가 이 표본을 실데이터로 인식한다.
 */
/**
 * 발굴 표본의 **형식** 판. 표본에 실리는 필드가 바뀌면 올린다.
 *
 * 표본은 가맹점 데이터에 그대로 저장돼 다음 사이클에도 재사용된다.
 * 그래서 형식이 바뀌어도 옛 표본이 남아 새 필드 없이 계속 돌아가는데,
 * 그러면 배포를 해도 결과가 그대로라 고쳤는지 아닌지 알 수가 없다.
 * (실제로 sourceKeyword·sourceListing을 추가하고 배포했는데 프로덕션
 * 수치가 한 자리도 안 바뀌어 한참을 헤맸다.)
 *
 * 판이 다르면 옛 표본을 버리고 처음부터 다시 훑는다.
 */
export const DISCOVERY_FORMAT_VERSION = "4";

export function buildCatalogFromDiscovery(
  discovered: DiscoveredKeyword[],
  now: string,
): CatalogProduct[] {
  const products: CatalogProduct[] = [];
  const seen = new Set<string>();

  for (const d of discovered) {
    let rank = 1;

    // 같은 키워드 공급처들의 도매가 중앙값 — 이게 이 상품군의 실제 시세다.
    const peerMedian = medianPrice(
      d.supply.map((x) => x.unitPriceKrw + (x.freeShipping ? 0 : x.shippingFeeKrw)).filter((n) => n > 0),
    );

    for (const s of d.supply) {
      // 배송비를 원가에 포함한다. 무료배송으로 걸어놓고 이걸 빼먹으면
      // 팔수록 손해가 나는데, 그건 등록한 뒤에야 드러난다.
      const landed = s.unitPriceKrw + (s.freeShipping ? 0 : s.shippingFeeKrw);
      if (landed < MIN_LANDED_COST_KRW || landed > MAX_LANDED_COST_KRW) continue;

      // 묶음·박스 상품은 소비자가 토스에서 살 물건이 아니다.
      if (looksLikeBulkLot(s.title)) continue;

      // 같은 키워드의 시세에서 혼자만 크게 벗어나면 같은 물건이 아니다.
      if (peerMedian > 0 && landed > peerMedian * PEER_PRICE_MULTIPLE_LIMIT) continue;

      const id = `dg-${s.platform}-${s.itemNo ?? s.title.slice(0, 12)}`;
      if (seen.has(id)) continue;
      seen.add(id);

      products.push({
        id,
        // 키워드를 앞에 붙인다 — 하류 키워드 랭킹이 상품명에서 키워드를 찾는데,
        // 공급처가 지은 제목에는 검색어가 안 들어 있는 경우가 흔하다.
        name: s.title.includes(d.keyword) ? s.title : `${d.keyword} ${s.title}`,
        category: d.category,
        priceKrw: proposeRetailKrw(landed),
        reviewCount: 0,
        rating: 0,
        sellerName: s.sellerNick ?? s.sellerId ?? "공급처",
        imageUrl: s.imageUrl,
        rank,
        rankPrev: rank,
        updatedAt: now,
        // 제안가를 계산한 바로 그 공급처를 함께 들려보낸다.
        // 이게 없으면 하류가 키워드로 다시 검색해 다른 공급처를 잡고,
        // 그 순간 제안가(A의 원가 기준)와 원가(B)가 짝이 어긋난다.
        sourceListing: s,
        // 이 표본을 찾아낸 검색어 그대로 — 하류에서 상품명을 쪼개 만들지
        // 않게 한다. 쪼개면 롱테일이 헤드 키워드가 된다.
        sourceKeyword: d.keyword,
      });
      rank += 1;
    }
  }
  return products;
}
