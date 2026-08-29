import type { WholesaleListing, WholesalePlatform } from "./types";
import { readSupplierQuality, meetsSupplierPolicy } from "./supplier-quality";
import {
  readPriceFieldsFromItemView,
  resolveSingleUnitSourcing,
  type SingleUnitSourcing,
} from "./domeggook-price";
import { readItemDetailExtras, type ItemDetailExtras } from "./domeggook-detail";

/**
 * 낱개 발주 판정 캐시.
 *
 * 자동 등록 사이클이 60초마다 돌기 때문에, 캐시가 없으면 같은 상품의 상세를
 * 1분마다 다시 조회한다. 후보가 수십 개면 분당 수십 건이 되어 레이트리밋에
 * 걸리고, 그러면 전부 "미확인"으로 떨어져 소싱이 조용히 멈춘다.
 * 구매단위·가격 구간은 자주 바뀌지 않으므로 넉넉히 잡는다.
 */
const UNIT_SOURCING_TTL_MS = 6 * 60 * 60 * 1000;
const UNIT_SOURCING_CACHE_MAX = 500;
const unitSourcingCache = new Map<string, { at: number; value: SingleUnitSourcing }>();

/**
 * getItemView **원본 응답** 캐시.
 *
 * confirmSingleUnitSourcing과 getItemDetail(사진·반품주소·이미지 사용
 * 허가)이 같은 상품번호로 같은 엔드포인트를 부른다. 따로 부르면 후보
 * 하나당 API 호출이 두 배가 되어 레이트리밋에 더 쉽게 걸린다 — 한 번
 * 받은 원본을 여기 캐시해 두 곳이 나눠 쓴다.
 */
const ITEM_VIEW_TTL_MS = 6 * 60 * 60 * 1000;
const ITEM_VIEW_CACHE_MAX = 500;
const itemViewCache = new Map<string, { at: number; data: unknown }>();

/** 테스트·핫리로드용 */
export function clearUnitSourcingCache(): void {
  unitSourcingCache.clear();
}

const API_BASE = "https://www.domeggook.com/ssl/api/";

type DomeMarket = "dome" | "supply";

/**
 * ★ 도매꾹은 숫자를 **문자열로** 준다
 *
 * 실제 응답을 떠서 확인했다:
 *   {"no":"9502515","price":"6900","unitQty":"1","deli":{"fee":"5000"}}
 *
 * 종전 타입은 이걸 전부 `number`로 선언했다. 타입은 컴파일 때만 존재하니
 * 아무도 안 막아줬고, 런타임에서 `typeof item.unitQty === "number"`가 늘
 * false가 됐다. 그래서 **모든 상품이 "MOQ 미확인"으로 읽혀** 소싱 게이트에서
 * 통째로 걸러졌다 — 검색어 24개가 전부 "상품 0개"로 나오던 진짜 원인이다.
 * API는 멀쩡히 3,777개를 주고 있었다.
 *
 * 오류가 하나도 안 났다는 게 이 고장의 고약한 점이다. "팔 물건이 없네"로만
 * 보였다. 그래서 타입을 실제 응답대로 적고, 읽을 때 반드시 숫자로 바꾼다.
 */
type DomeItem = {
  no?: string | number;
  title?: string;
  price?: string | number;
  thumb?: string;
  id?: string;
  nick?: string;
  unitQty?: string | number;
  url?: string;
  deli?: { who?: string; fee?: string | number; fromOversea?: boolean };
  /** 응답에 설명·안내 텍스트가 실려 오는 경우 (검색 API는 보통 주지 않음) */
  desc?: string;
  content?: string;
  info?: string;
};

/**
 * 문자열로 와도 숫자로 읽는다. 숫자로 못 읽으면 null —
 * **0이나 1로 얼버무리지 않는다**. MOQ를 얼버무리면 발주가 안 되는 상품을
 * 팔게 되고, 가격을 얼버무리면 마진 계산이 통째로 틀어진다.
 */
function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * MOQ를 못 읽었을 때 쓰는 값.
 *
 * 1(낙관)도 아니고 0(무의미)도 아닌, "위탁으로는 못 쓴다"가 분명한 큰 수다.
 * 이 값이 그대로 마진 계산에 들어가는 일은 없다 — 소싱 게이트가 먼저 막는다.
 */
export const UNKNOWN_MOQ = 9999;

function getApiKey(): string | null {
  const key = process.env.DOMEGGOOK_API_KEY?.trim();
  return key || null;
}

function parseDeliFee(fee: string | number | undefined): number {
  if (fee == null) return 0;
  const n = typeof fee === "number" ? fee : parseInt(String(fee).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/** 응답의 최상위 구조만 짧게 적는다 — 파싱 경로가 어긋났는지 판별용 */
function describeShape(raw: unknown): string {
  if (!raw || typeof raw !== "object") return typeof raw;
  const top = Object.keys(raw as object).slice(0, 6);
  const list = (raw as { list?: unknown }).list;
  const inner =
    list && typeof list === "object" ? `/list:${Object.keys(list as object).slice(0, 6).join(",")}` : "";
  return `${top.join(",")}${inner}`;
}

/**
 * 응답에서 상품 목록을 꺼낸다.
 *
 * ★ 실측으로 드러난 것
 *
 * 도매꾹 응답은 `{ domeggook: { list: { item: [...] } } }`처럼 **바깥 껍질이
 * 한 겹 더 있다**(시장에 따라 껍질 이름이 달라진다). 종전 파서는 `list.item`만
 * 봤기 때문에 정상 응답을 전부 빈 목록으로 읽었다. 오류도 안 났다 — 그냥
 * "팔 물건이 없다"로 보였고, 그 결과 소싱이 통째로 멈춰 있었다.
 *
 * 그래서 껍질 이름을 특정하지 않고 **목록을 찾아 들어간다**. 도매꾹이 응답
 * 구조를 또 바꿔도 이 코드는 계속 동작해야 한다 — 한 번 겪은 실패를 같은
 * 모양으로 다시 겪지 않기 위해서다.
 */
function normalizeItems(raw: unknown): DomeItem[] {
  const found = findItemList(raw, 0);
  if (!found) return [];
  return Array.isArray(found) ? found : [found];
}

/** 최대 이만큼만 파고든다 — 순환 참조나 거대한 응답에서 멈추지 못하면 안 된다 */
const MAX_SEARCH_DEPTH = 6;

function findItemList(node: unknown, depth: number): DomeItem | DomeItem[] | null {
  if (depth > MAX_SEARCH_DEPTH || !node || typeof node !== "object") return null;

  const obj = node as Record<string, unknown>;

  // 우리가 찾는 모양: { list: { item: ... } }
  const list = obj.list;
  if (list && typeof list === "object") {
    const item = (list as Record<string, unknown>).item;
    if (item && typeof item === "object") return item as DomeItem | DomeItem[];
  }
  // 껍질이 한 겹 덜한 경우: { item: ... }
  if (obj.item && typeof obj.item === "object" && looksLikeItems(obj.item)) {
    return obj.item as DomeItem | DomeItem[];
  }

  // 아니면 껍질을 하나씩 벗겨 내려간다
  for (const value of Object.values(obj)) {
    const hit = findItemList(value, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** 상품처럼 생겼는가 — 엉뚱한 `item` 키를 상품으로 오인하지 않게 */
function looksLikeItems(value: unknown): boolean {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || typeof first !== "object") return false;
  const o = first as Record<string, unknown>;
  return "no" in o || "title" in o || "price" in o;
}

/** 응답에 실려 온 설명·안내 텍스트를 모아 반품정책 판독 입력으로 쓴다 */
function collectPolicyText(item: DomeItem): string | undefined {
  const parts = [item.desc, item.content, item.info].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  return parts.length ? parts.join("\n") : undefined;
}

function toListing(item: DomeItem, platform: WholesalePlatform): WholesaleListing | null {
  const supplierQuality = readSupplierQuality(item);

  // 문자열로 와도 숫자로 읽는다 — 도매꾹은 "6900"처럼 준다.
  // 종전 코드는 `item.price <= 0`을 문자열에 그대로 걸었다. 자바스크립트가
  // 알아서 숫자로 바꿔주는 바람에 통과는 했지만, 그 뒤로 **문자열이 그대로
  // 원가 자리에 들어가** 마진 계산에 섞였다.
  const priceKrw = toNum(item.price);
  if (!item.title || priceKrw == null || priceKrw <= 0) return null;

  const shippingFeeKrw = parseDeliFee(item.deli?.fee);
  const freeShipping = item.deli?.who === "S";
  const itemNo = item.no != null ? String(item.no) : "";
  const url =
    item.url?.trim() ||
    (itemNo ? `https://domeme.com/s/${itemNo}` : `https://www.domeggook.com/main/item/itemView.php?itemNo=`);

  // ★ MOQ는 fail-closed로 읽는다.
  //
  // `unitQty`는 공식 문서상 **상품 최소구매수량(MOQ)**이다. 종전 코드는
  // `item.unitQty ?? 1`로 읽어서, 필드가 없으면 "1개씩 살 수 있다"고 단정했다.
  // 실제 MOQ가 10인 상품에 이 가정을 적용하면 주문을 받아 놓고 발주를 못 한다
  // — 위탁은 주문 뒤 발주하기 때문이다. 취소·페널티가 쌓이면 배송 인센티브
  // (판매수수료 0%)가 날아가 전 상품 마진이 8%p 깎인다.
  //
  // 그래서 못 읽으면 1이 아니라 **미확인**으로 둔다. 미확인 MOQ는 소싱
  // 게이트에서 걸러진다. 확인된 1만 낱개 발주로 인정한다.
  //
  // ★ 여기가 "검색어 24개에서 상품 0개"의 진짜 원인이었다.
  //
  // 종전 코드는 `typeof item.unitQty === "number"`를 요구했는데, 도매꾹은
  // `"unitQty":"1"`처럼 **문자열로** 준다. 그래서 이 검사가 늘 false가 되어
  // **모든 상품이 MOQ 미확인**으로 읽혔고, 소싱 게이트가 전부 걸러냈다.
  // API는 멀쩡히 3,777개를 주고 있었는데 화면엔 "팔 물건이 없다"만 떴다.
  // 오류가 하나도 안 나서 몇 주를 그렇게 돌았다.
  const moqNum = toNum(item.unitQty);
  const moqRead = moqNum != null && moqNum > 0 ? moqNum : null;

  return {
    platform,
    itemNo,
    title: item.title.replace(/\s+/g, " ").trim(),
    // 이 단가는 **MOQ 수량으로 살 때의 개당 가격**이다. MOQ가 1이 아니면
    // "1개 살 때의 가격"이 아니므로 그대로 원가로 쓰면 안 된다.
    // 낱개 원가는 상세 조회로 확정한다 (domeggook-price.resolveSingleUnitSourcing).
    unitPriceKrw: priceKrw,
    shippingFeeKrw: freeShipping ? 0 : shippingFeeKrw,
    // 미확인은 낙관적으로 1이 아니라, 위탁 불가에 해당하는 값으로 둔다.
    moq: moqRead ?? UNKNOWN_MOQ,
    moqVerified: moqRead != null,
    url,
    imageUrl: item.thumb?.trim(),
    sellerId: item.id,
    sellerNick: item.nick ?? item.id,
    freeShipping,
    source: "live",
    supplierQuality,
    policyText: collectPolicyText(item),
  };
}

/**
 * 테스트 전용 — 응답 파싱만 따로 검증하기 위해 연다.
 *
 * 이 경로가 조용히 어긋나면 소싱이 통째로 멈추는데 오류는 하나도 안 난다.
 * 실제로 그렇게 멈춰 있었다. 그래서 파싱만은 반드시 테스트로 묶어둔다.
 */
export function __readItemsForTest(raw: unknown): DomeItem[] {
  return normalizeItems(raw);
}

/**
 * 테스트 전용 — 상품 한 건을 실제로 어떻게 읽는지 검증하기 위해 연다.
 *
 * 파싱이 되어도 여기서 값을 잘못 읽으면(문자열 MOQ를 못 읽는 것처럼) 결과는
 * 똑같이 "상품 0개"다. 실제로 그렇게 멈춰 있었으므로 이 단계도 묶어둔다.
 */
export function __toListingForTest(
  item: DomeItem,
  platform: WholesalePlatform,
): WholesaleListing | null {
  return toListing(item, platform);
}

export function isDomeggookApiConfigured(): boolean {
  return Boolean(getApiKey());
}

/**
 * 마지막으로 도매꾹이 돌려준 오류 — 실패 원인을 사장님에게 그대로 전하기 위해.
 *
 * ★ 왜 필요했나
 *
 * 도매꾹은 인증 실패·권한 없음도 **HTTP 200에 오류 본문**을 담아 보낸다.
 * 그래서 `if (!res.ok)` 검사에 걸리지 않고, 목록이 비어 있는 것처럼 보였다.
 * 결과는 "팔 만한 게 없습니다"였고, 진짜 원인(키 만료·IP 제한)은 아무 데도
 * 안 나타났다. 없는 것과 못 읽는 것은 완전히 다른 상황인데 화면에서는
 * 똑같아 보였다.
 */
let lastApiError: { code: string; message: string; at: string } | null = null;

export function getLastDomeggookError() {
  return lastApiError;
}

/** 마지막 응답 상품이 실제로 담고 있던 필드 이름 — 가정이 아니라 실측으로 짜기 위해 */
let lastItemFields: string[] | null = null;

export function getLastDomeggookItemFields() {
  return lastItemFields;
}

export function clearDomeggookError() {
  lastApiError = null;
}

type DomeErrorBody = {
  errors?: { code?: string; message?: string; dcode?: string; dmessage?: string };
};

/** 응답에 오류가 실려 있으면 기록하고 true를 돌려준다 */
function captureApiError(data: unknown): boolean {
  const err = (data as DomeErrorBody | null)?.errors;
  if (!err) return false;
  lastApiError = {
    code: err.dcode || err.code || "UNKNOWN",
    // 상세 메시지가 원인을 말해준다 ("유효하지 않은 API Key 입니다" 등)
    message: err.dmessage || err.message || "도매꾹이 오류를 돌려줬습니다",
    at: new Date().toISOString(),
  };
  return true;
}

/**
 * 정렬 순서.
 *
 * ★ 공식 문서로 확인한 유효값 (상품리스트 API)
 *   se 정확도순 · rd 도매꾹랭킹순 · ha 인기상품순 · aa 낮은가격순
 *   ad 높은가격순 · sd 신규판매자순 · qa 적은판매단위순 · qd 많은판매단위순
 *   da 최근등록순
 *
 * ★ 왜 `qa`(적은판매단위순)를 먼저 쓰는가
 *
 * 위탁은 **1개씩 발주할 수 있는 상품**만 성립한다. `qa`는 판매단위가 작은
 * 순으로 주므로 MOQ 1 상품이 앞에 온다 — 우리가 필요한 것과 정확히 같다.
 *
 * 종전엔 `aa`(낮은가격순)를 쓰다가 "관측 공급가가 전부 35~1,290원"이라
 * `rd`(랭킹순)로 바꿨는데, 둘 다 MOQ를 보지 않는다. 그래서 랭킹 상위의
 * 묶음 상품(MOQ 10, 50…)이 계속 올라왔고, 그 묶음 단가가 낱개 원가로
 * 쓰이면서 마진 계산이 어긋났다. 정렬로 MOQ를 앞당기는 게 근본 처방이다.
 */
const SORT_PREFERRED = "qa";
const SORT_FALLBACK = "rd";

function buildSearchParams(
  aid: string,
  keyword: string,
  market: DomeMarket,
  limit: number,
  sort: string,
  opts?: { maxMoq?: number },
): URLSearchParams {
  const params = new URLSearchParams({
    ver: "4.1",
    mode: "getItemList",
    aid,
    market,
    om: "json",
    kw: keyword,
    // 넉넉히 받아서 팔 수 있는 가격대를 고른다. 적게 받으면 정렬이 밀어주는
    // 쪽(대개 최저가)만 보게 되고, 그게 바로 위에 적은 문제였다.
    sz: String(Math.min(Math.max(limit, 20), 20)),
    pg: "1",
    so: sort,
  });
  // mnq/mxq = 최소구매수량 검색 범위 (공식 문서 확인).
  // 위탁은 MOQ 1만 쓸 수 있으므로 서버 쪽에서 걸러 받는 게 가장 정확하다 —
  // 클라이언트에서 거르면 20개 받아 전부 버리고 후보가 0이 되는 일이 생긴다.
  if (opts?.maxMoq != null) {
    params.set("mnq", "1");
    params.set("mxq", String(opts.maxMoq));
  }
  return params;
}

async function fetchItems(url: string): Promise<DomeItem[] | null> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    lastApiError = {
      code: `HTTP_${res.status}`,
      message: `도매꾹 응답 실패 (HTTP ${res.status})`,
      at: new Date().toISOString(),
    };
    return null;
  }
  const data = (await res.json()) as unknown;
  // 도매꾹은 오류도 200으로 준다. 여기서 안 잡으면 원인이 통째로 사라진다.
  if (captureApiError(data)) return null;

  const items = normalizeItems(data);
  if (items.length > 0) {
    // 상품에 어떤 필드가 실려 오는지 남긴다. 문서를 못 보는 상황에서
    // 이걸 모르면 계속 추측으로 짜게 된다.
    lastItemFields = Object.keys(items[0] as object).sort();
  }
  return items;
}

export async function searchDomeggookMarket(
  keyword: string,
  market: DomeMarket,
  limit = 8,
  opts?: { maxMoq?: number; requireTopSupplier?: boolean },
): Promise<WholesaleListing[]> {
  const aid = getApiKey();
  if (!aid) return [];

  const platform: WholesalePlatform = market === "supply" ? "domeme" : "domeggook";

  try {
    let items = await fetchItems(
      `${API_BASE}?${buildSearchParams(aid, keyword, market, limit, SORT_PREFERRED, opts)}`,
    );
    if (items == null || items.length === 0) {
      // 추측한 정렬값이 안 먹혔을 수 있다 — 원래 값으로 한 번 더.
      const fallback = await fetchItems(
        `${API_BASE}?${buildSearchParams(aid, keyword, market, limit, SORT_FALLBACK, opts)}`,
      );
      if (fallback != null && fallback.length > 0) {
        clearDomeggookError();
        items = fallback;
      }
    }
    if (items == null) return [];

    if (items.length === 0) {
      lastApiError = {
        code: "EMPTY",
        message: "상품 목록이 비어 있음",
        at: new Date().toISOString(),
      };
      return [];
    }

    return items
      .map((item) => toListing(item, platform))
      .filter((x): x is WholesaleListing => x != null && (opts?.maxMoq == null || x.moq <= opts.maxMoq))
      // 사용자 정책: 1등급 + 당일발송 공급처만. 판독 불가(verified:false)도 탈락(fail-closed).
      .filter((x) => !opts?.requireTopSupplier || meetsSupplierPolicy(x.supplierQuality));
  } catch (e) {
    lastApiError = {
      code: "NETWORK",
      message: e instanceof Error ? e.message : "도매꾹에 연결하지 못했습니다",
      at: new Date().toISOString(),
    };
    return [];
  }
}

/** 도매매(supply) 단품 MOQ≤1 우선 — 위탁 1개 주문용 */
export async function searchDomemeUnitWholesale(keyword: string, limit = 10): Promise<WholesaleListing[]> {
  return searchDomeggookMarket(keyword, "supply", limit, { maxMoq: 1 });
}

export async function searchAllKoreanWholesale(keyword: string, limit = 6): Promise<WholesaleListing[]> {
  const domeme = await searchDomemeUnitWholesale(keyword, limit + 2);
  if (domeme.length >= limit) {
    return domeme.slice(0, limit * 2);
  }
  const dome = await searchDomeggookMarket(keyword, "dome", limit, { maxMoq: 1 });

  // ⚠️ 두 마켓의 단가를 한 배열에 놓고 정렬하지 않는다.
  //
  // 종전엔 `[...domeme, ...dome].sort((a,b) => a.unitPriceKrw - b.unitPriceKrw)`로
  // 합쳤다. 그런데 두 값은 같은 뜻이 아니다 — 도매매 단가는 낱개 기준이고,
  // 도매꾹 단가는 그 상품 MOQ 수량으로 살 때의 개당 가격이다. 섞어서 정렬하면
  // 묶음으로만 팔리는 상품이 "더 싸 보여서" 앞에 오고, 그 값이 낱개 원가로
  // 쓰인다. 그래서 **낱개 발주가 확인된 것(도매매)을 항상 앞에 둔다.**
  const seen = new Set<string>();
  const unique: WholesaleListing[] = [];
  for (const l of [
    ...domeme.sort((a, b) => a.unitPriceKrw - b.unitPriceKrw),
    ...dome.sort((a, b) => a.unitPriceKrw - b.unitPriceKrw),
  ]) {
    const key = `${l.platform}-${l.itemNo ?? l.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(l);
  }
  return unique.slice(0, limit * 2);
}

/**
 * 이 상품을 **1개씩 발주할 수 있는지** 상세 조회로 확정한다.
 *
 * ★ 왜 검색 결과만으로는 부족한가
 *
 * 검색 응답의 `price`는 그 상품 MOQ에 해당하는 개당 단가다. MOQ가 2면
 * "2개 이상 살 때의 개당 가격"이지 1개 값이 아니다. 그리고 `unitQty`가
 * 빠져 오는 응답도 있어 MOQ 자체를 모를 수 있다.
 *
 * 상세 조회(getItemView)에는 마켓별 가격·구매단위가 따로 들어 있다:
 *
 *     price.supply / qty.supplyUnit  — 도매매(낱개 배송대행)
 *     price.dome / qty.domeMoq       — 도매꾹(묶음 도매)
 *
 * 상품번호는 하나이므로, **도매꾹에서 찾은 상품이 도매매에서 낱개로 팔리는지**를
 * 같은 번호로 조회해 확인할 수 있다. 사용자가 지적한 "도매꾹에 있는 상품이
 * 도매매엔 없을 수도 있다"가 바로 이 판정이다 — `price.supply`가 없으면
 * 그 상품은 묶음 전용이므로 위탁 소싱에서 제외한다.
 *
 * 판독 실패는 실패로 답한다. 모르면 소싱하지 않는 쪽이 항상 싸다.
 */
export async function confirmSingleUnitSourcing(
  itemNo: string,
  opts?: {
    /**
     * 캐시를 건너뛰고 지금 값을 다시 읽는다.
     *
     * 캐시 수명이 6시간이라, 아침에 만든 초안을 저녁에 승인할 때 캐시를
     * 그대로 믿으면 **그 사이 오른 원가나 품절을 못 본다**. 승인처럼
     * 드물게 일어나는 확인 시점에만 켠다 (소싱 루프에서 켜면 레이트리밋에
     * 걸려 전부 미확인으로 떨어진다).
     */
    fresh?: boolean;
  },
): Promise<SingleUnitSourcing> {
  const aid = getApiKey();
  if (!aid) {
    return {
      available: false,
      unitPriceKrw: null,
      minOrderQty: null,
      market: null,
      verified: false,
      reason: "DOMEGGOOK_API_KEY 미설정 — 낱개 발주 가능 여부를 확인할 수 없다",
    };
  }
  // ★ 예전엔 `Number.isFinite(itemNo)`로 검사했다. 도매꾹이 상품번호를
  // `"9502515"`처럼 **문자열로** 주기 때문에 이 검사가 늘 false가 되어
  // 낱개 발주 확인이 통째로 거부됐다 — "검색어 24개에서 상품 0개"를 만든
  // 것과 같은 계열의 고장이다. 숫자로 바꿔서 재는 게 아니라, 번호 모양인지만 본다.
  if (!/^\d+$/.test(itemNo.trim())) {
    return {
      available: false,
      unitPriceKrw: null,
      minOrderQty: null,
      market: null,
      verified: false,
      reason: `유효하지 않은 상품번호(${itemNo})`,
    };
  }

  if (!opts?.fresh) {
    const cached = unitSourcingCache.get(itemNo);
    if (cached && Date.now() - cached.at < UNIT_SOURCING_TTL_MS) return cached.value;
  }

  const fetched = await fetchItemViewRaw(itemNo, aid, opts?.fresh);
  if (!fetched.ok) {
    return {
      available: false,
      unitPriceKrw: null,
      minOrderQty: null,
      market: null,
      verified: false,
      reason: fetched.reason,
    };
  }

  const value = resolveSingleUnitSourcing(readPriceFieldsFromItemView(fetched.data));
  // 성공한 판독만 캐시한다 — 일시적 장애를 오래 물고 있으면 안 된다
  if (value.verified) {
    if (unitSourcingCache.size >= UNIT_SOURCING_CACHE_MAX) {
      const oldest = unitSourcingCache.keys().next().value;
      if (oldest !== undefined) unitSourcingCache.delete(oldest);
    }
    unitSourcingCache.set(itemNo, { at: Date.now(), value });
  }
  return value;
}

/**
 * getItemView 원본을 가져온다 — 캐시를 confirmSingleUnitSourcing과
 * getItemDetail이 나눠 쓴다(같은 엔드포인트를 두 번 부르지 않는다).
 */
async function fetchItemViewRaw(
  itemNo: string,
  aid: string,
  fresh?: boolean,
): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> {
  if (!fresh) {
    const cached = itemViewCache.get(itemNo);
    if (cached && Date.now() - cached.at < ITEM_VIEW_TTL_MS) return { ok: true, data: cached.data };
  }

  const params = new URLSearchParams({
    ver: "4.6",
    mode: "getItemView",
    aid,
    no: String(itemNo),
    om: "json",
  });

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { ok: false, reason: `상세 조회 HTTP ${res.status} — 낱개 발주 여부 미확인` };
    }
    const data = (await res.json()) as unknown;
    if (captureApiError(data)) {
      return { ok: false, reason: `도매꾹 API 오류 — ${lastApiError?.message ?? "원인 불명"}` };
    }

    if (itemViewCache.size >= ITEM_VIEW_CACHE_MAX) {
      const oldest = itemViewCache.keys().next().value;
      if (oldest !== undefined) itemViewCache.delete(oldest);
    }
    itemViewCache.set(itemNo, { at: Date.now(), data });
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? `상세 조회 실패 — ${e.message}` : "상세 조회 네트워크 오류",
    };
  }
}

/**
 * 상세페이지에 쓸 것들 — 사진(대표 + 이미지 사용 허가된 경우 추가 사진),
 * 반품 주소, 원산지.
 *
 * confirmSingleUnitSourcing과 같은 캐시를 쓰므로, 같은 사이클에서 낱개
 * 발주를 이미 확인한 상품이면 API를 한 번 더 부르지 않는다.
 */
export async function getItemDetail(
  itemNo: string,
  opts?: { fresh?: boolean },
): Promise<ItemDetailExtras | null> {
  const aid = getApiKey();
  if (!aid || !/^\d+$/.test(itemNo.trim())) return null;

  const fetched = await fetchItemViewRaw(itemNo, aid, opts?.fresh);
  if (!fetched.ok) return null;
  return readItemDetailExtras(fetched.data);
}

/**
 * 낱개 발주 판정을 붙여 위탁 가능한 것만 남긴다.
 *
 * 검색으로 찾은 목록에는 묶음 전용 상품이 섞여 있다. 그대로 두면 그 묶음
 * 단가가 낱개 원가로 쓰여 마진이 통째로 어긋난다. 여기서 상세 조회로
 * 확정하고, **확인된 낱개 가격으로 단가를 교체**한다.
 *
 * 동시 호출 수를 제한한다 — 후보가 수십 개일 때 한 번에 던지면 레이트리밋에
 * 걸려 전부 실패하고, 그러면 하루치 소싱이 통째로 비어버린다.
 */
export async function withConfirmedUnitPricing(
  listings: WholesaleListing[],
  opts: { concurrency?: number; max?: number } = {},
): Promise<WholesaleListing[]> {
  const max = opts.max ?? 12;
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const target = listings.slice(0, max);
  const out: WholesaleListing[] = [];

  for (let i = 0; i < target.length; i += concurrency) {
    const batch = target.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map(async (l) => {
        if (l.source !== "live" || !l.itemNo) return null;
        const s = await confirmSingleUnitSourcing(l.itemNo);
        if (!s.available || s.unitPriceKrw == null) return null;
        return {
          ...l,
          // 확인된 낱개 단가로 교체한다 — 검색 응답의 값은 MOQ 기준이었다
          unitPriceKrw: s.unitPriceKrw,
          moq: 1,
          moqVerified: true,
          unitSourcing: s,
        } satisfies WholesaleListing;
      }),
    );
    for (const r of resolved) if (r) out.push(r);
  }

  return out;
}
