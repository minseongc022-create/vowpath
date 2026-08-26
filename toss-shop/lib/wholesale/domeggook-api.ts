import type { WholesaleListing, WholesalePlatform } from "./types";
import { readSupplierQuality, meetsSupplierPolicy } from "./supplier-quality";

const API_BASE = "https://www.domeggook.com/ssl/api/";

type DomeMarket = "dome" | "supply";

type DomeItem = {
  no?: number;
  title?: string;
  price?: number;
  thumb?: string;
  id?: string;
  nick?: string;
  unitQty?: number;
  url?: string;
  deli?: { who?: string; fee?: string | number; fromOversea?: boolean };
  /** 응답에 설명·안내 텍스트가 실려 오는 경우 (검색 API는 보통 주지 않음) */
  desc?: string;
  content?: string;
  info?: string;
};

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
  if (!item.title || item.price == null || item.price <= 0) return null;
  const shippingFeeKrw = parseDeliFee(item.deli?.fee);
  const freeShipping = item.deli?.who === "S";
  const url =
    item.url?.trim() ||
    (item.no ? `https://domeme.com/s/${item.no}` : `https://www.domeggook.com/main/item/itemView.php?itemNo=${item.no ?? ""}`);

  return {
    platform,
    itemNo: item.no,
    title: item.title.replace(/\s+/g, " ").trim(),
    unitPriceKrw: item.price,
    shippingFeeKrw: freeShipping ? 0 : shippingFeeKrw,
    moq: item.unitQty ?? 1,
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

export async function searchDomeggookMarket(
  keyword: string,
  market: DomeMarket,
  limit = 8,
  opts?: { maxMoq?: number; requireTopSupplier?: boolean },
): Promise<WholesaleListing[]> {
  const aid = getApiKey();
  if (!aid) return [];

  const platform: WholesalePlatform = market === "supply" ? "domeme" : "domeggook";
  const params = new URLSearchParams({
    ver: "4.1",
    mode: "getItemList",
    aid,
    market,
    om: "json",
    kw: keyword,
    sz: String(Math.min(limit, 20)),
    pg: "1",
    so: "aa",
  });
  if (opts?.maxMoq != null) {
    params.set("mxq", String(opts.maxMoq));
  }

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      lastApiError = {
        code: `HTTP_${res.status}`,
        message: `도매꾹 응답 실패 (HTTP ${res.status})`,
        at: new Date().toISOString(),
      };
      return [];
    }
    const data = (await res.json()) as unknown;
    // 도매꾹은 오류도 200으로 준다. 여기서 안 잡으면 원인이 통째로 사라진다.
    if (captureApiError(data)) return [];

    const items = normalizeItems(data);
    if (items.length === 0) {
      // 오류도 없고 상품도 없다 — 응답 구조가 우리가 아는 것과 다를 수 있다.
      // 최상위 키만 남긴다: 원인을 좁히는 데 이게 결정적인데, 본문 전체를
      // 남기면 로그가 터지고 공급처 정보까지 흘러 들어간다.
      lastApiError = {
        code: "EMPTY",
        message: `상품 목록이 비어 있음 (응답 키: ${describeShape(data)})`,
        at: new Date().toISOString(),
      };
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
  const merged = [...domeme, ...dome].sort((a, b) => a.unitPriceKrw - b.unitPriceKrw);
  const seen = new Set<string>();
  const unique: WholesaleListing[] = [];
  for (const l of merged) {
    const key = `${l.platform}-${l.itemNo ?? l.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(l);
  }
  return unique.slice(0, limit * 2);
}
