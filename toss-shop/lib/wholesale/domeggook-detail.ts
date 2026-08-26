/**
 * 도매꾹·도매매 상품 상세 조회 — 공급처의 실제 반품 주소를 가져온다
 *
 * ★ 왜 이 파일이 자동화의 관문인가
 *
 * 검색 API(getItemList)는 반품 안내를 거의 실어주지 않는다. 그래서 지금까지
 * supplier-return-policy 판독이 전부 `unknown`으로 떨어졌고, 반품지 결정이
 * fail-closed로 막혔다. 공급처가 상품마다 다른 도매꾹/도매매에서 이건
 * "상품마다 사람이 주소를 찾아 넣어야 한다"와 같은 말이다.
 * 상세 조회를 붙여야 무인 운영이 성립한다.
 *
 * ⚠️ 응답 스키마를 문서로 확정하지 못했다 — 도매꾹 API 레퍼런스 페이지가
 * 폐쇄됐고(404/403), 검색으로도 필드 목록이 확인되지 않았다. 그래서 필드명을
 * 하나로 찍지 않는다. 대신 응답 전체를 훑어 **한국 주소 형태인 값**만 골라내고,
 * 키 이름이 반품·주소에 얼마나 가까운지로 순위를 매긴다. 어느 경로에서 나왔는지
 * (`resolvedFrom`)를 함께 남겨 실제 응답으로 사후 검증할 수 있게 한다.
 *
 * 추측한 필드명 하나에 걸었다가 스키마가 조금만 달라지면 조용히 빈 값이 되고,
 * 그 순간 전 상품이 셀러 주소로 등록된다. 이게 가장 피해야 할 실패 모드다.
 * 못 읽으면 못 읽었다고 말하는 쪽이 항상 낫다.
 */

import type { WholesalePlatform } from "./types";

const API_BASE = "https://www.domeggook.com/ssl/api/";

/** 응답을 훑을 최대 깊이 — 순환/거대 응답 방어 */
const MAX_DEPTH = 6;
/** 후보 수집 상한 — 비정상 응답에서 무한정 모으지 않는다 */
const MAX_CANDIDATES = 40;

export type SupplierAddressCandidate = {
  /** 주소 원문 */
  address: string;
  /** 응답 내 경로 (예: domeggook.seller.returnAddr) — 사후 검증용 */
  path: string;
  /**
   * 이 값이 "반품 주소"일 확신도.
   *  · `return_labeled` — 키 이름에 반품/교환 + 주소가 모두 들어있다. 가장 확실.
   *  · `address_labeled` — 키가 주소 계열이지만 반품 전용인지는 불명.
   *  · `shape_only` — 키는 단서가 없고 값만 주소 형태다. 근거로 쓰기엔 약하다.
   */
  confidence: "return_labeled" | "address_labeled" | "shape_only";
};

export type SupplierDetail = {
  itemNo: number;
  platform: WholesalePlatform;
  /** 반품 주소로 채택된 값 — 확신도가 shape_only면 채택하지 않는다 */
  returnAddress?: string;
  /** 채택된 주소의 응답 내 경로 */
  returnAddressPath?: string;
  returnAddressConfidence?: SupplierAddressCandidate["confidence"];
  /** 판독된 주소 후보 전체 — 진단·검증용 */
  addressCandidates: SupplierAddressCandidate[];
  /** 반품 정책 판독에 넣을 원문 (설명·안내·공지를 합친 것) */
  policyText?: string;
  /** 공급사 식별자 — 반품지 매칭 키 */
  sellerId?: string;
  sellerNick?: string;
  /** 응답 최상위 키들 — 스키마 확인용 진단 정보 */
  responseKeys: string[];
};

export type SupplierDetailFailure = {
  ok: false;
  /** 사람이 읽는 실패 사유 — 자동화가 왜 이 상품을 못 넘겼는지 남긴다 */
  reason: string;
  code: "NO_API_KEY" | "HTTP_ERROR" | "API_ERROR" | "EMPTY" | "NETWORK";
};

export type SupplierDetailResult = ({ ok: true } & SupplierDetail) | SupplierDetailFailure;

// ─────────────────────────────────────────────────────────────
// 주소 판독
// ─────────────────────────────────────────────────────────────

/**
 * 한국 주소 형태인가.
 *
 * 시/도로 시작해서 도로명·지번 접미사(로/길/동/가/읍/면/리)가 나오는 형태만
 * 받는다. "서울 강남" 같은 지역 언급만으로는 통과하지 않게 최소 길이를 둔다 —
 * 상품 설명의 "서울 당일배송" 같은 문구를 주소로 오인하면 반품이 엉뚱한 데로 간다.
 */
const KOREAN_ADDRESS = new RegExp(
  // 우편번호가 앞에 붙어 있으면 **같이 잡는다**.
  //
  // ★ 왜 이게 중요한가
  // 토스 반품지 등록은 우편번호를 필수로 받는다. 여기서 안 잡으면 주소는
  // 있는데 우편번호가 없어 등록이 전부 거절되고, 결국 사장님이 손으로
  // 넣어야 한다 — 자동화가 마지막 한 칸에서 무너진다.
  // 우편번호는 절대 지어낼 수 없는 값이라(틀리면 반품이 다른 동네로 간다)
  // 원문에 있을 때 반드시 챙겨야 한다.
  "((?:\\(?\\s*\\d{5}\\s*\\)?\\s*)?" +
    "(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)" +
    "(?:특별시|광역시|특별자치시|특별자치도|도)?" +
    "\\s*[^\\n,;|]{2,40}?(?:로|길|동|가|읍|면|리)\\s*[0-9][^\\n;|]{0,60})",
);

/**
 * 테스트 전용 — 주소 판독만 따로 검증한다.
 *
 * 이 정규식이 우편번호를 놓치면 반품지 자동 등록이 전부 거절되는데, 그때
 * 나는 오류는 "우편번호 없음"이라 원인이 주소 판독에 있다는 게 안 보인다.
 */
export function __readAddressForTest(text: string): string | null {
  const m = text.match(KOREAN_ADDRESS);
  return m?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

/** 키 이름이 반품·교환을 가리키는가 */
const RETURN_KEY = /(return|refund|exchange|반품|교환|회수|수거)/i;
/** 키 이름이 주소를 가리키는가 */
const ADDRESS_KEY = /(addr|address|주소|소재지|location|장소)/i;
/** 발송지(출고지)는 반품지가 아니다 — 잘못 쓰면 반품이 창고로 안 간다 */
const SHIPPING_ORIGIN_KEY = /(send|ship|deliver|출고|발송|배송지|출하)/i;

/** 반품 안내로 볼 만한 긴 텍스트가 실린 키 */
const POLICY_KEY = /(return|refund|exchange|policy|notice|guide|desc|content|info|detail|반품|교환|안내|공지|설명|정책)/i;

/** 공급사 식별자가 실린 키 */
const SELLER_ID_KEY = /^(id|sellerid|seller_id|memberid|member_id|uid)$/i;
const SELLER_NICK_KEY = /^(nick|nickname|sellernick|seller_nick|companyname|company|shopname)$/i;

function normalizeWhitespace(s: string): string {
  return s.replace(/[ 　]+/g, " ").replace(/\s+/g, " ").trim();
}

/** HTML이 섞여 오는 필드가 많다 — 태그를 걷어내야 주소·문구가 잡힌다 */
function stripHtml(s: string): string {
  return normalizeWhitespace(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">"),
  );
}

function classify(keyPath: string): SupplierAddressCandidate["confidence"] | null {
  // 마지막 두 단계 키만 본다 — 상위 컨테이너 이름(item, domeggook)은 단서가 아니다
  const tail = keyPath.split(".").slice(-2).join(".");

  // 출고지는 반품지가 아니다. 반품 키워드가 함께 있지 않으면 후보에서 제외한다.
  if (SHIPPING_ORIGIN_KEY.test(tail) && !RETURN_KEY.test(tail)) return null;

  if (RETURN_KEY.test(tail) && ADDRESS_KEY.test(tail)) return "return_labeled";
  if (ADDRESS_KEY.test(tail)) return "address_labeled";
  return "shape_only";
}

type Walked = {
  candidates: SupplierAddressCandidate[];
  policyChunks: string[];
  sellerId?: string;
  sellerNick?: string;
};

/**
 * 응답 전체를 훑어 주소 후보와 정책 텍스트를 모은다.
 *
 * 스키마를 모르는 상태에서 확실하게 가져오는 유일한 방법이다. 대신 값의
 * 형태(한국 주소 패턴)로 1차 거르고, 키 이름으로 확신도를 매겨 근거의 강약을
 * 남긴다 — "찾았다"와 "이게 맞다"를 구분하기 위해서다.
 */
function walk(node: unknown, path: string, depth: number, out: Walked): void {
  if (depth > MAX_DEPTH || out.candidates.length >= MAX_CANDIDATES) return;

  if (typeof node === "string") {
    const text = stripHtml(node);
    if (!text) return;

    const m = text.match(KOREAN_ADDRESS);
    if (m?.[1]) {
      const confidence = classify(path);
      if (confidence) {
        out.candidates.push({ address: normalizeWhitespace(m[1]), path, confidence });
      }
    }

    // 반품 판독에 쓸 원문 — 짧은 값(코드·ID)은 의미가 없으니 거른다
    const tail = path.split(".").slice(-2).join(".");
    if (text.length >= 20 && POLICY_KEY.test(tail)) {
      out.policyChunks.push(text);
    }
    return;
  }

  if (typeof node === "number") return;

  if (Array.isArray(node)) {
    for (const [i, v] of node.entries()) walk(v, `${path}[${i}]`, depth + 1, out);
    return;
  }

  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const child = path ? `${path}.${k}` : k;
      if (typeof v === "string" || typeof v === "number") {
        const s = String(v).trim();
        if (s && !out.sellerId && SELLER_ID_KEY.test(k)) out.sellerId = s;
        if (s && !out.sellerNick && SELLER_NICK_KEY.test(k)) out.sellerNick = s;
      }
      walk(v, child, depth + 1, out);
    }
  }
}

/**
 * 후보 중 반품 주소로 **채택할 만한 것**을 고른다.
 *
 * `shape_only`(키에 아무 단서 없이 값만 주소 형태)는 채택하지 않는다.
 * 상품 설명 어딘가에 적힌 제조사 주소·매장 주소일 수 있고, 그걸 반품지로 걸면
 * 남의 주소로 반품이 간다. 확신이 없으면 비워두고 상위에서 판단하게 둔다.
 */
function pickReturnAddress(
  candidates: SupplierAddressCandidate[],
): SupplierAddressCandidate | undefined {
  return (
    candidates.find((c) => c.confidence === "return_labeled") ??
    candidates.find((c) => c.confidence === "address_labeled")
  );
}

// ─────────────────────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.DOMEGGOOK_API_KEY?.trim() || null;
}

/**
 * 상세 응답 캐시.
 *
 * 자동 등록 사이클은 60초마다 돈다. 캐시가 없으면 같은 상품의 상세를 1분마다
 * 다시 조회하게 되고, 후보가 수십 개면 도매꾹 API 호출이 분당 수십 건이 되어
 * 레이트리밋에 걸린다. 그러면 상세를 못 읽어 전 상품이 `unknown`으로 떨어지고,
 * 자동화가 조용히 멈춘다 — 캐시가 성능이 아니라 **동작 조건**인 이유다.
 *
 * 공급처 반품 주소는 거의 바뀌지 않으므로 TTL을 넉넉히 잡는다.
 */
const DETAIL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** 프로세스 메모리 상한 — 서버리스 인스턴스가 오래 살아도 무한정 늘지 않게 */
const DETAIL_CACHE_MAX = 500;

const detailCache = new Map<number, { at: number; result: SupplierDetailResult }>();

function readCache(itemNo: number): SupplierDetailResult | null {
  const hit = detailCache.get(itemNo);
  if (!hit) return null;
  if (Date.now() - hit.at > DETAIL_CACHE_TTL_MS) {
    detailCache.delete(itemNo);
    return null;
  }
  return hit.result;
}

function writeCache(itemNo: number, result: SupplierDetailResult): void {
  // 실패는 캐시하지 않는다 — 일시적 장애를 6시간 동안 물고 있으면 안 된다
  if (!result.ok) return;
  if (detailCache.size >= DETAIL_CACHE_MAX) {
    const oldest = detailCache.keys().next().value;
    if (oldest !== undefined) detailCache.delete(oldest);
  }
  detailCache.set(itemNo, { at: Date.now(), result });
}

/** 테스트·핫리로드용 */
export function clearSupplierDetailCache(): void {
  detailCache.clear();
}

/** 도매꾹 오류 응답: { errors: { code, message, dcode, dmessage } } */
function readApiError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const errors = (data as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object") return null;
  const e = errors as Record<string, unknown>;
  const parts = [e.dmessage, e.message, e.dcode, e.code].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  return parts.length ? parts.join(" / ") : "알 수 없는 API 오류";
}

/**
 * 상품 하나의 상세를 조회해 공급처 반품 주소·반품 안내를 판독한다.
 *
 * @param itemNo 도매꾹/도매매 상품번호
 * @param platform 어느 마켓의 상품인가 (도매매=supply, 도매꾹=dome)
 */
export async function fetchSupplierDetail(
  itemNo: number,
  platform: WholesalePlatform = "domeme",
): Promise<SupplierDetailResult> {
  const aid = getApiKey();
  if (!aid) {
    return { ok: false, code: "NO_API_KEY", reason: "DOMEGGOOK_API_KEY 미설정 — 상세 조회 불가" };
  }
  if (!Number.isFinite(itemNo) || itemNo <= 0) {
    return { ok: false, code: "EMPTY", reason: `유효하지 않은 상품번호(${itemNo})` };
  }

  const cached = readCache(itemNo);
  if (cached) return cached;

  const params = new URLSearchParams({
    ver: "4.1",
    mode: "getItemView",
    aid,
    no: String(itemNo),
    om: "json",
  });

  let data: unknown;
  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { ok: false, code: "HTTP_ERROR", reason: `상세 조회 HTTP ${res.status}` };
    }
    data = (await res.json()) as unknown;
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      reason: e instanceof Error ? `상세 조회 실패 — ${e.message}` : "상세 조회 네트워크 오류",
    };
  }

  const apiError = readApiError(data);
  if (apiError) return { ok: false, code: "API_ERROR", reason: `도매꾹 API 오류 — ${apiError}` };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "EMPTY", reason: "상세 응답이 비어 있음" };
  }

  const out: Walked = { candidates: [], policyChunks: [] };
  walk(data, "", 0, out);

  const picked = pickReturnAddress(out.candidates);
  const policyText = out.policyChunks.length
    ? Array.from(new Set(out.policyChunks)).join("\n").slice(0, 20_000)
    : undefined;

  const result: SupplierDetailResult = {
    ok: true,
    itemNo,
    platform,
    returnAddress: picked?.address,
    returnAddressPath: picked?.path,
    returnAddressConfidence: picked?.confidence,
    addressCandidates: out.candidates,
    policyText,
    sellerId: out.sellerId,
    sellerNick: out.sellerNick,
    responseKeys: Object.keys(data as Record<string, unknown>),
  };
  writeCache(itemNo, result);
  return result;
}

/**
 * 검색으로 찾은 상품에 상세 정보를 채워 넣는다.
 *
 * 검색 API는 반품 안내를 안 준다. 그래서 이 보강 없이는 모든 상품이
 * `unknown` 판정을 받고 반품지 결정이 막힌다 — 무인 등록이 불가능해진다.
 *
 * 조회에 실패해도 원본을 그대로 돌려준다. 상세를 못 읽었다고 상품을 버리면
 * 도매꾹 API가 잠깐 흔들릴 때 하루치 등록이 통째로 날아간다. 대신
 * `detailFetched`로 "시도했으나 못 읽음"을 남겨, 상위에서 보수적으로 판단하게 한다.
 */
export async function enrichWithSupplierDetail<
  T extends {
    itemNo?: number;
    platform: WholesalePlatform;
    policyText?: string;
    supplierReturnAddress?: string;
    detailFetched?: boolean;
    sellerId?: string;
  },
>(listing: T): Promise<T> {
  if (!listing.itemNo) return { ...listing, detailFetched: false };

  const detail = await fetchSupplierDetail(listing.itemNo, listing.platform);
  if (!detail.ok) return { ...listing, detailFetched: false };

  return {
    ...listing,
    detailFetched: true,
    // 검색 응답에 안내문이 있었으면 둘을 합친다 — 어느 쪽에 신호가 있을지 모른다
    policyText: [listing.policyText, detail.policyText].filter(Boolean).join("\n") || undefined,
    supplierReturnAddress: detail.returnAddress ?? listing.supplierReturnAddress,
    sellerId: listing.sellerId ?? detail.sellerId,
  };
}

/** 테스트·진단용 — 조회 없이 판독 로직만 돌린다 */
export function readSupplierDetailFromResponse(
  data: unknown,
  itemNo: number,
  platform: WholesalePlatform = "domeme",
): SupplierDetail {
  const out: Walked = { candidates: [], policyChunks: [] };
  walk(data, "", 0, out);
  const picked = pickReturnAddress(out.candidates);
  return {
    itemNo,
    platform,
    returnAddress: picked?.address,
    returnAddressPath: picked?.path,
    returnAddressConfidence: picked?.confidence,
    addressCandidates: out.candidates,
    policyText: out.policyChunks.length
      ? Array.from(new Set(out.policyChunks)).join("\n").slice(0, 20_000)
      : undefined,
    sellerId: out.sellerId,
    sellerNick: out.sellerNick,
    responseKeys:
      data && typeof data === "object" ? Object.keys(data as Record<string, unknown>) : [],
  };
}
