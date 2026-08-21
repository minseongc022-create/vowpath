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
import { todayDateKey } from "./format";
import type {
  CatalogProduct,
  Competitor,
  CompetitorAlert,
  CompetitorAlertRule,
  KeywordSnapshot,
  MerchantData,
  PriceSnapshot,
  SettlementRow,
  TossShopAccount,
  TossShopMerchant,
  TossShopStore,
  TrackedKeyword,
  WatchlistItem,
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
  const account: TossShopAccount = {
    id: newId("acc"),
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    name: input.name,
    merchantId,
    createdAt: new Date().toISOString(),
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

// ── Catalog & Rankings ──

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
  opts?: { alertPriceDropPct?: number; alertRankUp?: number },
): Promise<WatchlistItem> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  if (data.watchlist.some((w) => w.productId === productId)) {
    throw new Error("ALREADY_WATCHING");
  }
  if (!getProductById(productId) && !store.catalog.find((p) => p.id === productId)) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  const item: WatchlistItem = {
    id: newId("wl"),
    productId,
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
  const snap = buildKeywordSnapshot(normalized, myProductId);
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
  return analyzeKeyword(keyword, tracked?.myProductId);
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
}> {
  const store = await loadStore();
  const date = todayDateKey();
  let priceUpdates = 0;
  let keywordUpdates = 0;
  let alertsFired = 0;

  store.catalog = store.catalog.map((p) => {
    const updated = simulatePriceUpdate(p);
    priceUpdates++;
    if (!store.priceHistory[p.id]) store.priceHistory[p.id] = [];
    const last = store.priceHistory[p.id].find((s) => s.date === date);
    if (!last) {
      store.priceHistory[p.id].push({
        productId: p.id,
        date,
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
      const snap = buildKeywordSnapshot(kw.keyword, kw.myProductId);
      if (!store.keywordHistory[kw.keyword]) store.keywordHistory[kw.keyword] = [];
      if (!store.keywordHistory[kw.keyword].some((s) => s.date === date)) {
        store.keywordHistory[kw.keyword].push(snap);
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
            (a) => a.message === message && a.createdAt.slice(0, 10) === date,
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
  }

  await saveStore(store);
  return { priceUpdates, keywordUpdates, alertsFired };
}

import { parseSettlementCsv } from "./settlement-csv";
