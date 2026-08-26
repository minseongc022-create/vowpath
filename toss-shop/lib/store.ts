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
import { isImportSalesEnabled } from "./seller-engine/channel-mode";
import { buildListingDraftFromPick } from "./seller-engine/listing-automation";
import { publishListingToToss } from "./api/create-product";
import { resolveApiConfig } from "./api/client";
import { executeConsignmentOrder } from "./seller-engine/consignment-order";
import { runJarvisAutopilotCycle, enrichDraftWithAutopilot, isAutoExecuteEnabled } from "./seller-engine/jarvis-autopilot-engine";
import { JARVIS_VERSION } from "./seller-engine/jarvis-engine";
import { RISK_PLAYBOOK_VERSION } from "./seller-engine/risk-playbook";
import { getAutoExecuteMaxPerCycle } from "./seller-engine/jarvis-config";
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
    await seedDemoPassword(store);
    await saveStore(store);
    return store;
  }
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(STORE_FILE, "utf8");
    const store = normalizeStore(JSON.parse(raw) as Partial<TossShopStore>);
    if (!store.accounts[0]?.passwordHash && demoAccountPassword()) {
      await seedDemoPassword(store);
      await saveStore(store);
    }
    return store;
  } catch {
    const store = defaultStore();
    await seedDemoPassword(store);
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

/**
 * 데모 계정 비밀번호.
 *
 * ⚠️ 프로덕션에서는 데모 계정을 만들지 않는다.
 * 종전에는 어떤 환경에서든 `demo@effiroad.local / demo1234` 계정이 생성됐고,
 * 이 비밀번호는 strings.ts에 있어 로그인 화면에도 노출된다. 프로덕션에
 * 고정 비밀번호 계정이 살아 있으면 누구나 들어와 시드 상점 데이터를 만지고,
 * 다른 데모 사용자와 같은 merchant를 공유하게 된다.
 *
 * 로컬/미리보기에서는 데모 체험이 필요하므로 그대로 둔다.
 */
function demoAccountPassword(): string | null {
  if (process.env.VERCEL_ENV === "production") return null;
  return process.env.TOSS_SHOP_DEMO_PASSWORD?.trim() || "demo1234";
}

async function seedDemoPassword(store: TossShopStore): Promise<void> {
  const pw = demoAccountPassword();
  if (!pw) {
    // 프로덕션 — 데모 계정을 로그인 불가 상태로 남긴다(빈 해시 = 인증 거부)
    if (store.accounts[0]) store.accounts[0].passwordHash = "";
    return;
  }
  store.accounts[0].passwordHash = await hashPassword(pw);
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
  // ⚠️ 환경변수의 토스 API 키는 **오너 계정에만** 붙인다.
  // 종전에는 모든 신규 가입자의 merchant에 TOSS_SHOPPING_* 키가 주입되어,
  // 아무나 가입하면 오너의 토스 상점에 상품을 등록하고 주문·정산을 조회할
  // 수 있었다. 키 유출이자 "내 계정만 무료" 정책이 무너지는 지점이었다.
  // 일반 셀러는 설정 → API 연동에서 자기 키를 직접 입력해야 한다.
  const envConfig = isOwnerEmail(account.email) ? configFromEnv() : null;
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
  const account = store.accounts.find((a) => a.merchantId === merchantId);
  const synced = await syncMerchantFromTossApi(merchant, data, account?.email);

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
    const syncAccount = store.accounts.find((a) => a.merchantId === merchant.id);
    const synced = await syncMerchantFromTossApi(merchant, data, syncAccount?.email);
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
    const config = await resolveApiConfig(
      merchant.id,
      {
        accessKey: merchant.apiAccessKey,
        secretKey: merchant.apiSecretKey,
        sandbox: merchant.apiSandbox,
      },
      account?.email,
    );
    try {
      const t2 = Date.now();
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

/**
 * 기존 계정의 비밀번호를 재설정한다 (오너 프로비저닝 스크립트 전용).
 * 평문 비밀번호는 저장하지 않고 bcrypt 해시만 남긴다.
 */
export async function setAccountPassword(email: string, password: string): Promise<boolean> {
  const store = await loadStore();
  const idx = store.accounts.findIndex((a) => a.email.toLowerCase() === email.toLowerCase());
  if (idx < 0) return false;
  store.accounts[idx].passwordHash = await hashPassword(password);
  // 오너 이메일이면 플랜도 오너로 정정한다 (이메일 기준 판정과 일치시킴)
  if (isOwnerEmail(email)) store.accounts[idx].plan = "owner";
  await saveStore(store);
  return true;
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

  // 캐시 열쇠에 **엔진 버전**을 함께 넣는다.
  //
  // 종전엔 날짜만 봤다. 그래서 점수·리스크 엔진을 고쳐도 이미 만들어둔
  // 후보가 그대로 남아, 배포 뒤에도 최대 24시간 동안 옛 판정이 유지됐다.
  // 실제로 safety 게이트 결함을 고치고 배포했는데 후보 3건이 전부 옛
  // 점수를 들고 있어 여전히 인증 0이었다 — 고쳤는지 아닌지 확인할 방법이
  // 없는 상태가 된다. 엔진이 바뀌면 후보도 다시 계산돼야 한다.
  const picksKey = `${today}|${JARVIS_VERSION}|${RISK_PLAYBOOK_VERSION}`;
  if (data.consignmentDate === picksKey && data.consignmentPicks?.length) {
    return data.consignmentPicks;
  }
  // 발굴로 모은 실측 표본을 앞에 둔다 — 데모 시드보다 먼저 보게 해서,
  // 후보가 실측 공급처·원가 위에서 만들어지게 한다.
  const catalog = [...(data.discoveredProducts ?? []), ...store.catalog];
  const picks = await generateConsignmentPicks(catalog, today, store.marketKeywords, integrationCtx);
  data.consignmentPicks = picks;
  data.consignmentDate = picksKey;
  await saveStore(store);
  return picks;
}

export async function getImportPicksForMerchant(merchantId: string): Promise<ImportPick[]> {
  // 수입판매 비활성 시 아무것도 내지 않는다. import-sources.ts는 공급가를
  // 키워드 해시로 생성하고 랜딩코스트에 부가세가 빠져 있어, 표시되는 마진이
  // 실제보다 낙관적이다. 그 숫자를 근거로 발주하면 돈을 잃는다.
  if (!isImportSalesEnabled()) return [];

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
    // 수입 초안 생성도 차단 — 가짜 원가로 만든 초안이 등록까지 가면 안 된다.
    if (!isImportSalesEnabled()) throw new Error("IMPORT_SALES_DISABLED");
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
  /** 무인 자동등록 경로 — 반품지 매핑 누락 시 등록을 차단한다 */
  strictReturnLocation?: boolean;
}): Promise<JarvisListingDraft> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === input.merchantId);
  const account = store.accounts.find((a) => a.merchantId === input.merchantId);
  const draft = await getListingDraft(input.merchantId, input.draftId);
  if (!draft) throw new Error("DRAFT_NOT_FOUND");
  if (draft.status !== "approved") throw new Error("DRAFT_NOT_APPROVED");

  await updateListingDraft(input.merchantId, input.draftId, { status: "publishing" });

  const config = await resolveApiConfig(
    input.merchantId,
    {
      accessKey: merchant?.apiAccessKey,
      secretKey: merchant?.apiSecretKey,
      sandbox: merchant?.apiSandbox,
    },
    account?.email,
  );

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
    strictReturnLocation: input.strictReturnLocation,
  });

  if (!result.ok) {
    return updateListingDraft(input.merchantId, input.draftId, {
      status: result.simulated ? "approved" : "failed",
      publishError: result.error,
      returnLocation: result.returnLocation,
      category: result.category,
    });
  }

  return updateListingDraft(input.merchantId, input.draftId, {
    status: "published",
    publishedAt: new Date().toISOString(),
    tossProductId: result.productId,
    publishError: undefined,
    returnLocation: result.returnLocation,
    category: result.category,
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
  /** 무인 자동등록 경로 — 반품지 매핑 누락 시 등록을 차단한다 */
  strictReturnLocation?: boolean;
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
      strictReturnLocation: input.strictReturnLocation,
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

/**
 * 게이트를 통과한 초안을 토스에 실제로 등록한다.
 *
 * 심박(runAutopilotForMerchant)과 일괄 동기화(syncAllMerchants)가 **같은**
 * 이 함수를 쓴다. 종전엔 이 로직이 후자에만 있어서, 10분마다 도는 심박은
 * 초안만 만들고 등록은 한 건도 못 했다.
 *
 * 등록은 건당 토스 API를 여러 번 태워서 몇 초씩 걸린다. Hobby 함수는 60초에
 * 강제 종료되므로, 마감시각이 있으면 남은 시간을 보고 다음 건을 시작할지
 * 정한다 — 한 건이라도 온전히 끝내는 게 여러 건을 하다 잘리는 것보다 낫다.
 */
export async function autoPublishCertifiedDrafts(
  merchantId: string,
  opts: { approvedBy: string; deadlineAt?: number },
): Promise<{
  published: number;
  actions: string[];
  errors: string[];
  /** 왜 안 올라갔는지 — 등록 0일 때 원인을 짚는 유일한 근거 */
  notEligible: Record<string, number>;
}> {
  const actions: string[] = [];
  const errors: string[] = [];
  /**
   * 등록이 0으로 나올 때 "왜"를 남긴다.
   *
   * 종전엔 조건에 안 맞는 초안이 조용히 걸러져서, 심박 응답에 `published: 0`만
   * 찍히고 원인을 알 길이 없었다. 결함인지 정상적인 경제성 탈락인지 구분이
   * 안 되면 고칠 수가 없다.
   */
  const notEligible: Record<string, number> = {};
  let published = 0;

  if (!isAutoExecuteEnabled()) {
    notEligible["JARVIS_AUTO_EXECUTE 꺼짐"] = 1;
    return { published, actions, errors, notEligible };
  }

  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const all = data.listingDrafts ?? [];
  const candidates = all.filter(
    (d) => d.jarvisCertified && (d.status === "pending_review" || d.status === "approved"),
  );

  for (const d of all) {
    if (candidates.includes(d)) continue;
    const why = !d.jarvisCertified
      ? `미인증(신뢰도 ${d.jarvisConfidence ?? 0}%)`
      : `상태=${d.status}${d.publishError ? ` — ${d.publishError}` : ""}`;
    notEligible[why] = (notEligible[why] ?? 0) + 1;
  }

  /** 등록 한 건에 넉넉히 잡은 시간 — 이만큼 안 남았으면 시작하지 않는다 */
  const PUBLISH_MIN_MS = 8_000;

  for (const draft of candidates.slice(0, getAutoExecuteMaxPerCycle())) {
    if (opts.deadlineAt && opts.deadlineAt - Date.now() < PUBLISH_MIN_MS) {
      actions.push("등록 시간 부족 — 남은 건은 다음 심박에서 이어서 올립니다");
      break;
    }
    try {
      await executeJarvisListing({
        merchantId,
        draftId: draft.id,
        approvedBy: opts.approvedBy,
      });
      published += 1;
      actions.push(`[AUTO] 「${draft.keyword}」 토스 등록 완료`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AUTO_EXECUTE_FAIL";
      errors.push(`auto_execute:${draft.id}:${msg}`);
    }
  }

  return { published, actions, errors, notEligible };
}

export async function runAutopilotForMerchant(
  merchantId: string,
  opts?: { discoverySize?: number; discoveryBudgetMs?: number; deadlineAt?: number },
): Promise<import("./types").JarvisAutopilotReport> {
  // 한 바퀴 돌기 전에 시장을 새로 훑는다.
  //
  // 이걸 안 하면 사이클은 어제 만든 후보 목록을 다시 보고 같은 결론을 낸다 —
  // "올릴 만한 게 없습니다"가 반복된 이유가 이것이었다. 발굴은 실패해도
  // 사이클을 막지 않는다: 새로 못 찾았을 뿐 기존 후보 처리는 계속돼야 한다.
  //
  // 예산을 밖에서 조절할 수 있게 열어둔 이유: 크론은 60초 안에 여러 가맹점을
  // 다 돌아야 해서 발굴에 20초를 쓰면 정작 등록까지 못 간다.
  const t0 = Date.now();
  try {
    await runDiscoveryForMerchant(merchantId, {
      size: opts?.discoverySize ?? 24,
      budgetMs: opts?.discoveryBudgetMs ?? 20_000,
    });
  } catch (e) {
    console.warn("[jarvis] 시장 발굴 실패:", e);
  }
  const tDiscovery = Date.now() - t0;

  // 발굴로 캐시가 깨졌으면 여기서 후보가 새로 만들어진다.
  //
  // ⚠️ 이 단계가 생각보다 무겁다 — 키워드마다 도매 검색을 돌리기 때문이다.
  // 어느 단계가 시간을 먹는지 추측하지 않고 재서 남긴다. 서버리스는 60초에
  // 강제 종료되므로 어디를 줄여야 하는지 정확히 알아야 한다.
  const t1 = Date.now();
  await getConsignmentPicksForMerchant(merchantId);
  const tPicks = Date.now() - t1;

  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (!merchant) throw new Error("MERCHANT_NOT_FOUND");
  const data = merchantData(store, merchantId);
  const account = store.accounts.find((a) => a.merchantId === merchantId);
  const config = await resolveApiConfig(
    merchantId,
    {
      accessKey: merchant.apiAccessKey,
      secretKey: merchant.apiSecretKey,
      sandbox: merchant.apiSandbox,
    },
    account?.email,
  );
  const t2 = Date.now();
  const report = await runJarvisAutopilotCycle({
    merchantId,
    accountEmail: account?.email ?? "",
    data,
    catalog: store.catalog,
    config,
    deadlineAt: opts?.deadlineAt,
  });
  const tCycle = Date.now() - t2;
  report.stageTimings = { discoveryMs: tDiscovery, picksMs: tPicks, cycleMs: tCycle };

  data.lastAutopilotReport = report;
  await saveStore(store);

  // 만든 초안을 실제로 토스에 올린다.
  //
  // ⚠️ 이게 여기 없어서 매출이 0이었다 — 실측으로 드러난 결함
  //
  // 자동 등록 코드는 원래 syncAllMerchants() 안에만 있었다. 그런데 10분마다
  // 도는 심박은 그 함수를 부르지 않고 이 함수를 부른다. 그래서 초안은 계속
  // 쌓이는데 등록은 영원히 0이었다 — 심박 응답의 `published: 0`이 그거였다.
  // 「지금 돌려」를 눌러도 마찬가지였다.
  //
  // 같은 실수를 또 하지 않으려고 아예 공용 함수로 빼서 양쪽이 같은 코드를
  // 쓰게 했다. 한쪽만 고쳐지고 다른 쪽이 뒤처지는 게 이 결함의 원인이었다.
  //
  // saveStore 뒤에 두는 이유: 등록 함수는 저장된 초안을 id로 다시 읽는다.
  // 저장 전에 부르면 방금 만든 초안을 못 찾는다.
  let publishSkips: Record<string, number> = {};
  try {
    const pub = await autoPublishCertifiedDrafts(merchantId, {
      approvedBy: account?.email ?? "jarvis-autopilot",
      deadlineAt: opts?.deadlineAt,
    });
    report.stats.draftsExecuted += pub.published;
    report.actions.push(...pub.actions);
    report.errors.push(...pub.errors);
    publishSkips = pub.notEligible;
    for (const [why, n] of Object.entries(pub.notEligible)) {
      report.actions.push(`등록 대상 아님 ${n}건 — ${why}`);
    }
    if (pub.published > 0 || pub.errors.length > 0) {
      // 등록 결과가 리포트에 남아야 대시보드가 진짜 상태를 보여준다
      const s2 = await loadStore();
      merchantData(s2, merchantId).lastAutopilotReport = report;
      await saveStore(s2);
    }
  } catch (e) {
    console.warn("[jarvis] 자동 등록 실패:", e);
  }
  report.publishSkips = publishSkips;

  // 발주 대기로 잡힌 주문을 실제로 도매꾹/도매매에 넣는다. 알림보다 먼저다 —
  // 알림은 발주가 안 됐을 때를 대비한 안전망이고, 발주 자체가 이 사이클의
  // 핵심 작업이다.
  try {
    await autoPlaceWholesaleOrders(merchantId);
  } catch (e) {
    console.warn("[jarvis] 자동 발주 실패:", e);
  }

  // 한 바퀴 돌 때마다 밀린 필수 작업이 있는지 보고, 있으면 사장님 휴대폰으로
  // 알린다. 실패해도 사이클 결과는 그대로 돌려준다 — 알림이 안 갔다고 자동화가
  // 멈추면 안 된다.
  try {
    await dispatchOwnerTodoAlerts(merchantId);
  } catch (e) {
    console.warn("[jarvis] 사장님 알림 처리 실패:", e);
  }

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
    settlementCount: data.settlements?.length ?? 0,
  });
}

/**
 * 효자상품 리포트 + 광고비 배분 계획.
 *
 * 효자 판정은 예측이 아니라 **실제 정산 입금액**으로만 한다. 그래서 광고비도
 * 예측 점수가 아니라 이 결과를 기준으로 배분된다 — 예측에 태우면 예측 오차에
 * 돈을 거는 것이고, 실적에 태우면 사실에 거는 것이다.
 */
export async function getWinnerReportForMerchant(merchantId: string, dailyAdBudgetKrw?: number) {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const { analyzeWinnerSkus } = await import("./seller-engine/winner-sku-engine");
  const { allocateAdBudget } = await import("./seller-engine/ad-budget-allocator");
  const { getMonthlyGoalKrw } = await import("./seller-engine/goal-engine");
  const { meetsSupplierPolicy } = await import("./wholesale/supplier-quality");

  const winners = analyzeWinnerSkus({
    settlements: data.settlements ?? [],
    goalKrw: getMonthlyGoalKrw(),
  });

  const budget = dailyAdBudgetKrw ?? (Number(process.env.TOSS_SHOP_DAILY_AD_BUDGET_KRW) || 0);
  if (!budget) return { winners, adPlan: null };

  // 광고 후보는 등록된 초안에서 만든다. 이미 배송 인센티브로 수수료가 0%인
  // SKU는 광고의 수수료 면제가 중복되지 않으므로 배분기가 비중을 낮춘다.
  const published = (data.listingDrafts ?? []).filter((d) => d.status === "published");
  const picks = data.consignmentPicks ?? [];
  const candidates = published.map((d) => {
    const pick = picks.find((p) => p.id === d.pickId);
    const price = d.listingPayload.salePrice;
    const supplierCost = pick?.supplierCostKrw ?? Math.round(price * 0.62);
    return {
      productName: d.listingPayload.name,
      priceKrw: price,
      grossMarginKrw: Math.max(0, price - supplierCost),
      alreadyFeeFree: meetsSupplierPolicy(pick?.wholesaleBest?.supplierQuality),
    };
  });

  const adPlan = allocateAdBudget({
    totalDailyBudgetKrw: budget,
    winners,
    candidates,
  });
  return { winners, adPlan };
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
  const account = store.accounts.find((a) => a.merchantId === input.merchantId);
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

  const config = await resolveApiConfig(
    input.merchantId,
    {
      accessKey: merchant?.apiAccessKey,
      secretKey: merchant?.apiSecretKey,
      sandbox: merchant?.apiSandbox,
    },
    account?.email,
  );

  // 택배사는 **코드**로 보내야 한다(토스 문서 명시). 여태 "CJ대한통운" 같은
  // 이름을 보내고 있었는데, 그러면 등록이 거절되고 고객은 배송 조회를 못 한다.
  // 실제 목록을 받아 맞추고, 못 맞추면 **추측해서 보내지 않는다** —
  // 틀린 택배사로 등록하면 조회가 엉뚱한 데를 가리킨다.
  let trackingError: string | undefined;
  if (config && jobs[idx].pendingTrackingNumber) {
    const { listDeliveryCompanyCodes, matchDeliveryCompanyCode } = await import(
      "./api/product-ops"
    );
    const spoken = jobs[idx].pendingDeliveryCompany ?? "";
    const codes = await listDeliveryCompanyCodes(input.merchantId, config);
    const code = matchDeliveryCompanyCode(spoken, codes);

    if (!code) {
      trackingError =
        codes.length === 0
          ? "토스에서 택배사 목록을 못 받아왔습니다"
          : `「${spoken}」에 맞는 택배사를 토스 목록에서 못 찾았습니다`;
    } else {
      const { registerOrderTracking } = await import("./api/orders");
      const ok = await registerOrderTracking(input.merchantId, config, {
        orderProductId: jobs[idx].orderProductId,
        deliveryCompany: code,
        trackingNumber: jobs[idx].pendingTrackingNumber,
      });
      if (ok) {
        jobs[idx].deliveryCompany = code;
        jobs[idx].status = "tracking_registered";
        jobs[idx].trackingRegisteredAt = new Date().toISOString();
      } else {
        trackingError = "토스가 송장 등록을 거절했습니다";
      }
    }
  }

  data.fulfillmentJobs = jobs;
  await saveStore(store);
  return { ...jobs[idx], trackingError };
}

// ── 자비스 대화 지원 ──────────────────────────────────────────

/** 대화창이 답하는 데 필요한 현재 상태 — 숫자를 지어내지 않기 위한 근거 */
export async function getJarvisChatContext(merchantId: string) {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const { summarizeJarvisStatus } = await import("./seller-engine/jarvis-chat");
  const { getMonthlyGoalKrw } = await import("./seller-engine/goal-engine");
  return {
    status: summarizeJarvisStatus(data, data.monthlyGoalKrw ?? getMonthlyGoalKrw()),
    jobs: data.fulfillmentJobs ?? [],
  };
}

/**
 * "반품지 등록했어" — 토스에서 목록을 다시 읽어 대기 중이던 공급처와 맞춰본다.
 *
 * 토스가 반품지 생성 API를 안 줘서(405 실측) 등록은 사람이 하지만, 등록한
 * **다음**은 전부 자동이다. 사장님이 한마디만 하면 이 함수가 즉시 목록을
 * 다시 읽어 매칭하고, 연결된 공급처는 대기 목록에서 빠진다 — 다음 크론
 * 사이클까지 기다릴 필요가 없다.
 */
export async function syncReturnLocationsForMerchant(merchantId: string): Promise<{
  locationCount: number;
  matched: number;
  stillPending: number;
  error?: string;
}> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  const account = store.accounts.find((a) => a.merchantId === merchantId);
  const data = merchantData(store, merchantId);
  const pending = data.pendingReturnAddresses ?? [];

  const config = await resolveApiConfig(
    merchantId,
    {
      accessKey: merchant?.apiAccessKey,
      secretKey: merchant?.apiSecretKey,
      sandbox: merchant?.apiSandbox,
    },
    account?.email,
  );
  if (!config) {
    return { locationCount: 0, matched: 0, stillPending: pending.length, error: "토스 API 미연동" };
  }

  const { listTossReturnLocations } = await import("./api/return-location-lookup");
  const { findLocationByAddress } = await import("./api/return-location-matcher");

  let locations;
  try {
    ({ locations } = await listTossReturnLocations(merchantId, config));
  } catch (e) {
    return {
      locationCount: 0,
      matched: 0,
      stillPending: pending.length,
      error: e instanceof Error ? e.message : "RETURN_LOCATION_LOOKUP_FAIL",
    };
  }

  // 등록이 확인된 공급처는 대기 목록에서 뺀다 — 다음 사이클에 자동으로
  // 공급처 직행(비용 0원)으로 처리된다.
  const remaining = pending.filter((p) => !findLocationByAddress(locations, p.address));
  const matched = pending.length - remaining.length;

  data.pendingReturnAddresses = remaining;
  await saveStore(store);

  return { locationCount: locations.length, matched, stillPending: remaining.length };
}

// ── 발주 · 알림 · 반품지 목록 (전부 대화로 처리된다) ──────────────

/**
 * "발주했어" — 방금 안내한 만큼을 발주 완료로 넘긴다.
 *
 * 안내한 건수(ORDER_BRIEF_LIMIT)와 여기서 처리하는 건수가 반드시 같아야 한다.
 * 3건만 보여주고 전부를 완료 처리하면, 사장님이 안 넣은 주문이 "발주됨"으로
 * 넘어가 송장이 영영 안 나오고 발송기한을 넘긴다.
 */
export async function markWholesaleOrdered(merchantId: string): Promise<{
  marked: number;
  remaining: number;
  names: string[];
}> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const jobs = data.fulfillmentJobs ?? [];
  const { pickJobsNeedingOrder, ORDER_BRIEF_LIMIT } = await import("./seller-engine/jarvis-chat");
  const { applyWholesaleOrderConfirmed } = await import("./seller-engine/fulfillment-engine");

  const waiting = pickJobsNeedingOrder(jobs);
  const target = waiting.slice(0, ORDER_BRIEF_LIMIT);
  const names: string[] = [];
  for (const job of target) {
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx < 0) continue;
    jobs[idx] = applyWholesaleOrderConfirmed(jobs[idx]);
    names.push(jobs[idx].productName);
  }

  data.fulfillmentJobs = jobs;
  await saveStore(store);
  return { marked: names.length, remaining: waiting.length - names.length, names };
}

/** 발주 대기 주문 — 대화창이 붙여넣기 좋은 형태로 뿌린다 */
export async function getSupplierOrderBrief(merchantId: string): Promise<string> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const { pickJobsNeedingOrder, renderSupplierOrderBrief } = await import(
    "./seller-engine/jarvis-chat"
  );
  return renderSupplierOrderBrief(pickJobsNeedingOrder(data.fulfillmentJobs ?? []));
}

/** 아직 토스에 없는 반품지 주소 — 셀러센터에 그대로 붙여넣을 수 있게 */
export async function getReturnAddressBrief(merchantId: string): Promise<string> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const pending = data.pendingReturnAddresses ?? [];
  if (pending.length === 0) {
    return "등록하실 반품지가 없습니다. 지금은 전부 공급처로 바로 반품되고 있어요 (비용 0원).";
  }
  const { renderBulkProvisioningInstructions } = await import(
    "./seller-engine/return-location-provisioner"
  );
  return renderBulkProvisioningInstructions(pending);
}

/**
 * 알림 받을 번호를 저장한다.
 *
 * 환경변수가 아니라 가맹점 데이터에 넣는 이유: 사장님이 대화창에서 번호를
 * 바꾸면 즉시 반영돼야 하기 때문이다. 배포를 다시 할 일이 없다.
 */
export async function setOwnerAlertPhone(
  merchantId: string,
  phoneE164: string,
): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  data.ownerAlertPhone = phoneE164;
  // 번호를 바꿨으면 이전에 보냈다는 기록은 지운다 — 새 번호로는 아직
  // 아무것도 안 갔으므로, 밀린 일이 있으면 곧바로 한 통 가야 한다.
  data.sentTodoKinds = [];
  await saveStore(store);
}

/**
 * 지금 당장 문자 한 통을 보내본다 — 설정이 실제로 되는지 확인용.
 *
 * 실패하면 왜 실패했는지 그대로 돌려준다. "안 왔다"만으로는 번호가 문제인지
 * 발송 설정이 문제인지 알 수 없어서, 사장님이 뭘 고쳐야 하는지 판단이 안 된다.
 */
export async function sendOwnerTestAlert(merchantId: string): Promise<{
  ok: boolean;
  phone?: string;
  error?: string;
}> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const phone = data.ownerAlertPhone?.trim() || process.env.OWNER_ALERT_PHONE?.trim();
  if (!phone) return { ok: false, error: "번호가 아직 없습니다" };

  const { sendSms } = await import("@/lib/send-sms");
  const result = await sendSms(
    phone,
    "[자비스] 알림 테스트입니다. 이 문자가 왔으면 설정이 끝난 겁니다.",
    "jarvis-owner-test",
    { usRecipientsOnly: false, strict: true },
  );
  return result.ok ? { ok: true, phone } : { ok: false, phone, error: result.error };
}

/**
 * 밀린 필수 작업을 사장님 휴대폰으로 알린다.
 *
 * 자비스 사이클이 끝날 때마다 호출된다. 같은 종류는 한 번만 나가고, 해소됐다가
 * 다시 생기면 그때 다시 나간다 — 60초마다 문자가 오면 사장님은 알림을 꺼버리고,
 * 그러면 진짜 급한 걸 놓치게 된다.
 *
 * 문자 발송이 실패해도 사이클은 계속 간다. 알림은 보조 수단이지 자동화의
 * 전제가 아니다.
 */
export async function dispatchOwnerTodoAlerts(merchantId: string): Promise<{
  sent: number;
  skippedReason?: string;
}> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const { collectOwnerTodos, pickTodosToSend } = await import(
    "./seller-engine/owner-todo-alerts"
  );

  const todos = collectOwnerTodos(data.fulfillmentJobs ?? [], Date.now(), {
    emoneyInsufficientSince: data.emoneyInsufficientAt,
  });
  const { toSend, nextState } = pickTodosToSend(todos, data.todoAlerts ?? [], {
    ackedAt: data.todosAckedAt,
  });

  // 대화창에서 넣은 번호가 우선이고, 없으면 환경변수(OWNER_ALERT_PHONE)로
  // 떨어진다 — 이미 등록해 둔 번호가 있으면 아무것도 안 해도 알림이 나가야 한다.
  const phone = data.ownerAlertPhone?.trim() || process.env.OWNER_ALERT_PHONE?.trim();
  if (!phone) {
    // 번호가 없으면 보낼 수 없다. 기록은 갱신하지 않는다 — 번호를 넣는 순간
    // 밀린 일이 있으면 바로 한 통 가야 하기 때문이다.
    return { sent: 0, skippedReason: todos.length > 0 ? "OWNER_PHONE_UNSET" : undefined };
  }

  let sent = 0;
  const failed = new Set<string>();
  if (toSend.length > 0) {
    const { sendSms } = await import("@/lib/send-sms");
    for (const todo of toSend) {
      const result = await sendSms(phone, todo.message, "jarvis-owner-todo", {
        // 사장님이 직접 등록한 본인 번호다 — 미국(+1) 전용 가드 대상이 아니다.
        usRecipientsOnly: false,
      });
      if (result.ok) sent += 1;
      else {
        failed.add(todo.kind);
        console.warn("[jarvis] 사장님 알림 실패:", result.error);
      }
    }
  }

  // 실제로 나간 것만 "보냄"으로 기록한다. 실패한 종류는 마지막 발송 시각을
  // 갱신하지 않아야 다음 사이클에 곧바로 다시 시도된다 — 한 번 실패했다고
  // 10분을 더 기다리면 그만큼 발송기한에 가까워진다.
  const prev = new Map((data.todoAlerts ?? []).map((a) => [a.kind, a]));
  data.todoAlerts = nextState.map((n) => (failed.has(n.kind) ? (prev.get(n.kind) ?? n) : n));
  await saveStore(store);
  return { sent };
}

/** "확인했어" — 되풀이 문자를 멈춘다 */
export async function ackOwnerTodos(merchantId: string): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  data.todosAckedAt = new Date().toISOString();
  await saveStore(store);
}

/** 월 목표 순이익을 바꾼다 — 소싱량이 여기서 역산된다 */
export async function setMonthlyGoal(merchantId: string, goalKrw: number): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  data.monthlyGoalKrw = goalKrw;
  // 목표가 바뀌면 필요한 SKU 수가 달라진다. 오늘치 후보를 다시 만들게 한다.
  data.consignmentDate = undefined;
  data.consignmentPicks = undefined;
  await saveStore(store);
}

export async function getMerchantGoalKrw(merchantId: string): Promise<number> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const { getMonthlyGoalKrw } = await import("./seller-engine/goal-engine");
  return data.monthlyGoalKrw ?? getMonthlyGoalKrw();
}

// ── 지금 뭐 하는 중인지 ────────────────────────────────────────

/**
 * 자비스가 지금 하고 있는 일을 기록한다.
 *
 * 서버리스라 요청마다 다른 인스턴스에 붙을 수 있어서, 메모리에 두면 화면이
 * 못 읽는다. 그래서 저장소에 쓴다. 대신 키워드 하나마다 쓰면 저장소가
 * 못 버티므로 **몇 개마다 한 번**만 갱신한다.
 */
export async function setJarvisActivity(
  merchantId: string,
  activity: { label: string; detail?: string; done?: boolean },
): Promise<void> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const now = new Date().toISOString();
  data.activity = {
    label: activity.label,
    detail: activity.detail,
    startedAt: data.activity && !data.activity.done ? data.activity.startedAt : now,
    updatedAt: now,
    done: activity.done ?? false,
  };
  await saveStore(store);
}

/** 오래된 활동은 "하는 중"으로 보이면 안 된다 — 죽은 요청의 잔해다 */
const ACTIVITY_STALE_MS = 3 * 60 * 1000;

export async function getJarvisActivity(merchantId: string) {
  const store = await loadStore();
  const data = merchantData(store, merchantId);
  const a = data.activity;
  if (!a || a.done) return null;
  if (Date.now() - Date.parse(a.updatedAt) > ACTIVITY_STALE_MS) return null;
  return a;
}


// ── 도매꾹 직접 발굴 ──────────────────────────────────────────

/** 표본을 무한정 쌓지 않는다 — 오래된 건 밀어낸다 */
const MAX_DISCOVERED_PRODUCTS = 800;

/**
 * 도매꾹·도매매를 직접 훑어 실측 시장 표본을 쌓는다.
 *
 * ★ 왜 소싱 캐시를 깨는가
 *
 * 픽은 하루 한 번만 만들어지고 그날치가 캐시된다. 그대로 두면 새로 발굴한
 * 상품이 **내일**에야 후보가 된다 — 사장님이 "지금 돌려"라고 했는데 어제 만든
 * 같은 결과가 또 나오는 이유가 이것이었다. 새로 찾은 게 있으면 캐시를 버려서
 * 이번 사이클에 바로 후보로 올라오게 한다.
 */
export async function runDiscoveryForMerchant(
  merchantId: string,
  opts?: { size?: number; budgetMs?: number },
): Promise<{
  scanned: number;
  found: number;
  added: number;
  total: number;
  truncated: boolean;
  apiSilent: boolean;
  configured: boolean;
  apiError?: { code: string; message: string };
  itemFields?: string[];
  costSamples?: number[];
}> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);

  const { isDomeggookApiConfigured } = await import("./wholesale/domeggook-api");
  if (!isDomeggookApiConfigured()) {
    return {
      scanned: 0, found: 0, added: 0,
      total: data.discoveredProducts?.length ?? 0,
      truncated: false, apiSilent: true, configured: false,
    };
  }

  const { discoverWholesaleMarket } = await import("./wholesale/wholesale-discovery");
  // 저장소 쓰기를 아끼려고 몇 개마다 한 번만 갱신한다. 매 키워드마다 쓰면
  // 발굴보다 저장이 더 오래 걸린다.
  const PROGRESS_EVERY = 4;
  const result = await discoverWholesaleMarket({
    size: opts?.size ?? 24,
    cursor: data.discoveryCursor ?? 0,
    budgetMs: opts?.budgetMs ?? 40_000,
    onProgress: (p) => {
      if (p.done % PROGRESS_EVERY !== 0 && p.done !== p.total) return;
      void setJarvisActivity(merchantId, {
        label: "도매꾹 구석구석 뒤지는 중",
        detail: `${p.keyword} (${p.done}/${p.total}) · 쓸 만한 것 ${p.found}개`,
      }).catch(() => {});
    },
  });

  const existing = data.discoveredProducts ?? [];
  const byId = new Map(existing.map((p) => [p.id, p]));
  let added = 0;
  for (const p of result.products) {
    if (!byId.has(p.id)) added += 1;
    // 이미 있던 것도 새 값으로 덮는다 — 시세와 재고 상황은 계속 변한다
    byId.set(p.id, p);
  }

  // 최근 것부터 남긴다. 오래된 표본은 이미 품절이거나 시세가 어긋나 있어
  // 남겨두면 판단만 흐린다.
  const merged = [...byId.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_DISCOVERED_PRODUCTS);

  data.discoveredProducts = merged;
  data.discoveryCursor = result.nextCursor;
  data.discoveryRanAt = new Date().toISOString();
  if (result.apiSilent) data.discoverySilentAt = data.discoveryRanAt;

  // 새로 찾은 게 있으면 오늘치 픽 캐시를 버린다 — 그래야 지금 반영된다
  if (added > 0) {
    data.consignmentDate = undefined;
    data.consignmentPicks = undefined;
  }

  await saveStore(store);
  return {
    scanned: result.keywordsScanned,
    found: result.keywordsWithSupply,
    added,
    total: merged.length,
    truncated: result.truncated,
    apiSilent: result.apiSilent,
    configured: true,
    apiError: result.apiError,
    itemFields: result.itemFields,
    costSamples: result.costSamples,
  };
}


/** 심박(크론)이 모든 가맹점을 돌기 위해 필요한 목록 — 키는 넘기지 않는다 */
export async function listMerchantIds(): Promise<string[]> {
  const store = await loadStore();
  return store.merchants.map((m) => m.id);
}


// ── 반품지 자동 등록 ──────────────────────────────────────────

/** 한 번에 등록하는 반품지 수 상한 — 토스 쪽에 한꺼번에 몰아치지 않는다 */
const MAX_RETURN_LOCATIONS_PER_RUN = 8;

/**
 * 대기 중인 공급처 반품지를 토스에 직접 등록한다.
 *
 * ★ 앞선 결론이 틀렸다
 *
 * 이 프로젝트는 "토스는 반품지 등록 API를 안 준다"는 전제로 우회로를 잔뜩
 * 쌓아왔다. 그 결론은 `.../exchange-refund-location/v2`에 POST를 보내 405를
 * 받은 데서 나왔는데, **경로가 틀렸다**. 쓰기는 `/v2`가 없는 쪽이다.
 * 405는 "그 경로에 그 메서드가 없다"였지 "그런 기능이 없다"가 아니었다.
 *
 * 이제 자비스가 직접 등록한다. 사장님이 셀러센터에 들어갈 일이 없어진다.
 */
export async function autoRegisterReturnLocations(merchantId: string): Promise<{
  registered: number;
  failed: number;
  remaining: number;
  /** 우편번호가 없어 제가 못 넣은 것 — 이건 사장님 도움이 필요한 유일한 경우 */
  blockedNoZip: number;
  errors: string[];
  configured: boolean;
}> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  const account = store.accounts.find((a) => a.merchantId === merchantId);
  const data = merchantData(store, merchantId);
  const pending = data.pendingReturnAddresses ?? [];
  if (pending.length === 0) {
    return { registered: 0, failed: 0, remaining: 0, blockedNoZip: 0, errors: [], configured: true };
  }

  const config = await resolveApiConfig(
    merchantId,
    {
      accessKey: merchant?.apiAccessKey,
      secretKey: merchant?.apiSecretKey,
      sandbox: merchant?.apiSandbox,
    },
    account?.email,
  );
  if (!config) {
    return {
      registered: 0, failed: 0, remaining: pending.length,
      blockedNoZip: 0, errors: [], configured: false,
    };
  }

  const { createReturnLocation } = await import("./api/return-location-create");
  const { splitKoreanAddress } = await import("./api/return-location-matcher");

  // 기여가 큰 공급처부터 등록한다 — 먼저 풀리는 쪽이 돈이 큰 쪽이어야 한다
  const ordered = [...pending].sort((a, b) => b.monthlyValueKrw - a.monthlyValueKrw);
  const target = ordered.slice(0, MAX_RETURN_LOCATIONS_PER_RUN);

  const errors: string[] = [];
  const doneKeys = new Set<string>();
  let blockedNoZip = 0;
  for (const p of target) {
    const parts = splitKoreanAddress(p.address);
    if (!parts.zipCode) {
      // 우편번호가 없으면 등록이 거절된다. 지어내면 반품이 엉뚱한 데로 간다 —
      // 그건 상품값을 통째로 잃는 일이고 되돌릴 방법이 없다. 그래서 이 건은
      // 사장님께 넘긴다. 자동화가 못 하는 유일한 지점이므로 숨기지 않는다.
      blockedNoZip += 1;
      errors.push(`${p.supplierNick ?? p.supplierId}: 공급처 안내에 우편번호가 없음 — ${p.address}`);
      continue;
    }
    const res = await createReturnLocation(merchantId, config, {
      zipCode: parts.zipCode,
      address: parts.address,
      detailAddress: parts.detailAddress,
    });
    if (res.ok) doneKeys.add(p.key);
    else errors.push(`${p.supplierNick ?? p.supplierId}: ${res.reason}`);
  }

  const remaining = pending.filter((p) => !doneKeys.has(p.key));
  data.pendingReturnAddresses = remaining;
  await saveStore(store);

  return {
    registered: doneKeys.size,
    failed: target.length - doneKeys.size,
    remaining: remaining.length,
    blockedNoZip,
    errors: errors.slice(0, 5),
    configured: true,
  };
}


// ── 상점 운영 (24시간) ────────────────────────────────────────

/**
 * 올린 상품을 손본다 — 안 팔리면 내리고, 바닥에서도 안 팔리면 숨긴다.
 *
 * ★ 실측 원가가 없으면 손대지 않는다
 *
 * 얼마까지 내려도 되는지는 원가에서만 나온다. 원가를 모르는 상품은 얼마를
 * 내려야 남는지도 모르므로 건드리지 않는다 — 감으로 내리면 팔릴수록 손해가
 * 나는데 그걸 알아채는 데 몇 주가 걸린다.
 */
export async function runStoreOperations(merchantId: string): Promise<{
  configured: boolean;
  cuts: number;
  hides: number;
  holds: number;
  failures: string[];
  notes: string[];
}> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  const account = store.accounts.find((a) => a.merchantId === merchantId);
  const data = merchantData(store, merchantId);

  const config = await resolveApiConfig(
    merchantId,
    {
      accessKey: merchant?.apiAccessKey,
      secretKey: merchant?.apiSecretKey,
      sandbox: merchant?.apiSandbox,
    },
    account?.email,
  );
  if (!config) {
    return { configured: false, cuts: 0, hides: 0, holds: 0, failures: [], notes: [] };
  }

  const { buildListedSkus } = await import("./seller-engine/listed-sku-reader");
  const { planStoreOperations } = await import("./seller-engine/store-operations");
  const { updateSalePrice, hideProduct } = await import("./api/product-ops");

  // 토스에서 현재 가격과 옵션 ID를 읽어 온다. 우리 기록이 아니라 토스가
  // 정답이다 — 사장님이 셀러센터에서 직접 바꿨을 수 있고, 그걸 모른 채
  // 우리 값으로 계산하면 엉뚱한 가격으로 덮어쓰게 된다.
  const { listProductItems } = await import("./api/product-ops");
  const productIds = [
    ...new Set(
      (data.listingDrafts ?? [])
        .filter((d) => d.status === "published" && d.tossProductId != null)
        .map((d) => d.tossProductId!),
    ),
  ].slice(0, 40);

  const live: import("./seller-engine/listed-sku-reader").LiveItem[] = [];
  for (const productId of productIds) {
    for (const item of await listProductItems(merchantId, config, productId)) {
      live.push({
        productId,
        itemId: item.itemId,
        itemName: item.itemName,
        salePrice: item.salePrice,
        originPrice: item.originPrice,
      });
    }
  }

  const skus = buildListedSkus(data, live);
  if (skus.length === 0) {
    return { configured: true, cuts: 0, hides: 0, holds: 0, failures: [], notes: ["운영할 상품이 아직 없습니다"] };
  }

  const plan = planStoreOperations(skus);
  const failures: string[] = [];
  const now = new Date().toISOString();
  let cuts = 0;
  let hides = 0;

  for (const c of plan.cuts) {
    const res = await updateSalePrice(merchantId, config, {
      productId: c.sku.productId,
      productItemId: c.sku.productItemId,
      salePriceKrw: c.toPriceKrw,
    });
    if (res.ok) {
      cuts += 1;
      recordPriceChange(data, c.sku.productItemId, c.toPriceKrw, now);
    } else {
      failures.push(`${c.sku.name}: ${res.reason}`);
    }
  }

  for (const h of plan.hides) {
    const res = await hideProduct(merchantId, config, h.sku.productId);
    if (res.ok) {
      hides += 1;
      markHidden(data, h.sku.productId, now);
    } else {
      failures.push(`${h.sku.name}: ${res.reason}`);
    }
  }

  await saveStore(store);
  return {
    configured: true,
    cuts,
    hides,
    holds: plan.holds,
    failures: failures.slice(0, 5),
    notes: [
      ...plan.cuts.slice(0, 3).map((c) => `${c.sku.name} → ${c.toPriceKrw.toLocaleString()}원 (${c.reason})`),
      ...plan.hides.slice(0, 2).map((h) => `${h.sku.name} 숨김 (${h.reason})`),
    ],
  };
}

/** 가격을 만진 사실을 초안에 남긴다 — 다음 사이클이 쿨다운을 지키려면 필요하다 */
function recordPriceChange(
  data: MerchantData,
  productItemId: number,
  priceKrw: number,
  atIso: string,
): void {
  for (const d of data.listingDrafts ?? []) {
    if (d.tossProductItemId !== productItemId) continue;
    d.listingPayload.salePrice = priceKrw;
    d.lastPriceChangeAt = atIso;
    d.updatedAt = atIso;
  }
}

function markHidden(data: MerchantData, productId: number, atIso: string): void {
  for (const d of data.listingDrafts ?? []) {
    if (d.tossProductId !== productId) continue;
    d.hiddenAt = atIso;
    d.updatedAt = atIso;
  }
}


/**
 * 사장님이 직접 알려준 반품지를 등록한다.
 *
 * 자동 등록이 못 하는 유일한 경우가 **우편번호가 공급처 안내에 없는 것**이다.
 * 우편번호는 지어낼 수 없다 — 틀리면 반품 택배가 다른 동네로 가고, 그건
 * 상품값을 통째로 잃는 일이라 되돌릴 방법이 없다. 그래서 그때만 사장님께
 * 물어보고, 받은 값으로 여기서 마무리한다.
 */
export async function addReturnLocationManually(
  merchantId: string,
  input: { zipCode: string; address: string; detailAddress: string },
): Promise<{ ok: boolean; reason?: string; cleared: number }> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.id === merchantId);
  const account = store.accounts.find((a) => a.merchantId === merchantId);
  const data = merchantData(store, merchantId);

  const config = await resolveApiConfig(
    merchantId,
    {
      accessKey: merchant?.apiAccessKey,
      secretKey: merchant?.apiSecretKey,
      sandbox: merchant?.apiSandbox,
    },
    account?.email,
  );
  if (!config) return { ok: false, reason: "토스 API 미연동", cleared: 0 };

  const { createReturnLocation } = await import("./api/return-location-create");
  const res = await createReturnLocation(merchantId, config, input);
  if (!res.ok) return { ok: false, reason: res.reason, cleared: 0 };

  // 이 주소를 기다리던 공급처는 대기 목록에서 뺀다 — 같은 건물이면 같은
  // 반품지로 처리된다(층·호가 달라도 반품은 같은 곳으로 간다).
  const { compareAddresses } = await import("./api/return-location-matcher");
  const pending = data.pendingReturnAddresses ?? [];
  // compareAddresses는 같으면 강도를, 다르면 null을 준다. null인 것만 남긴다.
  const remaining = pending.filter((p) => compareAddresses(p.address, input.address) == null);
  const cleared = pending.length - remaining.length;
  data.pendingReturnAddresses = remaining;
  await saveStore(store);

  return { ok: true, cleared };
}


// ── 발주 자동화 — 도매꾹 Private API ────────────────────────────

/** 한 사이클에 발주하는 최대 건수 — 로그인 실패나 잔액 문제가 한꺼번에
 * 수십 건을 물어뜯지 않게 상한을 둔다 */
const MAX_ORDERS_PER_CYCLE = 8;

/**
 * 발주 대기 주문을 도매꾹/도매매에 실제로 발주한다.
 *
 * ★ 여기까지 오게 된 경위
 *
 * 처음엔 "도매매는 발주 API가 없다"고 판단했다. 공개 문서만 보고 내린
 * 결론이었다. 실제로는 Private API 승인을 받아야 열리는 자리에 있었다 —
 * 사장님 계정이 승인된 뒤에야 setOrder가 문서에 나타났다.
 *
 * ★ 이머니가 다른 무엇보다 우선한다
 *
 * 잔액이 부족하면 그 뒤로 뭘 시도해도 다 같은 이유로 실패한다. 그래서
 * 한 건이라도 잔액 부족으로 실패하면 **그 사이클은 거기서 멈춘다** —
 * 나머지 건을 계속 시도해봐야 잔액만 반복 조회하고 결과는 똑같다.
 */
export async function autoPlaceWholesaleOrders(merchantId: string): Promise<{
  configured: boolean;
  placed: number;
  failed: number;
  insufficientBalance: boolean;
  errors: string[];
}> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);

  const { isDomeggookOrderingConfigured, loginDomeggook, placeWholesaleOrder } = await import(
    "./wholesale/domeggook-order-api"
  );
  if (!isDomeggookOrderingConfigured()) {
    return { configured: false, placed: 0, failed: 0, insufficientBalance: false, errors: [] };
  }

  const jobs = data.fulfillmentJobs ?? [];
  // 자비스가 이미 공급처를 찾아 배송지까지 준비해둔(wholesale_ready) 건 중,
  // 발주 API가 실제로 지원하는 두 플랫폼만 자동으로 넣는다. 수입판매(1688 등)는
  // 애초에 이 API 대상이 아니라 사람이 하는 게 맞다.
  const targets = jobs.filter(
    (j) =>
      j.status === "wholesale_ready" &&
      j.itemNo != null &&
      (j.wholesalePlatform === "domeggook" || j.wholesalePlatform === "domeme"),
  ).slice(0, MAX_ORDERS_PER_CYCLE);

  if (targets.length === 0) {
    return { configured: true, placed: 0, failed: 0, insufficientBalance: false, errors: [] };
  }

  // 로그인 가능 여부는 백오프가 걸린 공용 점검을 통해 확인한다 — 발주 경로가
  // 따로 로그인을 재시도하면 백오프가 무의미해지고, 실패가 쌓여 계정이 잠긴다.
  const { checkOrderingHealth } = await import("./wholesale/domeggook-order-api");
  const health = await checkOrderingHealth();
  if (!health.loginOk) {
    return {
      configured: true,
      placed: 0,
      failed: targets.length,
      insufficientBalance: false,
      errors: [`로그인 실패: ${health.reason ?? "원인 미상"}`],
    };
  }

  const login = await loginDomeggook();
  if (!login.ok) {
    return {
      configured: true,
      placed: 0,
      failed: targets.length,
      insufficientBalance: false,
      errors: [`로그인 실패: ${login.reason}`],
    };
  }

  let placed = 0;
  let insufficientBalance = false;
  const errors: string[] = [];

  for (const job of targets) {
    // 잔액 부족으로 한 번 걸리면 나머지는 다 같은 이유로 실패한다 —
    // 헛되이 반복 호출하지 않는다.
    if (insufficientBalance) break;

    const idx = jobs.findIndex((x) => x.id === job.id);
    if (idx < 0) continue;

    const market = job.wholesalePlatform === "domeggook" ? "dome" : "supply";
    const res = await placeWholesaleOrder({
      session: login.session,
      itemNo: job.itemNo!,
      market,
      quantity: job.quantity,
      receiver: job.customer,
    });

    if (res.ok) {
      jobs[idx] = {
        ...jobs[idx],
        status: "wholesale_ordered",
        wholesaleOrderedAt: new Date().toISOString(),
        wholesaleOrderNo: res.orderNo,
        updatedAt: new Date().toISOString(),
      };
      placed += 1;
    } else {
      errors.push(`${job.productName}: ${res.reason}`);
      if (res.insufficientBalance) insufficientBalance = true;
    }
  }

  data.fulfillmentJobs = jobs;
  // 이번에 하나라도 성공했으면 잔액 문제는 해소된 것이다 — 계속 남겨두면
  // 이미 해결된 뒤에도 "이머니 부족" 알림이 되풀이된다.
  if (placed > 0) data.emoneyInsufficientAt = undefined;
  else if (insufficientBalance) data.emoneyInsufficientAt = data.emoneyInsufficientAt ?? new Date().toISOString();
  await saveStore(store);

  return {
    configured: true,
    placed,
    failed: targets.length - placed,
    insufficientBalance,
    errors: errors.slice(0, 5),
  };
}


/**
 * 발주 준비 상태 점검 — 주문 없이, 아무것도 사지 않고 확인한다.
 *
 * 이 확인이 없으면 첫 고객 주문이 곧 첫 테스트가 된다. 로그인이나 잔액에
 * 문제가 있으면 고객이 기다리는 동안 알게 되고, 그 사이 발송기한이 흘러간다.
 */
export async function checkOrderingReadiness(): Promise<{
  configured: boolean;
  loginOk: boolean;
  balanceKrw: number | null;
  reason?: string;
}> {
  const { checkOrderingHealth } = await import("./wholesale/domeggook-order-api");
  return checkOrderingHealth();
}


/**
 * 수익 파이프라인이 어느 단계에서 멈춰 있는지 한눈에 본다.
 *
 * ★ 왜 단계별로 세나
 *
 * "이번 달 얼마 벌었다"만 보면 0원일 때 원인을 알 수 없다. 발굴이 안 되는
 * 건지, 후보는 있는데 게이트에서 걸리는 건지, 등록은 됐는데 안 팔리는
 * 건지 — 고쳐야 할 곳이 매번 다르다. 단계별 숫자가 있으면 어디가 막혔는지
 * 바로 보인다.
 */
export async function getPipelineFunnel(merchantId: string): Promise<{
  discovered: number;
  picks: number;
  certified: number;
  drafts: number;
  published: number;
  orders: number;
  bottleneck: string;
  /** 93% 신뢰도 게이트에서 확실성 게이트에 닿기도 전에 잘린 수 */
  droppedBeforeGate: number;
  /** 확실성 게이트에서 어떤 근거가 몇 번 걸렸나 */
  blockers: Array<{ label: string; count: number }>;
  /** 93% 인증 게이트에서 실제로 실패한 항목 — 인증 0의 진짜 원인 */
  certGateFailures: Array<{ label: string; count: number; samples: string[] }>;
}> {
  const store = await loadStore();
  const data = merchantData(store, merchantId);

  const discovered = data.discoveredProducts?.length ?? 0;
  const picks = data.consignmentPicks?.length ?? 0;
  const drafts = (data.listingDrafts ?? []).length;
  const published = (data.listingDrafts ?? []).filter((d) => d.status === "published").length;
  const orders = (data.fulfillmentJobs ?? []).length;

  const { filterJarvisCertifiedPicks } = await import("./seller-engine/jarvis-engine");
  const { filterCertainPicks } = await import("./seller-engine/certainty-gate");
  const allPicks = data.consignmentPicks ?? [];
  const scored = filterJarvisCertifiedPicks(allPicks);
  const gate = filterCertainPicks(scored);
  const certified = gate.certain.length;

  // 어느 근거에서 걸리는지 세어둔다.
  //
  // "게이트 통과 0"만 알면 기준을 낮추고 싶어지는데, 그건 추정치에 광고비를
  // 태우는 길이다. 어떤 항목이 몇 번 걸렸는지 보이면 고쳐야 할 곳이
  // 드러난다 — 대개 기준이 아니라 입력 데이터 쪽이다.
  const blockerCounts: Record<string, number> = {};
  for (const r of gate.rejected) {
    for (const b of r.verdict.blockers) {
      blockerCounts[b] = (blockerCounts[b] ?? 0) + 1;
    }
    if (r.verdict.blockers.length === 0) {
      // blockers는 비었는데 통과 못 했다면 공급처·원가가 실측이 아닌 경우다
      blockerCounts["공급처·원가가 실측이 아님"] =
        (blockerCounts["공급처·원가가 실측이 아님"] ?? 0) + 1;
    }
  }
  // 93% 신뢰도 게이트에서 먼저 잘린 것도 별도로 센다 — 확실성 게이트까지
  // 오지도 못한 것이므로 원인이 다르다.
  const droppedBeforeGate = allPicks.length - scored.length;

  // ★ 인증이 왜 안 되는지 — 신뢰도 숫자만으로는 알 수 없다
  //
  // 인증 실패 시 신뢰도는 92%로 **덮어씌워진다**(JARVIS_UNCERTIFIED_CAP).
  // 그래서 로그에 92%가 찍히면 "1%만 더" 같아 보이지만 실제로는 어떤
  // 게이트가 통째로 실패한 것이고, 그 항목을 안 보면 영원히 못 고친다.
  // 실제로 등록이 0인 채로 초안만 쌓인 원인이 이거였다.
  const certGateCounts: Record<string, number> = {};
  // 실제 측정값도 같이 모은다 — "종합점수 미달"만으로는 78인지 40인지 모른다.
  // 기준에 가까우면 입력 데이터를 손보면 되고, 한참 멀면 기준이나 계산이
  // 잘못된 것이다. 그 둘은 완전히 다른 처방이라 숫자 없이는 판단이 안 된다.
  const certGateDetails: Record<string, string[]> = {};
  for (const p of allPicks) {
    if (p.jarvis?.certified) continue;
    for (const g of p.jarvis?.gates ?? []) {
      if (g.passed) continue;
      certGateCounts[g.label] = (certGateCounts[g.label] ?? 0) + 1;
      (certGateDetails[g.label] ??= []).push(g.detail);
    }
  }
  const certGateFailures = Object.entries(certGateCounts)
    .map(([label, count]) => ({ label, count, samples: (certGateDetails[label] ?? []).slice(0, 4) }))
    .sort((a, b) => b.count - a.count);

  // 가장 앞에서 끊긴 곳이 진짜 병목이다. 뒤쪽만 보면 "등록이 0개"라고만
  // 알게 되는데, 원인은 그보다 앞 단계에 있는 경우가 대부분이다.
  const bottleneck =
    discovered === 0
      ? "발굴 0 — 도매꾹에서 상품을 못 가져오고 있음"
      : picks === 0
        ? "후보 0 — 발굴한 상품이 소싱 후보로 안 올라감"
        : certified === 0
          ? "확실성 게이트 통과 0 — 후보는 있으나 근거가 실측이 아님"
          : published === 0
            ? "등록 0 — 통과한 후보가 토스에 안 올라감"
            : orders === 0
              ? "주문 0 — 등록은 됐고 이제 노출·판매를 기다리는 단계"
              : "정상 — 주문까지 흐르고 있음";

  return {
    discovered,
    picks,
    certified,
    drafts,
    published,
    orders,
    bottleneck,
    droppedBeforeGate,
    certGateFailures,
    blockers: Object.entries(blockerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count })),
  };
}


/**
 * 토스 연동이 되어 있는 가맹점인가.
 *
 * 크론은 60초 안에 여러 가맹점을 다 돌아야 한다. 연동이 없는 가맹점(데모 등)에
 * 시간을 쓰면 정작 돈이 걸린 가맹점이 마감시각에 밀려 건너뛰어진다.
 */
export async function merchantHasTossApi(merchantId: string): Promise<boolean> {
  const store = await loadStore();
  const m = store.merchants.find((x) => x.id === merchantId);
  return Boolean(m?.apiAccessKey && m?.apiSecretKey);
}
