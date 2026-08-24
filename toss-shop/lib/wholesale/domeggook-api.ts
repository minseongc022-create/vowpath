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
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return normalizeItems(data)
      .map((item) => toListing(item, platform))
      .filter((x): x is WholesaleListing => x != null && (opts?.maxMoq == null || x.moq <= opts.maxMoq))
      // 사용자 정책: 1등급 + 당일발송 공급처만. 판독 불가(verified:false)도 탈락(fail-closed).
      .filter((x) => !opts?.requireTopSupplier || meetsSupplierPolicy(x.supplierQuality));
  } catch {
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
