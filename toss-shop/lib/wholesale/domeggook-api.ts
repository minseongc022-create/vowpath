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

function normalizeItems(raw: unknown): DomeItem[] {
  if (!raw || typeof raw !== "object") return [];
  const list = raw as { list?: { item?: DomeItem | DomeItem[] } };
  const item = list.list?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
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
