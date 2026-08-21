import type { CatalogProduct, SettlementRow, TossShopCategory } from "../types";
import type { TossProductDetail, TossProductListItem } from "./products";

export type DataSourceMode = "demo" | "live" | "live_partial";

export function mapCategoryName(name?: string): TossShopCategory {
  const n = (name ?? "").toLowerCase();
  if (n.includes("뷰티") || n.includes("beauty")) return "beauty";
  if (n.includes("패션") || n.includes("의류")) return "fashion";
  if (n.includes("디지털") || n.includes("가전")) return "digital";
  if (n.includes("건강")) return "health";
  if (n.includes("생활") || n.includes("주방")) return "home";
  return "food";
}

export function mapApiProductsToCatalog(
  products: TossProductListItem[],
  shopName: string,
): CatalogProduct[] {
  const sorted = [...products].sort((a, b) => b.salePrice - a.salePrice);
  return sorted.map((p, i) => ({
    id: String(p.id),
    name: p.name,
    category: "food" as TossShopCategory,
    priceKrw: p.salePrice,
    reviewCount: 0,
    rating: 4.5,
    sellerName: shopName,
    imageUrl: p.images?.[0]?.url,
    rank: i + 1,
    rankPrev: i + 1,
    updatedAt: new Date().toISOString(),
  }));
}

export function enrichCatalogFromDetails(
  catalog: CatalogProduct[],
  details: Map<string, TossProductDetail>,
): CatalogProduct[] {
  return catalog.map((p) => {
    const d = details.get(p.id);
    if (!d) return p;
    const price = d.stocks?.[0]?.salePrice ?? p.priceKrw;
    return {
      ...p,
      priceKrw: price,
      category: mapCategoryName(d.categoryName),
      updatedAt: new Date().toISOString(),
    };
  });
}

export function extractKeywordsFromProducts(
  details: Map<string, TossProductDetail>,
): string[] {
  const set = new Set<string>();
  for (const d of details.values()) {
    for (const kw of d.exposure?.searchKeywords ?? []) {
      if (kw.trim()) set.add(kw.trim());
    }
  }
  return [...set];
}

export function reconcileImportedSettlements(
  existing: SettlementRow[],
  imported: Omit<SettlementRow, "id" | "status">[],
  newId: (prefix: string) => string,
): SettlementRow[] {
  const byOrder = new Map(existing.map((r) => [r.orderId, r]));
  for (const row of imported) {
    const prev = byOrder.get(row.orderId);
    if (prev) {
      Object.assign(prev, row);
      if (row.payoutDate && prev.actualPayoutKrw == null) {
        prev.actualPayoutKrw = row.expectedPayoutKrw;
        prev.status = "matched";
      }
      continue;
    }
    byOrder.set(row.orderId, {
      ...row,
      id: newId("stl"),
      status: row.payoutDate ? "matched" : "pending",
      actualPayoutKrw: row.payoutDate ? row.expectedPayoutKrw : undefined,
    });
  }
  return [...byOrder.values()];
}
