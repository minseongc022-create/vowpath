import { randomBytes } from "node:crypto";
import { resolveApiConfig } from "./client";
import {
  enrichCatalogFromDetails,
  extractKeywordsFromProducts,
  mapApiProductsToCatalog,
  reconcileImportedSettlements,
  type DataSourceMode,
} from "./mappers";
import { getProductDetail, listAllProducts, type TossProductDetail } from "./products";
import { fetchSettlementRows, settlementDateRange } from "./settlements";
import type { CatalogProduct, MerchantData, TossShopMerchant } from "../types";

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export type ApiSyncResult = {
  mode: DataSourceMode;
  productsSynced: number;
  settlementsSynced: number;
  keywordsAdded: number;
  error?: string;
};

export async function syncMerchantFromTossApi(
  merchant: TossShopMerchant,
  data: MerchantData,
  /** merchant 소유 계정 이메일 — 오너일 때만 환경변수 키로 폴백한다 */
  accountEmail?: string,
): Promise<{
  catalog: CatalogProduct[];
  merchant: TossShopMerchant;
  data: MerchantData;
  result: ApiSyncResult;
}> {
  const config = await resolveApiConfig(
    merchant.id,
    {
      accessKey: merchant.apiAccessKey,
      secretKey: merchant.apiSecretKey,
      sandbox: merchant.apiSandbox,
    },
    accountEmail,
  );

  if (!config) {
    return {
      catalog: [],
      merchant: { ...merchant, dataSource: "demo" },
      data,
      result: { mode: "demo", productsSynced: 0, settlementsSynced: 0, keywordsAdded: 0 },
    };
  }

  try {
    const apiProducts = await listAllProducts(merchant.id, config);
    let catalog = mapApiProductsToCatalog(apiProducts, merchant.shopName);

    const details = new Map<string, TossProductDetail>();
    for (const p of apiProducts.slice(0, 30)) {
      const d = await getProductDetail(merchant.id, config, p.id);
      if (d) details.set(String(p.id), d);
    }
    catalog = enrichCatalogFromDetails(catalog, details);

    const { fromDate, toDate } = settlementDateRange();
    const settlementRows = await fetchSettlementRows(merchant.id, config, fromDate, toDate);
    const settlements = reconcileImportedSettlements(data.settlements, settlementRows, newId);

    const autoKeywords = extractKeywordsFromProducts(details);
    const keywords = [...data.keywords];
    let keywordsAdded = 0;
    for (const kw of autoKeywords.slice(0, 20)) {
      if (keywords.some((k) => k.keyword === kw)) continue;
      keywords.unshift({ id: newId("kw"), keyword: kw, addedAt: new Date().toISOString() });
      keywordsAdded++;
    }

    const now = new Date().toISOString();
    return {
      catalog,
      merchant: {
        ...merchant,
        dataSource: apiProducts.length > 0 ? "live" : "live_partial",
        apiConnectedAt: merchant.apiConnectedAt ?? now,
        lastSyncAt: now,
        lastSyncError: undefined,
      },
      data: { ...data, settlements, keywords },
      result: {
        mode: apiProducts.length > 0 ? "live" : "live_partial",
        productsSynced: catalog.length,
        settlementsSynced: settlementRows.length,
        keywordsAdded,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SYNC_FAILED";
    return {
      catalog: [],
      merchant: {
        ...merchant,
        dataSource: "demo",
        lastSyncAt: new Date().toISOString(),
        lastSyncError: msg,
      },
      data,
      result: {
        mode: "demo",
        productsSynced: 0,
        settlementsSynced: 0,
        keywordsAdded: 0,
        error: msg,
      },
    };
  }
}

export function isApiConfigured(merchant: TossShopMerchant): boolean {
  return Boolean(
    (merchant.apiAccessKey && merchant.apiSecretKey) ||
      (process.env.TOSS_SHOPPING_ACCESS_KEY && process.env.TOSS_SHOPPING_SECRET_KEY),
  );
}
