import type { WholesaleListing, WholesalePlatform } from "./types";

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

function toListing(item: DomeItem, platform: WholesalePlatform): WholesaleListing | null {
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
  };
}

export function isDomeggookApiConfigured(): boolean {
  return Boolean(getApiKey());
}

export async function searchDomeggookMarket(
  keyword: string,
  market: DomeMarket,
  limit = 8,
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

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return normalizeItems(data)
      .map((item) => toListing(item, platform))
      .filter((x): x is WholesaleListing => x != null);
  } catch {
    return [];
  }
}

export async function searchAllKoreanWholesale(keyword: string, limit = 6): Promise<WholesaleListing[]> {
  const [dome, supply] = await Promise.all([
    searchDomeggookMarket(keyword, "dome", limit),
    searchDomeggookMarket(keyword, "supply", limit),
  ]);
  const merged = [...dome, ...supply].sort((a, b) => a.unitPriceKrw - b.unitPriceKrw);
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
