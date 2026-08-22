import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { kv } from "@vercel/kv";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import {
  analyzeKeyword,
  buildKeywordSnapshot,
  getCatalogProducts,
  getProductById,
  simulatePriceUpdate,
} from "./catalog";
import {
  defaultMerchantData,
  SEED_ACCOUNT,
  SEED_CATALOG,
  SEED_MERCHANT,
} from "./seed";
import { todayDateKey, minuteKey, appendCapped } from "./format";
import { parseSettlementCsv } from "./settlement-csv";
import { resolvePlanForEmail, proExpiresAtFromNow, isOwnerEmail } from "./billing";
import { generateConsignmentPicks } from "./seller-engine/consignment";
import { generateImportPicks } from "./seller-engine/import-sales";
import { buildListingDraftFromPick } from "./seller-engine/listing-automation";
import { publishListingToToss } from "./api/create-product";
import { resolveApiConfig } from "./api/client";
import { executeConsignmentOrder } from "./seller-engine/consignment-order";
import { runJarvisAutopilotCycle, enrichDraftWithAutopilot } from "./seller-engine/jarvis-autopilot-engine";
import { runJarvisHealthCheck } from "./seller-engine/jarvis-health-check";
import { syncMerchantFromTossApi, isApiConfigured } from "./api/sync-merchant";
import { configFromEnv, maskSecret } from "./api/config";
import { collectMarketIntelligence } from "./market-collector";
import { getDiscoveryKeywords } from "./discovery";
import type {
  CatalogProduct,
  Competitor,
  CompetitorAlert,
  CompetitorAlertRule,
  KeywordSnapshot,
  MerchantData,
  PriceSnapshot,
  SettlementRow,
  ConsignmentPick,
  ImportPick,
  JarvisListingDraft,
  TossShopAccount,
  TossShopMerchant,
  TossShopStore,
  TrackedKeyword,
  WatchlistItem,
  TossShopSubscriptionStatus,
} from "./types";

const DATA_DIR = join(process.cwd(), ".data", "toss-shop");
const STORE_FILE = join(DATA_DIR, "store.json");
const KV_STORE_KEY = "toss-shop:store:v1";

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function defaultStore(): TossShopStore {
  return {
    accounts: [{ ...SEED_ACCOUNT, passwordHash: "" }],
    merchants: [SEED_MERCHANT],
    merchantData: { [SEED_MERCHANT.id]: defaultMerchantData() },
    catalog: [...SEED_CATALOG],
    priceHistory: {},
    keywordHistory: {},
  };
}

function normalizeStore(raw: Partial<TossShopStore>): TossShopStore {
  const base = defaultStore();
  return {
    accounts: raw.accounts?.length ? raw.accounts : base.accounts,
    merchants: raw.merchants?.length ? raw.merchants : base.merchants,
    merchantData: raw.merchantData ?? base.merchantData,
    catalog: raw.catalog?.length ? raw.catalog : base.catalog,
    priceHistory: raw.priceHistory ?? {},
    keywordHistory: raw.keywordHistory ?? {},
  };
}

async function loadStore(): Promise<TossShopStore> {
  if (useKvStore()) {
    const raw = await kvGetSafe<TossShopStore>(KV_STORE_KEY);
    if (raw) return normalizeStore(raw);
    const store = defaultStore();
    store.accounts[0].passwordHash = await hashPassword("demo1234");
    await saveStore(store);
    return store;
  }
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(STORE_FILE, "utf8");
    const store = normalizeStore(JSON.parse(raw) as Partial<TossShopStore>);
    if (!store.accounts[0]?.passwordHash) {
      store.accounts[0].passwordHash = await hashPassword("demo1234");
      await saveStore(store);
    }
    return store;
  } catch {
    const store = defaultStore();
    store.accounts[0].passwordHash = await hashPassword("demo1234");
    await saveStore(store);
    return store;
  }
}

async function saveStore(store: TossShopStore): Promise<void> {
  if (useKvStore()) {
    await kv.set(KV_STORE_KEY, store);
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED: toss-shop store needs Vercel KV in production");
  }
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STORE_FILE, JSON.stringify(store, null, 2));
  } catch {
    // read-only FS
  }
}

function merchantData(store: TossShopStore, merchantId: string): MerchantData {
  if (!store.merchantData[merchantId]) {
    store.merchantData[merchantId] = defaultMerchantData();
  }
  return store.merchantData[merchantId];
}

// ── Auth ──

export async function authenticateAccount(
  email: string,
  password: string,
): Promise<TossShopAccount | null> {
  const store = await loadStore();
  const account = store.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!account || !account.passwordHash) return null;
  const ok = await verifyPassword(password, account.passwordHash);
  return ok ? account : null;
}

export async function createAccount(input: {
  email: string;
  password: string;
  name: string;
  shopName: string;
}): Promise<TossShopAccount> {
  const store = await loadStore();
  if (store.accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("EMAIL_TAKEN");
  }
  const merchantId = newId("merch");
  const merchant: TossShopMerchant = {
    id: merchantId,
    shopName: input.shopName,
    category: "food",
    createdAt: new Date().toISOString(),
  };
  const plan = resolvePlanForEmail(input.email.toLowerCase());
  const account: TossShopAccount = {
    id: newId("acc"),
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    name: input.name,
    merchantId,
    createdAt: new Date().toISOString(),
    plan,
    usage: { date: todayDateKey(), keywordAnalyses: 0 },
  };
  const envConfig = configFromEnv();
  if (envConfig) {
    merchant.apiAccessKey = envConfig.accessKey;
    merchant.apiSecretKey = envConfig.secretKey;
    merchant.apiSandbox = envConfig.sandbox;
    merchant.dataSource = "live";
  } else {
    merchant.dataSource = "demo";
  }
  store.merchants.push(merchant);
  store.accounts.push(account);
  store.merchantData[merchantId] = defaultMerchantData();
  await saveStore(store);
  return account;
}

/** Login or sign up using Toss Shopping API keys (Client Credentials — no OAuth redirect). */
export async function connectTossSeller(input: {
  accessKey: string;
  secretKey: string;
  sandbox?: boolean;
  shopName?: string;
  name?: string;
}): Promise<TossShopAccount> {
  const accessKey = input.accessKey.trim();
  const secretKey = input.secretKey.trim();
  if (!accessKey || !secretKey) throw new Error("KEYS_REQUIRED");

  const store = await loadStore();
  let merchant = store.merchants.find((m) => m.apiAccessKey === accessKey);
  let account = merchant
    ? store.accounts.find((a) => a.merchantId === merchant!.id) ?? null
    : null;

  if (merchant && account) {
    merchant.apiSecretKey = secretKey;
    merchant.apiSandbox = input.sandbox ?? false;
    merchant.dataSource = "live";
    await saveStore(store);
    return account;
  }

  const shopName = input.shopName?.trim() || "내 토스쇼핑 상점";
  const name = input.name?.trim() || "셀러";
  const email = `seller_${accessKey.slice(-8).toLowerCase()}@connect.effiroad.local`;
  const password = randomBytes(12).toString("base64url");

  if (store.accounts.some((a) => a.email === email)) {
    throw new Error("EMAIL_TAKEN");
  }

  const merchantId = newId("merch");
  merchant = {
    id: merchantId,
    shopName,
    category: "food",
    createdAt: new Date().toISOString(),
    apiAccessKey: accessKey,
    apiSecretKey: secretKey,
    apiSandbox: input.sandbox ?? false,
    dataSource: "live",
  };
  const plan = isOwnerEmail(email) ? "owner" : "free";
  account = {
    id: newId("acc"),
    email,
    passwordHash: await hashPassword(password),
    name,
    merchantId,
    createdAt: new Date().toISOString(),
    plan,
    usage: { date: todayDateKey(), keywordAnalyses: 0 },
  };
  store.merchants.push(merchant);
  store.accounts.push(account);
  store.merchantData[merchantId] = defaultMerchantData();
  await saveStore(store);
  return account;
}

export async function getMerchant(merchantId: string): Promise<TossShopMerchant | null> {
  const store = await loadStore();
  return store.merchants.find((m) => m.id === merchantId) ?? null;
}

export async function getAccount(accountId: string): Promise<TossShopAccount | null> {
  const store = await loadStore();
  return store.accounts.find((a) => a.id === accountId) ?? null;
}

export async function updateMerchantApiKeys(
  merchantId: string,
  input: { accessKey?: string; secretKey?: string; sandbox?: boolean; clear?: boolean },
): Promise<TossShopMerchant | null> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (!merchant) return null;

  if (input.clear) {
    delete merchant.apiAccessKey;
    delete merchant.apiSecretKey;
    merchant.apiSandbox = false;
    merchant.dataSource = "demo";
    merchant.lastSyncError = undefined;
  } else {
    if (input.accessKey?.trim()) merchant.apiAccessKey = input.accessKey.trim();
    if (input.secretKey?.trim()) merchant.apiSecretKey = input.secretKey.trim();
    if (input.sandbox != null) merchant.apiSandbox = input.sandbox;
    merchant.dataSource = merchant.apiAccessKey && merchant.apiSecretKey ? "live" : "demo";
  }

  await saveStore(store);
  return merchant;
}

export function merchantApiStatus(merchant: TossShopMerchant) {
  const configured = isApiConfigured(merchant);
  return {
    configured,
    dataSource: merchant.dataSource ?? (configured ? "live" : "demo"),
    accessKeyMasked: merchant.apiAccessKey ? maskSecret(merchant.apiAccessKey) : null,
    sandbox: merchant.apiSandbox ?? false,
    lastSyncAt: merchant.lastSyncAt,
    lastSyncError: merchant.lastSyncError,
  };
}

export async function syncMerchantNow(merchantId: string): Promise<{
  ok: boolean;
  result?: Awaited<ReturnType<typeof syncMerchantFromTossApi>>["result"];
  error?: string;
}> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (!merchant) return { ok: false, error: "NOT_FOUND" };

  const data = merchantData(store, merchantId);
  const synced = await syncMerchantFromTossApi(merchant, data);

  const idx = store.merchants.findIndex((m) => m.id === merchantId);
  store.merchants[idx] = synced.merchant;
  store.merchantData[merchantId] = synced.data;

  if (synced.catalog.length > 0) {
    const ownIds = new Set(synced.catalog.map((p) => p.id));
    store.catalog = [
      ...synced.catalog,
      ...store.catalog.filter((p) => !ownIds.has(p.id)),
    ];
  }

  await saveStore(store);
  return { ok: true, result: synced.result };
}

export async function getStoreCatalog(): Promise<CatalogProduct[]> {
  const store = await loadStore();
  return store.catalog;
}

export async function getProductsBySellerName(sellerName: string): Promise<CatalogProduct[]> {
  const store = await loadStore();
  return store.catalog.filter((p) => p.sellerName === sellerName);
}

export async function getMarketKeywords(): Promise<{
  marketKeywords?: TossShopStore["marketKeywords"];
  marketCollectedAt?: string;
  marketProductCount?: number;
}> {
  const store = await loadStore();
  return {
    marketKeywords: store.marketKeywords,
    marketCollectedAt: store.marketCollectedAt,
    marketProductCount: store.marketProductCount,
  };
}

export async function getRankings(category?: string): Promise<CatalogProduct[]> {
  const store = await loadStore();
  const products = category
    ? store.catalog.filter((p) => p.category === category)
    : store.catalog;
  return [...products].sort((a, b) => a.rank - b.rank);
}

export async function getPriceHistory(productId: string): Promise<PriceSnapshot[]> {
  const store = await loadStore();
  return store.priceHistory[productId] ?? [];
}

export async function getWatchlist(merchantId: string): Promise<WatchlistItem[]> {
  const store = await loadStore();
  return merchantData(store, merchantId).watchlist;
}

export async function addToWatchlist(
  merchantId: string,
  productId: string,
  opts?: { keyword?: string; alertPriceDropPct?: number; alertRankUp?: number },
): Promise<WatchlistItem> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const keyword = opts?.keyword?.trim();
  if (
    data.watchlist.some(
      (w) => w.productId === productId && (w.keyword ?? "") === (keyword ?? ""),
    )
  ) {
    throw new Error("ALREADY_WATCHING");
  }
  if (!getProductById(productId, store.catalog) && !store.catalog.find((p) => p.id === productId)) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  const item: WatchlistItem = {
    id: newId("wl"),
    productId,
    keyword: keyword || undefined,
    alertPriceDropPct: opts?.alertPriceDropPct,
    alertRankUp: opts?.alertRankUp,
    addedAt: new Date().toISOString(),
  };
  data.watchlist.unshift(item);
  await saveStore(store);
  return item;
}

export async function removeFromWatchlist(merchantId: string, watchlistId: string): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  data.watchlist = data.watchlist.filter((w) => w.id !== watchlistId);
  await saveStore(store);
}

// ── Keywords ──

export async function getKeywords(merchantId: string): Promise<TrackedKeyword[]> {
  const store = await loadStore();
  return merchantData(store, merchantId).keywords;
}

export async function addKeyword(
  merchantId: string,
  keyword: string,
  myProductId?: string,
): Promise<TrackedKeyword> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const normalized = keyword.trim();
  if (!normalized) throw new Error("KEYWORD_REQUIRED");
  if (data.keywords.some((k) => k.keyword === normalized)) throw new Error("KEYWORD_EXISTS");
  const item: TrackedKeyword = {
    id: newId("kw"),
    keyword: normalized,
    myProductId,
    addedAt: new Date().toISOString(),
  };
  data.keywords.unshift(item);
  const snap = buildKeywordSnapshot(
    normalized,
    myProductId,
    store.catalog,
    store.marketKeywords,
  );
  if (!store.keywordHistory[normalized]) store.keywordHistory[normalized] = [];
  store.keywordHistory[normalized].push(snap);
  await saveStore(store);
  return item;
}

export async function removeKeyword(merchantId: string, keywordId: string): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  data.keywords = data.keywords.filter((k) => k.id !== keywordId);
  await saveStore(store);
}

export async function analyzeKeywordForMerchant(merchantId: string, keyword: string) {
  const store = await loadStore();
  const tracked = merchantData(store, merchantId).keywords.find((k) => k.keyword === keyword);
  return analyzeKeyword(keyword, tracked?.myProductId, store.catalog, store.marketKeywords);
}

export async function getKeywordHistory(keyword: string): Promise<KeywordSnapshot[]> {
  const store = await loadStore();
  return store.keywordHistory[keyword] ?? [];
}

// ── Competitors ──

export async function getCompetitors(merchantId: string): Promise<Competitor[]> {
  const store = await loadStore();
  return merchantData(store, merchantId).competitors;
}

export async function addCompetitor(
  merchantId: string,
  sellerName: string,
  trackedProductIds?: string[],
): Promise<Competitor> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const name = sellerName.trim();
  if (!name) throw new Error("SELLER_REQUIRED");
  const comp: Competitor = {
    id: newId("comp"),
    sellerName: name,
    trackedProductIds: trackedProductIds ?? [],
    addedAt: new Date().toISOString(),
  };
  data.competitors.unshift(comp);
  await saveStore(store);
  return comp;
}

export async function removeCompetitor(merchantId: string, competitorId: string): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  data.competitors = data.competitors.filter((c) => c.id !== competitorId);
  data.alertRules = data.alertRules.filter((r) => r.competitorId !== competitorId);
  await saveStore(store);
}

export async function getAlertRules(merchantId: string): Promise<CompetitorAlertRule[]> {
  const store = await loadStore();
  return merchantData(store, merchantId).alertRules;
}

export async function upsertAlertRule(
  merchantId: string,
  rule: Omit<CompetitorAlertRule, "id" | "createdAt"> & { id?: string },
): Promise<CompetitorAlertRule> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  if (rule.id) {
    const idx = data.alertRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      data.alertRules[idx] = { ...data.alertRules[idx], ...rule };
      await saveStore(store);
      return data.alertRules[idx];
    }
  }
  const newRule: CompetitorAlertRule = {
    id: newId("rule"),
    competitorId: rule.competitorId,
    metric: rule.metric,
    threshold: rule.threshold,
    channel: rule.channel,
    enabled: rule.enabled,
    createdAt: new Date().toISOString(),
  };
  data.alertRules.push(newRule);
  await saveStore(store);
  return newRule;
}

export async function getAlerts(merchantId: string): Promise<CompetitorAlert[]> {
  const store = await loadStore();
  return merchantData(store, merchantId).alerts.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function markAlertRead(merchantId: string, alertId: string): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const alert = data.alerts.find((a) => a.id === alertId);
  if (alert) alert.read = true;
  await saveStore(store);
}

// ── Settlements ──

export async function getSettlements(merchantId: string): Promise<SettlementRow[]> {
  const store = await loadStore();
  return merchantData(store, merchantId).settlements.sort((a, b) =>
    b.orderDate.localeCompare(a.orderDate),
  );
}

export async function importSettlementsCsv(
  merchantId: string,
  rows: Omit<SettlementRow, "id" | "status">[],
): Promise<{ imported: number; total: number }> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  let imported = 0;
  for (const row of rows) {
    const existing = data.settlements.find((s) => s.orderId === row.orderId);
    if (existing) {
      Object.assign(existing, row);
      imported++;
      continue;
    }
    data.settlements.unshift({
      ...row,
      id: newId("stl"),
      status: "pending",
    });
    imported++;
  }
  await saveStore(store);
  return { imported, total: data.settlements.length };
}

export async function reconcileSettlement(
  merchantId: string,
  settlementId: string,
  actualPayoutKrw: number,
): Promise<SettlementRow | null> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const row = data.settlements.find((s) => s.id === settlementId);
  if (!row) return null;
  row.actualPayoutKrw = actualPayoutKrw;
  const diff = Math.abs(row.expectedPayoutKrw - actualPayoutKrw);
  row.status = diff <= 1 ? "matched" : "discrepancy";
  if (diff > 1) row.note = `정산금 차액 ${diff.toLocaleString("ko-KR")}원`;
  await saveStore(store);
  return row;
}

export async function getSettlementSummary(merchantId: string) {
  const rows = await getSettlements(merchantId);
  const pending = rows.filter((r) => r.status === "pending");
  const matched = rows.filter((r) => r.status === "matched");
  const discrepancy = rows.filter((r) => r.status === "discrepancy");
  return {
    totalOrders: rows.length,
    pendingCount: pending.length,
    matchedCount: matched.length,
    discrepancyCount: discrepancy.length,
    pendingPayoutKrw: pending.reduce((s, r) => s + r.expectedPayoutKrw, 0),
    matchedPayoutKrw: matched.reduce((s, r) => s + (r.actualPayoutKrw ?? r.expectedPayoutKrw), 0),
    discrepancyKrw: discrepancy.reduce(
      (s, r) => s + Math.abs(r.expectedPayoutKrw - (r.actualPayoutKrw ?? 0)),
      0,
    ),
  };
}

// ── Dashboard stats ──

export async function getDashboardStats(merchantId: string) {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const unreadAlerts = data.alerts.filter((a) => !a.read).length;
  const settlement = await getSettlementSummary(merchantId);
  const myProducts = store.catalog.filter((p) => {
    const merchant = store.merchants.find((m) => m.id === merchantId);
    return merchant && p.sellerName === merchant.shopName;
  });
  return {
    watchlistCount: data.watchlist.length,
    keywordCount: data.keywords.length,
    competitorCount: data.competitors.length,
    unreadAlerts,
    myProductCount: myProducts.length,
    ...settlement,
  };
}

// ── Cron sync ──

export async function syncAllMerchants(): Promise<{
  priceUpdates: number;
  keywordUpdates: number;
  alertsFired: number;
  apiSyncs: number;
  marketKeywords?: number;
  autopilotRuns?: number;
}> {
  const store = await loadStore();
  const bucket = minuteKey();
  let priceUpdates = 0;
  let keywordUpdates = 0;
  let alertsFired = 0;
  let apiSyncs = 0;
  let autopilotRuns = 0;

  for (const merchant of store.merchants) {
    if (!isApiConfigured(merchant)) continue;
    const data = merchantData(store, merchant.id);
    const synced = await syncMerchantFromTossApi(merchant, data);
    const idx = store.merchants.findIndex((m) => m.id === merchant.id);
    store.merchants[idx] = synced.merchant;
    store.merchantData[merchant.id] = synced.data;
    if (synced.catalog.length > 0) {
      const ownIds = new Set(synced.catalog.map((p) => p.id));
      store.catalog = [...synced.catalog, ...store.catalog.filter((p) => !ownIds.has(p.id))];
    }
    apiSyncs++;
  }

  store.catalog = store.catalog.map((p) => {
    const updated = simulatePriceUpdate(p);
    priceUpdates++;
    if (!store.priceHistory[p.id]) store.priceHistory[p.id] = [];
    const last = store.priceHistory[p.id].find((s) => s.date === bucket);
    if (!last) {
      store.priceHistory[p.id] = appendCapped(store.priceHistory[p.id], {
        productId: p.id,
        date: bucket,
        priceKrw: updated.priceKrw,
        rank: updated.rank,
        reviewCount: updated.reviewCount,
      });
    }
    return updated;
  });

  for (const merchantId of Object.keys(store.merchantData)) {
    const data = merchantData(store, merchantId);

    for (const kw of data.keywords) {
      const snap = buildKeywordSnapshot(
        kw.keyword,
        kw.myProductId,
        store.catalog,
        store.marketKeywords,
      );
      if (!store.keywordHistory[kw.keyword]) store.keywordHistory[kw.keyword] = [];
      if (!store.keywordHistory[kw.keyword].some((s) => s.date === bucket)) {
        store.keywordHistory[kw.keyword] = appendCapped(store.keywordHistory[kw.keyword], snap);
        keywordUpdates++;
      }
    }

    for (const rule of data.alertRules.filter((r) => r.enabled)) {
      const comp = data.competitors.find((c) => c.id === rule.competitorId);
      if (!comp) continue;
      const products = store.catalog.filter(
        (p) => p.sellerName === comp.sellerName || comp.trackedProductIds.includes(p.id),
      );
      for (const product of products) {
        const history = store.priceHistory[product.id] ?? [];
        const prevPrice =
          history.length >= 2
            ? history[history.length - 2].priceKrw
            : product.priceKrw;
        const priceChangePct = ((product.priceKrw - prevPrice) / prevPrice) * 100;
        const rankDelta = product.rankPrev - product.rank;
        let message: string | null = null;
        if (rule.metric === "price_drop" && priceChangePct <= -(rule.threshold ?? 5)) {
          message = `[${comp.sellerName}] ${product.name} 가격 ${Math.abs(priceChangePct).toFixed(0)}% 하락 (${product.priceKrw.toLocaleString()}원)`;
        } else if (rule.metric === "price_rise" && priceChangePct >= (rule.threshold ?? 5)) {
          message = `[${comp.sellerName}] ${product.name} 가격 ${priceChangePct.toFixed(0)}% 상승 (${product.priceKrw.toLocaleString()}원)`;
        } else if (rule.metric === "rank_up" && rankDelta >= (rule.threshold ?? 2)) {
          message = `[${comp.sellerName}] ${product.name} 랭킹 ${product.rankPrev}→${product.rank} 상승`;
        } else if (rule.metric === "rank_down" && -rankDelta >= (rule.threshold ?? 2)) {
          message = `[${comp.sellerName}] ${product.name} 랭킹 ${product.rankPrev}→${product.rank} 하락`;
        }
        if (message) {
          const dup = data.alerts.some(
            (a) => a.message === message && a.createdAt.slice(0, 16) === bucket,
          );
          if (!dup) {
            data.alerts.unshift({
              id: newId("alert"),
              ruleId: rule.id,
              competitorId: comp.id,
              message,
              read: false,
              createdAt: new Date().toISOString(),
            });
            alertsFired++;
          }
        }
      }
    }

    for (const item of data.watchlist) {
      const product = store.catalog.find((p) => p.id === item.productId);
      if (!product) continue;
      const history = store.priceHistory[product.id] ?? [];
      const prevPrice =
        history.length >= 2 ? history[history.length - 2].priceKrw : product.priceKrw;
      const priceChangePct = ((product.priceKrw - prevPrice) / prevPrice) * 100;
      const rankDelta = product.rankPrev - product.rank;
      const dropThreshold = item.alertPriceDropPct ?? 5;
      const rankThreshold = item.alertRankUp ?? 2;
      let message: string | null = null;
      if (priceChangePct <= -dropThreshold) {
        message = `[관심상품] ${product.name} 가격 ${Math.abs(priceChangePct).toFixed(0)}% 하락 (${product.priceKrw.toLocaleString()}원)`;
      } else if (rankDelta >= rankThreshold) {
        message = `[관심상품] ${product.name} 랭킹 ${product.rankPrev}→${product.rank} 상승`;
      }
      if (message) {
        const dup = data.alerts.some(
          (a) => a.message === message && a.createdAt.slice(0, 16) === bucket,
        );
        if (!dup) {
          data.alerts.unshift({
            id: newId("alert"),
            watchlistId: item.id,
            message,
            read: false,
            createdAt: new Date().toISOString(),
          });
          alertsFired++;
        }
      }
    }
  }

  const market = collectMarketIntelligence(store.catalog);
  for (const d of getDiscoveryKeywords()) {
    if (!market.marketKeywords[d.keyword]) {
      market.marketKeywords[d.keyword] = {
        keyword: d.keyword,
        searchVolume: d.searchVolume,
        productCount: d.productCount,
        avgPriceKrw: d.avgPriceKrw,
        competitionIntensity: d.competitionIntensity,
        updatedAt: market.collectedAt,
      };
    }
  }
  store.marketKeywords = market.marketKeywords;
  store.marketCollectedAt = market.collectedAt;
  store.marketProductCount = market.productCount;

  for (const merchant of store.merchants) {
    const data = merchantData(store, merchant.id);
    const account = store.accounts.find((a) => a.merchantId === merchant.id);
    const config = await resolveApiConfig(merchant.id, {
      accessKey: merchant.apiAccessKey,
      secretKey: merchant.apiSecretKey,
      sandbox: merchant.apiSandbox,
    });
    try {
      const report = await runJarvisAutopilotCycle({
        merchantId: merchant.id,
        accountEmail: account?.email ?? "",
        data,
        catalog: store.catalog,
        config,
      });
      data.lastAutopilotReport = report;
      autopilotRuns++;
    } catch (e) {
      console.warn("[jarvis-autopilot]", merchant.id, e);
    }
  }

  await saveStore(store);
  return {
    priceUpdates,
    keywordUpdates,
    alertsFired,
    apiSyncs,
    marketKeywords: Object.keys(market.marketKeywords).length,
    autopilotRuns,
  };
}

// ── Billing usage ──

function todayUsage(account: TossShopAccount): { date: string; keywordAnalyses: number } {
  const today = todayDateKey();
  if (account.usage?.date === today) {
    return account.usage;
  }
  return { date: today, keywordAnalyses: 0 };
}

export async function getKeywordUsageToday(accountId: string): Promise<number> {
  const account = await getAccount(accountId);
  if (!account) return 0;
  return todayUsage(account).keywordAnalyses;
}

export async function recordKeywordAnalysis(accountId: string): Promise<number> {
  const store = await loadStore();
  const account = store.accounts.find((a) => a.id === accountId);
  if (!account) return 0;
  const usage = todayUsage(account);
  usage.keywordAnalyses += 1;
  account.usage = usage;
  await saveStore(store);
  return usage.keywordAnalyses;
}

export async function upgradeAccountToPro(accountId: string, months = 1): Promise<TossShopAccount | null> {
  const store = await loadStore();
  const account = store.accounts.find((a) => a.id === accountId);
  if (!account || account.plan === "owner") return account ?? null;
  account.plan = "pro";
  account.proExpiresAt = proExpiresAtFromNow(months);
  await saveStore(store);
  return account;
}

export async function syncOwnerPlanIfNeeded(accountId: string): Promise<void> {
  const store = await loadStore();
  const account = store.accounts.find((a) => a.id === accountId);
  if (!account) return;
  if (isOwnerEmail(account.email) && account.plan !== "owner") {
    account.plan = "owner";
    delete account.proExpiresAt;
    delete account.subscriptionStatus;
    await saveStore(store);
  }
}

export async function findAccountByEmail(email: string): Promise<TossShopAccount | null> {
  const store = await loadStore();
  return store.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findAccountByLsCustomerId(customerId: string): Promise<TossShopAccount | null> {
  const store = await loadStore();
  return store.accounts.find((a) => a.lsCustomerId === customerId) ?? null;
}

export async function applyTossShopSubscription(
  accountId: string,
  input: {
    lsCustomerId?: string;
    lsSubscriptionId?: string;
    subscriptionStatus: TossShopSubscriptionStatus;
    proExpiresAt?: string;
  },
): Promise<TossShopAccount | null> {
  const store = await loadStore();
  const account = store.accounts.find((a) => a.id === accountId);
  if (!account || account.plan === "owner") return account ?? null;

  if (input.lsCustomerId) account.lsCustomerId = input.lsCustomerId;
  if (input.lsSubscriptionId) account.lsSubscriptionId = input.lsSubscriptionId;
  account.subscriptionStatus = input.subscriptionStatus;

  if (input.subscriptionStatus === "active" || input.subscriptionStatus === "past_due") {
    account.plan = "pro";
    if (input.proExpiresAt) account.proExpiresAt = input.proExpiresAt;
  } else {
    account.plan = "free";
    delete account.proExpiresAt;
  }

  await saveStore(store);
  return account;
}

// ── Seller engine picks ──

export async function getConsignmentPicksForMerchant(merchantId: string): Promise<ConsignmentPick[]> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const merchant = store.merchants.find((m) => m.id === merchantId);
  const integrationCtx = {
    tossApiConfigured: Boolean(merchant?.apiAccessKey && merchant?.apiSecretKey),
    dataQuality: (merchant?.dataSource === "live" ? "live" : merchant?.dataSource === "live_partial" ? "mixed" : "demo") as "live" | "mixed" | "demo",
  };
  const today = todayDateKey();
  if (data.consignmentDate === today && data.consignmentPicks?.length) {
    return data.consignmentPicks;
  }
  const picks = await generateConsignmentPicks(store.catalog, today, store.marketKeywords, integrationCtx);
  data.consignmentPicks = picks;
  data.consignmentDate = today;
  await saveStore(store);
  return picks;
}

export async function getImportPicksForMerchant(merchantId: string): Promise<ImportPick[]> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const merchant = store.merchants.find((m) => m.id === merchantId);
  const integrationCtx = {
    tossApiConfigured: Boolean(merchant?.apiAccessKey && merchant?.apiSecretKey),
    dataQuality: (merchant?.dataSource === "live" ? "live" : merchant?.dataSource === "live_partial" ? "mixed" : "demo") as "live" | "mixed" | "demo",
  };
  const today = todayDateKey();
  if (data.importDate === today && data.importPicks?.length) {
    return data.importPicks;
  }
  const picks = await generateImportPicks(store.catalog, today, store.marketKeywords, integrationCtx);
  data.importPicks = picks;
  data.importDate = today;
  await saveStore(store);
  return picks;
}

// ── Jarvis listing drafts (user OK → publish) ──

function listingDrafts(data: ReturnType<typeof merchantData>): JarvisListingDraft[] {
  if (!data.listingDrafts) data.listingDrafts = [];
  return data.listingDrafts;
}

export async function listListingDraftsForMerchant(merchantId: string): Promise<JarvisListingDraft[]> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  return [...listingDrafts(data)].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getListingDraft(
  merchantId: string,
  draftId: string,
): Promise<JarvisListingDraft | null> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  return listingDrafts(data).find((d) => d.id === draftId) ?? null;
}

export async function createListingDraftFromPick(input: {
  merchantId: string;
  pickId: string;
  mode: "consignment" | "import";
}): Promise<JarvisListingDraft> {
  const store = await loadStore();
  const data = merchantData(store, input.merchantId);
  const merchant = store.merchants.find((m) => m.id === input.merchantId);
  const today = todayDateKey();
  const integrationCtx = {
    tossApiConfigured: Boolean(merchant?.apiAccessKey && merchant?.apiSecretKey),
    dataQuality: (merchant?.dataSource === "live"
      ? "live"
      : merchant?.dataSource === "live_partial"
        ? "mixed"
        : "demo") as "live" | "mixed" | "demo",
  };

  let pick: ConsignmentPick | ImportPick | undefined;
  if (input.mode === "consignment") {
    if (data.consignmentDate !== today || !data.consignmentPicks?.length) {
      data.consignmentPicks = await generateConsignmentPicks(
        store.catalog,
        today,
        store.marketKeywords,
        integrationCtx,
      );
      data.consignmentDate = today;
    }
    pick = data.consignmentPicks.find((p) => p.id === input.pickId);
  } else {
    if (data.importDate !== today || !data.importPicks?.length) {
      data.importPicks = await generateImportPicks(
        store.catalog,
        today,
        store.marketKeywords,
        integrationCtx,
      );
      data.importDate = today;
    }
    pick = data.importPicks.find((p) => p.id === input.pickId);
  }

  if (!pick) throw new Error("PICK_NOT_FOUND");

  const existing = listingDrafts(data).find(
    (d) => d.pickId === input.pickId && d.status !== "rejected" && d.status !== "failed",
  );
  if (existing) return existing;

  const draft = await buildListingDraftFromPick({
    merchantId: input.merchantId,
    pick,
    mode: input.mode,
    draftId: newId("jl"),
  });

  const enriched = enrichDraftWithAutopilot(draft, pick, store.catalog);
  listingDrafts(data).unshift(enriched);
  await saveStore(store);
  return enriched;
}

async function updateListingDraft(
  merchantId: string,
  draftId: string,
  patch: Partial<JarvisListingDraft>,
): Promise<JarvisListingDraft> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const drafts = listingDrafts(data);
  const idx = drafts.findIndex((d) => d.id === draftId);
  if (idx < 0) throw new Error("DRAFT_NOT_FOUND");
  drafts[idx] = { ...drafts[idx], ...patch, updatedAt: new Date().toISOString() };
  await saveStore(store);
  return drafts[idx];
}

export async function approveListingDraft(input: {
  merchantId: string;
  draftId: string;
  approvedBy: string;
}): Promise<JarvisListingDraft> {
  return updateListingDraft(input.merchantId, input.draftId, {
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy: input.approvedBy,
  });
}

export async function rejectListingDraft(input: {
  merchantId: string;
  draftId: string;
  reason?: string;
}): Promise<JarvisListingDraft> {
  return updateListingDraft(input.merchantId, input.draftId, {
    status: "rejected",
    rejectionReason: input.reason ?? "사용자 거절",
  });
}

export async function publishApprovedListingDraft(input: {
  merchantId: string;
  draftId: string;
  categoryId?: number;
  exchangeReturnLocationId?: number;
}): Promise<JarvisListingDraft> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === input.merchantId);
  const draft = await getListingDraft(input.merchantId, input.draftId);
  if (!draft) throw new Error("DRAFT_NOT_FOUND");
  if (draft.status !== "approved") throw new Error("DRAFT_NOT_APPROVED");

  await updateListingDraft(input.merchantId, input.draftId, { status: "publishing" });

  const config = await resolveApiConfig(input.merchantId, {
    accessKey: merchant?.apiAccessKey,
    secretKey: merchant?.apiSecretKey,
    sandbox: merchant?.apiSandbox,
  });

  if (!config) {
    return updateListingDraft(input.merchantId, input.draftId, {
      status: "failed",
      publishError: "토스 API 미연동 — 설정에서 키 등록 필요",
    });
  }

  const result = await publishListingToToss({
    merchantId: input.merchantId,
    config,
    draft,
    categoryId: input.categoryId,
    exchangeReturnLocationId: input.exchangeReturnLocationId,
    imageUrl: draft.detailPage.thumbnailUrl,
  });

  if (!result.ok) {
    return updateListingDraft(input.merchantId, input.draftId, {
      status: result.simulated ? "approved" : "failed",
      publishError: result.error,
    });
  }

  return updateListingDraft(input.merchantId, input.draftId, {
    status: "published",
    publishedAt: new Date().toISOString(),
    tossProductId: result.productId,
    publishError: undefined,
  });
}

async function resolvePickForDraft(
  store: TossShopStore,
  merchantId: string,
  draft: JarvisListingDraft,
): Promise<ConsignmentPick | ImportPick | null> {
  const data = merchantData(store, merchantId);
  if (draft.pickMode === "consignment") {
    return data.consignmentPicks?.find((p) => p.id === draft.pickId) ?? null;
  }
  return data.importPicks?.find((p) => p.id === draft.pickId) ?? null;
}

/** OK · Jarvis 전체 실행 — 승인 → 토스 등록 → 위탁 발주(위탁만) */
export async function executeJarvisListing(input: {
  merchantId: string;
  draftId: string;
  approvedBy: string;
  categoryId?: number;
  exchangeReturnLocationId?: number;
}): Promise<JarvisListingDraft> {
  let draft = await getListingDraft(input.merchantId, input.draftId);
  if (!draft) throw new Error("DRAFT_NOT_FOUND");

  if (["rejected", "publishing"].includes(draft.status)) {
    throw new Error("DRAFT_NOT_EXECUTABLE");
  }

  if (draft.status === "draft" || draft.status === "pending_review") {
    draft = await updateListingDraft(input.merchantId, input.draftId, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: input.approvedBy,
    });
  }

  if (draft.status === "approved") {
    draft = await publishApprovedListingDraft({
      merchantId: input.merchantId,
      draftId: input.draftId,
      categoryId: input.categoryId,
      exchangeReturnLocationId: input.exchangeReturnLocationId,
    });
  }

  const store = await loadStore();
  const pick = await resolvePickForDraft(store, input.merchantId, draft);

  let consignmentOrder = draft.consignmentOrder;
  if (draft.pickMode === "consignment" && pick && "wholesaleBest" in pick) {
    consignmentOrder = await executeConsignmentOrder(draft, pick);
  } else if (draft.pickMode === "import") {
    consignmentOrder = {
      status: "skipped",
      orderNote: "수입판매 — 발주는 수동 진행",
    };
  }

  return updateListingDraft(input.merchantId, input.draftId, {
    executedAt: new Date().toISOString(),
    consignmentOrder,
  });
}

export async function runAutopilotForMerchant(merchantId: string): Promise<import("./types").JarvisAutopilotReport> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (!merchant) throw new Error("MERCHANT_NOT_FOUND");
  const data = merchantData(store, merchantId);
  const account = store.accounts.find((a) => a.merchantId === merchantId);
  const config = await resolveApiConfig(merchantId, {
    accessKey: merchant.apiAccessKey,
    secretKey: merchant.apiSecretKey,
    sandbox: merchant.apiSandbox,
  });
  const report = await runJarvisAutopilotCycle({
    merchantId,
    accountEmail: account?.email ?? "",
    data,
    catalog: store.catalog,
    config,
  });
  data.lastAutopilotReport = report;
  await saveStore(store);
  return report;
}

export async function getJarvisHealthForMerchant(merchantId: string): Promise<import("./types").JarvisHealthReport> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  const data = merchantData(store, merchantId);
  return runJarvisHealthCheck({
    merchant,
    hasOpenAi: Boolean(process.env.OPENAI_API_KEY?.trim()),
    listingDraftCount: data.listingDrafts?.length ?? 0,
    fulfillmentJobCount: data.fulfillmentJobs?.length ?? 0,
  });
}

export async function getJarvisAutopilotForMerchant(merchantId: string) {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  return data.lastAutopilotReport ?? null;
}

export async function listFulfillmentJobs(merchantId: string) {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  return data.fulfillmentJobs ?? [];
}

export async function confirmFulfillmentTracking(input: {
  merchantId: string;
  jobId: string;
  trackingNumber: string;
  deliveryCompany?: string;
}) {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === input.merchantId);
  const data = merchantData(store, input.merchantId);
  const jobs = data.fulfillmentJobs ?? [];
  const idx = jobs.findIndex((j) => j.id === input.jobId);
  if (idx < 0) throw new Error("JOB_NOT_FOUND");

  const { applyTrackingFromSupplier } = await import("./seller-engine/fulfillment-engine");
  jobs[idx] = applyTrackingFromSupplier(
    jobs[idx],
    input.trackingNumber,
    input.deliveryCompany ?? "CJ대한통운",
  );

  const config = await resolveApiConfig(input.merchantId, {
    accessKey: merchant?.apiAccessKey,
    secretKey: merchant?.apiSecretKey,
    sandbox: merchant?.apiSandbox,
  });

  if (config && jobs[idx].pendingTrackingNumber) {
    const { registerOrderTracking } = await import("./api/orders");
    await registerOrderTracking(input.merchantId, config, {
      orderProductId: jobs[idx].orderProductId,
      deliveryCompany: jobs[idx].pendingDeliveryCompany ?? "CJ대한통운",
      trackingNumber: jobs[idx].pendingTrackingNumber,
    });
    jobs[idx].status = "tracking_registered";
    jobs[idx].trackingRegisteredAt = new Date().toISOString();
  }

  data.fulfillmentJobs = jobs;
  await saveStore(store);
  return jobs[idx];
}
