import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "@/lib/kv-safe";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { GIU_BRAND } from "./brand";
import type {
  GiuAccount,
  GiuAccountRole,
  GiuBox,
  GiuBoxStatus,
  GiuCategory,
  GiuChatMessage,
  GiuMarket,
  GiuMerchant,
  GiuPaymentMethod,
  GiuOrderStatus,
  GiuOrderStatusLog,
  GiuReservation,
  GiuReservationStatus,
  GiuReview,
  GiuStore,
  GiuWaitlistEntry,
} from "./types";
import { getDistrictLabel, isKrDistrict } from "./districts";
import {
  notifyPickupCode,
  notifyMerchantNewOrder,
  notifyMerchantExtensionRequest,
  notifyCustomerExtensionApproved,
  notifyCustomerExtensionRejected,
} from "./notify";
import { defaultPickupWindow, formatPickupWindow, slugify } from "./format";
import { buildPickupWindow, dayOffsetFromIso, hourFromIso } from "./publish-schedule";
import { resolveGiuPaymentBackend } from "./payments";
import { vndToUsdCents } from "./lemon-squeezy-giu";
import { calculateRefundSplit } from "./refund";
import {
  canRequestExtensionInApp,
  computePickupExpiresAt,
  defaultPromiseUntil,
  isPickupQrValid,
  merchantOrderDeepLink,
  noShowReviewEligible,
  reservationDeepLink,
  resolvePickupPolicy,
  shouldMarkNotPickedUp,
} from "./pickup-policy";
import {
  appendOrderStatusLog,
  canCustomerRequestPickupChange,
  chatAllowedForStatus,
  listOrderStatusLogsForReservation,
  migrateLegacyOrderStatus,
  transitionOrderStatus,
} from "./order-status";
import { resolvePlatformSettings, DEFAULT_PLATFORM_SETTINGS } from "./platform-settings";
import {
  isPickupChangeAllowedForBox,
  isPickupChangeWithinLimit,
  maxPickupChangesPerOrder,
} from "./pickup-change";
import { computeCustomerRisk, computeMerchantRisk } from "./risk-profile";
import { runGiuPickupReminders } from "./pickup-reminders";
import {
  SEED_BOXES,
  SEED_CO2_KG,
  SEED_DEMO_CUSTOMER,
  SEED_DEMO_MERCHANT,
  SEED_DEMO_MERCHANT_ACCOUNT,
  SEED_MERCHANTS,
  SEED_RESCUED_COUNT,
  SEED_SAVED_VND,
} from "./seed";

const DATA_DIR = join(process.cwd(), ".data", "giu");
const STORE_FILE = join(DATA_DIR, "store.json");
const KV_STORE_KEY = "giu:store:v1";

function kvConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim(),
  );
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function reservationCode(existing: Iterable<string>): string {
  const taken = new Set(existing);
  for (let i = 0; i < 40; i++) {
    const code = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    if (!taken.has(code)) return code;
  }
  return String(Math.floor(Math.random() * 900) + 100);
}

function normalizePickupCodeInput(raw: string): string {
  return raw.trim().replace(/\s/g, "");
}

function isValidPickupCode(code: string): boolean {
  return /^\d{3}$/.test(code) || /^[A-F0-9]{6}$/i.test(code);
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s/g, "").replace(/-/g, "");
  if (p.startsWith("+82")) p = `0${p.slice(3)}`;
  else if (p.startsWith("82") && p.length >= 10) p = `0${p.slice(2)}`;
  return p;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountEmailTaken(store: GiuStore, email: string, role: GiuAccountRole): boolean {
  return store.accounts.some((a) => a.email === email && a.role === role);
}

function accountPhoneTaken(store: GiuStore, phone: string, role: GiuAccountRole): boolean {
  return store.accounts.some((a) => a.phone === phone && a.role === role);
}

function merchantPhoneTaken(store: GiuStore, phone: string, excludeMerchantId?: string): boolean {
  return store.merchants.some(
    (m) => normalizePhone(m.phone) === phone && m.id !== excludeMerchantId,
  );
}

function platformOf(store: GiuStore) {
  return resolvePlatformSettings(store.platformSettings);
}

function policyFor(store: GiuStore, merchant?: GiuMerchant | null) {
  return resolvePickupPolicy(merchant, store.platformSettings);
}

function defaultStore(): GiuStore {
  return {
    merchants: [SEED_DEMO_MERCHANT, ...SEED_MERCHANTS],
    boxes: [...SEED_BOXES],
    reservations: [],
    waitlist: [],
    accounts: [SEED_DEMO_CUSTOMER, SEED_DEMO_MERCHANT_ACCOUNT],
    reviews: [],
    chatMessages: [],
    orderStatusLogs: [],
    platformSettings: { ...DEFAULT_PLATFORM_SETTINGS },
    customerFavorites: {},
  };
}

function ensureDemoAccounts(store: GiuStore): GiuStore {
  let next = store;
  if (!next.accounts.some((a) => a.id === SEED_DEMO_CUSTOMER.id)) {
    next = { ...next, accounts: [SEED_DEMO_CUSTOMER, ...next.accounts] };
  }
  if (!next.accounts.some((a) => a.id === SEED_DEMO_MERCHANT_ACCOUNT.id)) {
    next = { ...next, accounts: [SEED_DEMO_MERCHANT_ACCOUNT, ...next.accounts] };
  }
  if (!next.merchants.some((m) => m.id === SEED_DEMO_MERCHANT.id)) {
    next = { ...next, merchants: [SEED_DEMO_MERCHANT, ...next.merchants] };
  }
  return next;
}

const VIETNAMESE_TEXT =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]|Quận|TP\.HCM|HCM|Nguyễn|Huệ/i;

function looksVietnamese(text: string): boolean {
  return VIETNAMESE_TEXT.test(text);
}

function defaultKrAddress(district: GiuMerchant["district"]): string {
  const id = isKrDistrict(district) ? district : "icn_yeonsu";
  const label = getDistrictLabel(id).split(" (")[0];
  return `인천 ${label} (주소를 가게 설정에서 수정해 주세요)`;
}

function migrateMerchant(merchant: GiuMerchant): GiuMerchant {
  const district = isKrDistrict(merchant.district) ? merchant.district : "icn_yeonsu";
  const address = looksVietnamese(merchant.address)
    ? defaultKrAddress(district)
    : merchant.address;
  return {
    ...merchant,
    accountId: merchant.accountId ?? `acc_legacy_${merchant.id}`,
    market: "kr",
    district,
    address,
  };
}

function migrateAccount(account: GiuAccount): GiuAccount {
  return { ...account, market: "kr" };
}

function storeNeedsDemoAccounts(raw: Partial<GiuStore>): boolean {
  const accounts = raw.accounts ?? [];
  const merchants = raw.merchants ?? [];
  return (
    !accounts.some((a) => a.id === SEED_DEMO_CUSTOMER.id) ||
    !accounts.some((a) => a.id === SEED_DEMO_MERCHANT_ACCOUNT.id) ||
    !merchants.some((m) => m.id === SEED_DEMO_MERCHANT.id)
  );
}

function storeNeedsKrMigration(raw: Partial<GiuStore>): boolean {
  const merchants = raw.merchants ?? [];
  const accounts = raw.accounts ?? [];
  return (
    merchants.some(
      (m) =>
        m.market !== "kr" ||
        !isKrDistrict(m.district) ||
        looksVietnamese(m.address),
    ) || accounts.some((a) => a.market !== "kr")
  );
}

function migrateReservation(reservation: GiuReservation): GiuReservation {
  const paymentStatus = reservation.paymentStatus ?? "paid";
  const status = migrateLegacyOrderStatus(
    reservation.status as string,
    paymentStatus,
    reservation.settlementStatus,
  );
  return {
    ...reservation,
    customerId: reservation.customerId ?? "legacy",
    paymentStatus,
    status,
    platformFeeVnd:
      reservation.platformFeeVnd ??
      Math.round(reservation.totalVnd * GIU_BRAND.commissionRate),
    paymentExpiresAt: reservation.paymentExpiresAt,
    settlementStatus:
      reservation.settlementStatus ??
      (paymentStatus === "paid" ? "held" : undefined),
    pickupChangeCount: reservation.pickupChangeCount ?? 0,
  };
}

function ensureOrderLogs(store: GiuStore): GiuOrderStatusLog[] {
  if (!store.orderStatusLogs) store.orderStatusLogs = [];
  return store.orderStatusLogs;
}

function logTransition(
  store: GiuStore,
  res: GiuReservation,
  toStatus: GiuOrderStatus,
  actor: { role: "customer" | "merchant" | "system" | "admin"; id: string; reason?: string },
): boolean {
  return transitionOrderStatus(ensureOrderLogs(store), res, toStatus, actor);
}

function normalizeStore(raw: Partial<GiuStore>): GiuStore {
  const base = defaultStore();
  const store: GiuStore = {
    merchants: (raw.merchants?.length ? raw.merchants : base.merchants).map(migrateMerchant),
    boxes: raw.boxes?.length ? raw.boxes : base.boxes,
    reservations: (raw.reservations ?? []).map(migrateReservation),
    waitlist: raw.waitlist ?? [],
    accounts: (raw.accounts ?? base.accounts).map(migrateAccount),
    reviews: raw.reviews ?? [],
    chatMessages: raw.chatMessages ?? [],
    orderStatusLogs: raw.orderStatusLogs ?? [],
    platformSettings: raw.platformSettings ?? { ...DEFAULT_PLATFORM_SETTINGS },
    customerFavorites: raw.customerFavorites ?? {},
  };
  return ensureDemoAccounts(store);
}

async function loadStore(): Promise<GiuStore> {
  if (kvConfigured()) {
    const raw = await kvGetSafe<GiuStore>(KV_STORE_KEY);
    if (raw) {
      const store = normalizeStore(raw);
      if (storeNeedsKrMigration(raw) || storeNeedsDemoAccounts(raw)) await saveStore(store);
      return store;
    }
    const store = defaultStore();
    await saveStore(store);
    return store;
  }

  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<GiuStore>;
    const store = normalizeStore(parsed);
    if (storeNeedsKrMigration(parsed) || storeNeedsDemoAccounts(parsed)) await saveStore(store);
    return store;
  } catch {
    const store = defaultStore();
    await saveStore(store);
    return store;
  }
}

async function saveStore(store: GiuStore): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if (kvConfigured()) {
        await kv.set(KV_STORE_KEY, store);
        return;
      }

      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(STORE_FILE, JSON.stringify(store, null, 2));
      return;
    } catch {
      if (attempt >= 3) return;
      await new Promise((r) => setTimeout(r, 35 * (attempt + 1)));
    }
  }
}

export async function getGiuStore(): Promise<GiuStore> {
  return loadStore();
}

export async function getAccountById(id: string): Promise<GiuAccount | null> {
  const store = await loadStore();
  return store.accounts.find((a) => a.id === id) ?? null;
}

export async function getAccountByEmail(email: string): Promise<GiuAccount | null> {
  const store = await loadStore();
  const normalized = normalizeEmail(email);
  return store.accounts.find((a) => a.email === normalized) ?? null;
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  name: string;
  phone: string;
  market?: GiuMarket;
}): Promise<{ account: GiuAccount } | { error: string }> {
  const store = await loadStore();
  const email = normalizeEmail(input.email);
  if (accountEmailTaken(store, email, "customer")) {
    return { error: "이미 등록된 이메일입니다" };
  }
  const phone = normalizePhone(input.phone);
  if (accountPhoneTaken(store, phone, "customer")) {
    return { error: "이미 등록된 전화번호입니다" };
  }
  const account: GiuAccount = {
    id: newId("acc"),
    role: "customer",
    email,
    phone,
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    market: input.market ?? "kr",
    createdAt: new Date().toISOString(),
  };
  store.accounts.unshift(account);
  await saveStore(store);
  return { account };
}

export async function registerMerchantAccount(input: {
  email: string;
  password: string;
  ownerName: string;
  storeName: string;
  phone: string;
  category: GiuMerchant["category"];
  district: GiuMerchant["district"];
  address: string;
  zalo?: string;
  market?: GiuMarket;
}): Promise<{ account: GiuAccount; merchant: GiuMerchant } | { error: string }> {
  const store = await loadStore();
  const email = normalizeEmail(input.email);
  if (accountEmailTaken(store, email, "merchant")) {
    return { error: "이미 등록된 이메일입니다" };
  }
  const phone = normalizePhone(input.phone);
  if (accountPhoneTaken(store, phone, "merchant")) {
    return { error: "이미 등록된 전화번호입니다" };
  }
  if (merchantPhoneTaken(store, phone)) {
    return { error: "이 전화번호의 가게가 이미 있습니다 — 로그인하세요" };
  }

  const ownerName = input.ownerName.trim();
  const storeName = input.storeName.trim();

  const account: GiuAccount = {
    id: newId("acc"),
    role: "merchant",
    email,
    phone,
    passwordHash: await hashPassword(input.password),
    name: ownerName,
    market: input.market ?? "kr",
    createdAt: new Date().toISOString(),
  };

  let slug = slugify(storeName);
  if (store.merchants.some((m) => m.slug === slug)) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }

  const merchant: GiuMerchant = {
    id: newId("mer"),
    accountId: account.id,
    name: storeName,
    slug,
    category: input.category,
    district: input.district,
    address: input.address.trim(),
    phone,
    zalo: input.zalo?.trim(),
    verified: false,
    rating: 0,
    reviewCount: 0,
    rescuedBoxes: 0,
    market: input.market ?? "kr",
    createdAt: new Date().toISOString(),
  };

  account.merchantId = merchant.id;
  store.accounts.unshift(account);
  store.merchants.unshift(merchant);
  await saveStore(store);
  return { account, merchant };
}

export async function loginAccount(input: {
  email: string;
  password: string;
  role?: GiuAccountRole;
}): Promise<{ account: GiuAccount } | { error: string }> {
  const store = await loadStore();
  const email = normalizeEmail(input.email);
  const account = input.role
    ? store.accounts.find((a) => a.email === email && a.role === input.role)
    : store.accounts.find((a) => a.email === email);
  if (!account) return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  const ok = await verifyPassword(input.password, account.passwordHash);
  if (!ok) return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  return { account };
}

export async function listMerchants(filters?: {
  district?: string;
  category?: string;
}): Promise<GiuMerchant[]> {
  const store = await loadStore();
  return store.merchants.filter((m) => {
    if (filters?.district && m.district !== filters.district) return false;
    if (filters?.category && m.category !== filters.category) return false;
    return true;
  });
}

export async function getMerchant(id: string): Promise<GiuMerchant | null> {
  const store = await loadStore();
  return store.merchants.find((m) => m.id === id) ?? null;
}

export async function getMerchantByAccountId(accountId: string): Promise<GiuMerchant | null> {
  const store = await loadStore();
  return store.merchants.find((m) => m.accountId === accountId) ?? null;
}

export async function getMerchantByPhone(phone: string): Promise<GiuMerchant | null> {
  const store = await loadStore();
  const normalized = normalizePhone(phone);
  return store.merchants.find((m) => normalizePhone(m.phone) === normalized) ?? null;
}

/** @deprecated Use registerMerchantAccount */
export async function createMerchant(
  input: Omit<
    GiuMerchant,
    | "id"
    | "slug"
    | "accountId"
    | "verified"
    | "rating"
    | "reviewCount"
    | "rescuedBoxes"
    | "market"
    | "createdAt"
  >,
): Promise<GiuMerchant> {
  const store = await loadStore();
  let slug = slugify(input.name);
  if (store.merchants.some((m) => m.slug === slug)) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }
  const merchant: GiuMerchant = {
    ...input,
    id: newId("mer"),
    accountId: `acc_legacy_${randomBytes(4).toString("hex")}`,
    slug,
    verified: false,
    rating: 0,
    reviewCount: 0,
    rescuedBoxes: 0,
    market: "kr",
    createdAt: new Date().toISOString(),
  };
  store.merchants.unshift(merchant);
  await saveStore(store);
  return merchant;
}

function expireStaleBoxesInStore(store: GiuStore): boolean {
  const now = Date.now();
  let changed = false;
  for (const box of store.boxes) {
    if (box.status !== "mo") continue;
    if (new Date(box.pickupEnd).getTime() <= now) {
      box.status = "het";
      changed = true;
    }
  }
  return changed;
}

export async function listBoxes(filters?: {
  district?: string;
  category?: string;
  merchantId?: string;
  status?: GiuBoxStatus;
  openOnly?: boolean;
  /** Include sold-out / closed boxes that still haven't expired. */
  includeSoldOut?: boolean;
  /** Filter by calendar day in Seoul: 0=today, 1=tomorrow */
  dayOffset?: 0 | 1;
}): Promise<GiuBox[]> {
  const store = await loadStore();
  if (expireStaleBoxesInStore(store)) await saveStore(store);
  const now = Date.now();
  const tz = "Asia/Seoul";

  function localDayKey(iso: string): string {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
  }
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toLocaleDateString("en-CA", { timeZone: tz });

  return store.boxes
    .filter((b) => {
      if (filters?.merchantId && b.merchantId !== filters.merchantId) return false;
      if (filters?.category && b.category !== filters.category) return false;
      if (filters?.status && b.status !== filters.status) return false;
      if (filters?.openOnly) {
        if (b.status !== "mo" || b.quantityLeft <= 0) return false;
        if (new Date(b.expiresAt).getTime() < now) return false;
      } else if (filters?.includeSoldOut) {
        if (new Date(b.expiresAt).getTime() < now && b.status === "huy") return false;
      }
      if (filters?.dayOffset === 0 && localDayKey(b.pickupStart) !== todayKey) return false;
      if (filters?.dayOffset === 1 && localDayKey(b.pickupStart) !== tomorrowKey) return false;
      if (filters?.district) {
        const merchant = store.merchants.find((m) => m.id === b.merchantId);
        if (!merchant || merchant.district !== filters.district) return false;
      }
      return true;
    })
    .sort((a, b) => a.pickupStart.localeCompare(b.pickupStart));
}

export async function getBox(id: string): Promise<GiuBox | null> {
  const store = await loadStore();
  return store.boxes.find((b) => b.id === id) ?? null;
}

export async function createBox(
  input: Omit<GiuBox, "id" | "status" | "quantityLeft" | "createdAt">,
): Promise<GiuBox> {
  const store = await loadStore();
  const box: GiuBox = {
    ...input,
    id: newId("box"),
    status: "mo",
    quantityLeft: input.quantityTotal,
    createdAt: new Date().toISOString(),
  };
  store.boxes.unshift(box);
  await saveStore(store);
  return box;
}

const PAYMENT_HOLD_MINUTES = 15;
const AUTO_VERIFY_PICKUPS = 3;

function maybeAutoVerifyMerchant(store: GiuStore, merchantId: string): void {
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (merchant && !merchant.verified && merchant.rescuedBoxes >= AUTO_VERIFY_PICKUPS) {
    merchant.verified = true;
  }
}

async function releaseBoxQuantity(store: GiuStore, boxId: string, qty: number): Promise<void> {
  const box = store.boxes.find((b) => b.id === boxId);
  if (!box) return;
  box.quantityLeft += qty;
  if (box.status === "het" && box.quantityLeft > 0) box.status = "mo";
}

async function holdBoxQuantity(store: GiuStore, box: GiuBox, qty: number): Promise<boolean> {
  if (box.status !== "mo" || box.quantityLeft < qty) return false;
  box.quantityLeft -= qty;
  if (box.quantityLeft <= 0) box.status = "het";
  return true;
}

export async function confirmReservationPayment(
  reservationId: string,
  paymentId: string,
  paymentMethod?: GiuPaymentMethod,
): Promise<GiuReservation | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res || res.paymentStatus !== "pending") return null;
  if (res.paymentExpiresAt && new Date(res.paymentExpiresAt).getTime() < Date.now()) {
    return null;
  }

  res.paymentStatus = "paid";
  res.paymentId = paymentId;
  if (paymentMethod) res.paymentMethod = paymentMethod;
  res.paidAt = new Date().toISOString();
  const box = store.boxes.find((b) => b.id === res.boxId);
  if (box && !res.originalPickupEnd) {
    res.originalPickupEnd = box.pickupEnd;
  }
  logTransition(store, res, "payment_completed", {
    role: "system",
    id: "payment",
    reason: "결제 완료",
  });
  res.settlementStatus = "held";
  const merchantForPolicy = store.merchants.find((m) => m.id === res.merchantId);
  res.expiresAt = box
    ? computePickupExpiresAt(box.pickupEnd, policyFor(store, merchantForPolicy))
    : new Date(Date.now() + 60 * 60 * 1000).toISOString();
  res.paymentExpiresAt = undefined;

  await saveStore(store);

  const [boxForNotify, merchant] = [
    box ?? store.boxes.find((b) => b.id === res.boxId),
    store.merchants.find((m) => m.id === res.merchantId),
  ];
  if (boxForNotify && merchant) {
    const sms = await notifyPickupCode({
      phone: res.customerPhone,
      code: res.code,
      merchantName: merchant.name,
      totalVnd: res.totalVnd,
      pickupWindow: formatPickupWindow(boxForNotify.pickupStart, boxForNotify.pickupEnd),
    });
    res.smsSent = Boolean(sms.ok && !sms.skipped);
    await notifyMerchantNewOrder({
      phone: merchant.phone,
      customerName: res.customerName,
      boxTitle: boxForNotify.title,
      totalVnd: res.totalVnd,
      quantity: res.quantity,
    });
    await saveStore(store);
  }

  return res;
}

export async function updateBox(
  boxId: string,
  patch: Partial<
    Pick<
      GiuBox,
      | "title"
      | "description"
      | "imageUrl"
      | "imageUrls"
      | "freshnessNote"
      | "madeAt"
      | "bestBefore"
      | "storageMethod"
      | "storageCustom"
      | "status"
      | "quantityLeft"
      | "quantityTotal"
      | "salePriceVnd"
      | "originalPriceVnd"
      | "pickupStart"
      | "pickupEnd"
      | "expiresAt"
      | "cancelledAt"
    >
  >,
): Promise<GiuBox | null> {
  const store = await loadStore();
  const box = store.boxes.find((b) => b.id === boxId);
  if (!box) return null;
  const prevTotal = box.quantityTotal;
  const prevLeft = box.quantityLeft;
  const prevStatus = box.status;
  Object.assign(box, patch);
  if (patch.status === "huy" && prevStatus !== "huy") {
    box.cancelledAt = new Date().toISOString();
  } else if (patch.status && patch.status !== "huy") {
    delete box.cancelledAt;
  }
  if (patch.quantityTotal !== undefined && patch.quantityTotal !== prevTotal) {
    const sold = prevTotal - prevLeft;
    box.quantityTotal = patch.quantityTotal;
    box.quantityLeft = Math.max(0, patch.quantityTotal - sold);
  }
  if ("imageUrl" in patch && !patch.imageUrl) {
    delete box.imageUrl;
  }
  if ("imageUrls" in patch && !patch.imageUrls?.length) {
    delete box.imageUrls;
  }
  if (box.quantityLeft <= 0 && box.status === "mo") box.status = "het";
  if (box.quantityLeft > 0 && box.status === "het" && patch.status !== "huy") {
    box.status = "mo";
  }
  await saveStore(store);
  return box;
}

async function processNoShowReviewQueue(store: GiuStore, now = Date.now()): Promise<number> {
  let count = 0;
  for (const res of store.reservations) {
    const box = store.boxes.find((b) => b.id === res.boxId);
    const merchant = store.merchants.find((m) => m.id === res.merchantId);
    if (!box || !merchant) continue;
    syncReservationFromBox(store, res);
    const policy = policyFor(store, merchant);
    if (!noShowReviewEligible(res, policy, now)) continue;
    logTransition(store, res, "no_show_review", {
      role: "system",
      id: "cron",
      reason: "미수령 유예 종료 · 노쇼 처리 검토",
    });
    count++;
  }
  return count;
}

export async function expireStaleGiuReservations(): Promise<{
  expiredPayments: number;
  expiredPickups: number;
  autoRefunds: number;
  customerReminders70: number;
  customerReminders30: number;
  merchantExtensionPings: number;
}> {
  const store = await loadStore();
  const now = Date.now();
  let expiredPayments = 0;
  let expiredPickups = 0;

  for (const res of store.reservations) {
    if (res.paymentStatus === "pending" && res.status === "payment_completed") {
      const deadline = res.paymentExpiresAt ?? res.expiresAt;
      if (new Date(deadline).getTime() < now) {
        res.paymentStatus = "failed";
        logTransition(store, res, "order_cancelled", {
          role: "system",
          id: "cron",
          reason: "결제 시간 초과",
        });
        await releaseBoxQuantity(store, res.boxId, res.quantity);
        expiredPayments++;
      }
    } else if (res.paymentStatus === "paid") {
      const box = store.boxes.find((b) => b.id === res.boxId);
      const merchant = store.merchants.find((m) => m.id === res.merchantId);
      if (!box) continue;
      syncReservationFromBox(store, res);
      const policy = policyFor(store, merchant);
      if (shouldMarkNotPickedUp(res, box.pickupEnd, policy, now)) {
        logTransition(store, res, "not_picked_up", {
          role: "system",
          id: "cron",
          reason: "픽업 시간 종료 · 미수령",
        });
        expiredPickups++;
      }
    }
  }

  const reminders = await runGiuPickupReminders(store);
  const autoRefunds = await processNoShowReviewQueue(store, now);

  if (
    expiredPayments > 0 ||
    expiredPickups > 0 ||
    autoRefunds > 0 ||
    reminders.customerReminders70 > 0 ||
    reminders.customerReminders30 > 0 ||
    reminders.merchantExtensionPings > 0
  ) {
    await saveStore(store);
  }

  return { expiredPayments, expiredPickups, autoRefunds, ...reminders };
}

export type InitiateReservationResult =
  | {
      mode: "demo";
      reservation: GiuReservation;
      box: GiuBox;
    }
  | {
      mode: "vnpay";
      reservation: GiuReservation;
      box: GiuBox;
      paymentUrl: string;
    }
  | {
      mode: "lemon_squeezy";
      reservation: GiuReservation;
      box: GiuBox;
    }
  | {
      mode: "toss";
      reservation: GiuReservation;
      box: GiuBox;
    }
  | { error: string };

export async function initiateReservationPayment(input: {
  boxId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: GiuPaymentMethod;
  quantity?: number;
  paymentUrlBuilder: (reservation: GiuReservation, totalVnd: number) => string;
}): Promise<InitiateReservationResult> {
  const store = await loadStore();
  const box = store.boxes.find((b) => b.id === input.boxId);
  if (!box) return { error: "상품을 찾을 수 없습니다" };
  if (box.status !== "mo" || box.quantityLeft <= 0) return { error: "매진되었습니다" };
  if (new Date(box.expiresAt).getTime() < Date.now()) return { error: "픽업 시간이 지났습니다" };

  const qty = input.quantity ?? 1;
  if (qty > box.quantityLeft) return { error: "수량이 부족합니다" };

  const totalVnd = box.salePriceVnd * qty;
  const platformFeeVnd = Math.round(totalVnd * GIU_BRAND.commissionRate);
  const backend = resolveGiuPaymentBackend();
  const chargeAmountUsdCents =
    backend === "lemon_squeezy" ? vndToUsdCents(totalVnd) : undefined;
  const paymentExpiresAt = new Date(
    Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000,
  ).toISOString();

  const reservation: GiuReservation = {
    id: newId("res"),
    boxId: box.id,
    merchantId: box.merchantId,
    customerId: input.customerId,
    code: reservationCode(store.reservations.map((r) => r.code)),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    quantity: qty,
    totalVnd,
    chargeAmountUsdCents,
    platformFeeVnd,
    paymentStatus: "pending",
    paymentMethod: input.paymentMethod,
    status: "payment_completed",
    pickupChangeCount: 0,
    paymentExpiresAt,
    createdAt: new Date().toISOString(),
    expiresAt: paymentExpiresAt,
  };

  if (!(await holdBoxQuantity(store, box, qty))) {
    return { error: "수량이 부족합니다" };
  }

  store.reservations.unshift(reservation);
  appendOrderStatusLog(ensureOrderLogs(store), {
    reservationId: reservation.id,
    orderCode: reservation.code,
    fromStatus: null,
    toStatus: "payment_completed",
    changedByRole: "system",
    changedById: "order",
    reason: "주문 생성",
    customerId: reservation.customerId,
    merchantId: reservation.merchantId,
  });
  await saveStore(store);

  if (backend === "demo") {
    const confirmed = await confirmReservationPayment(
      reservation.id,
      `demo_${randomBytes(4).toString("hex")}`,
    );
    if (!confirmed) return { error: "결제를 확인할 수 없습니다" };
    const updatedBox = (await loadStore()).boxes.find((b) => b.id === box.id);
    return {
      mode: "demo",
      reservation: confirmed,
      box: updatedBox ?? box,
    };
  }

  if (backend === "lemon_squeezy") {
    return { mode: "lemon_squeezy", reservation, box };
  }

  if (backend === "toss") {
    return { mode: "toss", reservation, box };
  }

  const paymentUrl = input.paymentUrlBuilder(reservation, totalVnd);
  return { mode: "vnpay", reservation, box, paymentUrl };
}

/** @deprecated Use initiateReservationPayment */
export async function createPaidReservation(input: {
  boxId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: GiuPaymentMethod;
  quantity?: number;
}): Promise<{ reservation: GiuReservation; box: GiuBox } | { error: string }> {
  const result = await initiateReservationPayment({
    ...input,
    paymentUrlBuilder: () => "",
  });
  if ("error" in result) return { error: result.error };
  return { reservation: result.reservation, box: result.box };
}

/** @deprecated Use createPaidReservation with auth */
export async function createReservation(input: {
  boxId: string;
  customerName: string;
  customerPhone: string;
  quantity?: number;
}): Promise<{ reservation: GiuReservation; box: GiuBox } | { error: string }> {
  return createPaidReservation({
    boxId: input.boxId,
    customerId: "legacy",
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    paymentMethod: "vietqr",
    quantity: input.quantity,
  });
}

function syncReservationFromBox(store: GiuStore, res: GiuReservation): void {
  if (res.paymentStatus !== "paid") return;
  const box = store.boxes.find((b) => b.id === res.boxId);
  const merchant = store.merchants.find((m) => m.id === res.merchantId);
  if (!box) return;
  const policy = policyFor(store, merchant);
  if (res.merchantPickupPromiseUntil) {
    res.expiresAt = res.merchantPickupPromiseUntil;
    if (new Date(res.merchantPickupPromiseUntil).getTime() > Date.now() && res.status === "not_picked_up") {
      logTransition(store, res, "pickup_waiting", {
        role: "system",
        id: "promise",
        reason: "가게 픽업 약속 시간 연장",
      });
    }
    return;
  }
  res.expiresAt = computePickupExpiresAt(box.pickupEnd, policy);
}

export async function getReservation(id: string): Promise<GiuReservation | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === id);
  if (!res) return null;
  syncReservationFromBox(store, res);
  await saveStore(store);
  return res;
}

export async function getReservationByCode(code: string): Promise<GiuReservation | null> {
  const store = await loadStore();
  return (
    store.reservations.find((r) => r.code.toUpperCase() === code.toUpperCase()) ?? null
  );
}

function syncReservationPickupStatuses(store: GiuStore, now = Date.now()): boolean {
  let changed = false;
  for (const res of store.reservations) {
    if (res.paymentStatus !== "paid") continue;
    const box = store.boxes.find((b) => b.id === res.boxId);
    const merchant = store.merchants.find((m) => m.id === res.merchantId);
    if (!box) continue;
    syncReservationFromBox(store, res);
    const policy = policyFor(store, merchant);
    if (shouldMarkNotPickedUp(res, box.pickupEnd, policy, now)) {
      if (logTransition(store, res, "not_picked_up", {
        role: "system",
        id: "sync",
        reason: "픽업 시간 종료 · 미수령",
      })) {
        changed = true;
      }
    }
  }
  return changed;
}

export async function listReservations(filters?: {
  phone?: string;
  customerId?: string;
  merchantId?: string;
  boxId?: string;
}): Promise<GiuReservation[]> {
  const store = await loadStore();
  if (syncReservationPickupStatuses(store)) {
    await saveStore(store);
  }
  return store.reservations
    .filter((r) => {
      if (filters?.phone && r.customerPhone !== filters.phone) return false;
      if (filters?.customerId && r.customerId !== filters.customerId) return false;
      if (filters?.merchantId && r.merchantId !== filters.merchantId) return false;
      if (filters?.boxId && r.boxId !== filters.boxId) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateReservationStatus(
  id: string,
  status: GiuOrderStatus,
  actor?: { role: "merchant" | "admin"; id: string; reason?: string },
): Promise<GiuReservation | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === id);
  if (!res) return null;
  logTransition(store, res, status, actor ?? { role: "merchant", id: res.merchantId, reason: "상태 변경" });
  if (status === "pickup_completed" || status === "settlement_completed") {
    const merchant = store.merchants.find((m) => m.id === res.merchantId);
    if (merchant && status === "pickup_completed") {
      merchant.rescuedBoxes += res.quantity;
      maybeAutoVerifyMerchant(store, merchant.id);
    }
    if (res.paymentStatus === "paid" && res.settlementStatus === "held") {
      res.settlementStatus = "released";
      res.settledAt = new Date().toISOString();
      if (merchant) queueMerchantPayout(store, res, merchant);
      logTransition(store, res, "settlement_completed", {
        role: "system",
        id: "settlement",
        reason: "픽업 확인 · 정산 완료",
      });
    }
  }
  await saveStore(store);
  return res;
}

async function applyRefundSplit(
  store: GiuStore,
  res: GiuReservation,
  split: ReturnType<typeof calculateRefundSplit>,
  actor: { role: "customer" | "merchant" | "system" | "admin"; id: string; reason?: string },
  opts?: { skipReview?: boolean },
): Promise<void> {
  logTransition(store, res, "refund_requested", {
    role: actor.role,
    id: actor.id,
    reason: actor.reason ?? "환불 요청",
  });
  if (!opts?.skipReview) {
    logTransition(store, res, "refund_review", {
      role: "system",
      id: "refund",
      reason: "환불 검토",
    });
  }
  logTransition(store, res, "refund_processing", {
    role: "system",
    id: "refund",
    reason: "환불 처리 중",
  });
  await releaseBoxQuantity(store, res.boxId, res.quantity);
  res.paymentStatus = "refunded";
  res.refundAmountVnd = split.refundVnd;
  res.noShowFeeVnd = split.noShowFeeVnd;
  res.refundType = split.type === "full" ? "full" : "partial";
  res.refundedAt = new Date().toISOString();

  if (split.type === "full") {
    res.settlementStatus = "refunded";
  } else {
    res.settlementStatus = "released";
    res.settledAt = new Date().toISOString();
    const merchant = store.merchants.find((m) => m.id === res.merchantId);
    if (merchant && split.merchantCompensationVnd > 0) {
      res.payoutAmountVnd = split.merchantCompensationVnd;
      const hasAccount = Boolean(merchant.bankAccount?.trim() && merchant.bankName?.trim());
      res.payoutStatus = hasAccount ? "queued" : "pending_account";
    }
  }
  logTransition(store, res, "refund_completed", {
    role: "system",
    id: "refund",
    reason: "환불 완료",
  });
}

const REFUNDABLE_ORDER_STATUSES: GiuOrderStatus[] = [
  "payment_completed",
  "merchant_confirmed",
  "pickup_preparing",
  "pickup_waiting",
  "not_picked_up",
  "pickup_change_completed",
  "pickup_change_requested",
  "no_show_review",
  "dispute_processing",
];

export async function cancelReservation(
  id: string,
  customerId?: string,
): Promise<GiuReservation | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === id);
  if (!res || !REFUNDABLE_ORDER_STATUSES.includes(res.status)) return null;
  if (customerId && res.customerId !== customerId) return null;

  if (res.paymentStatus === "pending") {
    await releaseBoxQuantity(store, res.boxId, res.quantity);
    logTransition(store, res, "order_cancelled", {
      role: "customer",
      id: res.customerId,
      reason: "결제 전 취소",
    });
    res.paymentStatus = "failed";
    await saveStore(store);
    return res;
  }

  if (res.paymentStatus !== "paid") return null;

  const box = store.boxes.find((b) => b.id === res.boxId);
  if (!box) return null;

  const merchant = store.merchants.find((m) => m.id === res.merchantId);
  const split = calculateRefundSplit(res, box, merchant);
  await applyRefundSplit(store, res, split, {
    role: "customer",
    id: res.customerId,
    reason: "고객 환불 요청",
  });

  await saveStore(store);
  return res;
}

export async function getRefundPreview(
  id: string,
): Promise<ReturnType<typeof calculateRefundSplit> | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === id);
  if (
    !res ||
    res.paymentStatus !== "paid" ||
    !REFUNDABLE_ORDER_STATUSES.includes(res.status)
  ) {
    return null;
  }
  const box = store.boxes.find((b) => b.id === res.boxId);
  if (!box) return null;
  const merchant = store.merchants.find((m) => m.id === res.merchantId);
  return calculateRefundSplit(res, box, merchant);
}

export async function addWaitlist(phone: string, district?: string): Promise<GiuWaitlistEntry> {
  const store = await loadStore();
  const entry: GiuWaitlistEntry = {
    id: newId("wl"),
    phone,
    district: district as GiuWaitlistEntry["district"],
    createdAt: new Date().toISOString(),
  };
  store.waitlist.unshift(entry);
  await saveStore(store);
  return entry;
}

export async function getGiuStats() {
  const store = await loadStore();
  const openBoxes = store.boxes.filter(
    (b) => b.status === "mo" && b.quantityLeft > 0 && new Date(b.expiresAt) > new Date(),
  ).length;
  const completedReservations = store.reservations.filter(
    (r) => r.status === "pickup_completed" || r.status === "settlement_completed",
  );
  const rescuedFromDb = completedReservations.reduce((s, r) => s + r.quantity, 0);
  const savedFromDb = completedReservations.reduce((s, r) => s + r.totalVnd, 0);

  return {
    merchants: store.merchants.length,
    verifiedMerchants: store.merchants.filter((m) => m.verified).length,
    openBoxes,
    totalBoxes: store.boxes.length,
    rescuedBoxes: SEED_RESCUED_COUNT + rescuedFromDb,
    co2Kg: SEED_CO2_KG + rescuedFromDb * 2.5,
    savedVnd: SEED_SAVED_VND + savedFromDb,
    waitlist: store.waitlist.length,
    customers: store.accounts.filter((a) => a.role === "customer").length,
  };
}

function recalcMerchantRating(store: GiuStore, merchantId: string): void {
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (!merchant) return;
  const reviews = store.reviews.filter((r) => r.merchantId === merchantId);
  if (reviews.length === 0) {
    merchant.rating = 0;
    merchant.reviewCount = 0;
    return;
  }
  merchant.reviewCount = reviews.length;
  merchant.rating =
    Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
}

function requeuePendingPayouts(store: GiuStore, merchant: GiuMerchant): void {
  if (!merchant.bankName?.trim() || !merchant.bankAccount?.trim()) return;
  for (const res of store.reservations) {
    if (res.merchantId !== merchant.id || res.payoutStatus !== "pending_account") continue;
    res.payoutStatus = "queued";
    res.payoutAmountVnd = res.totalVnd - res.platformFeeVnd;
  }
}

export async function updateMerchantProfile(
  accountId: string,
  patch: Partial<
    Pick<
      GiuMerchant,
      | "name"
      | "address"
      | "addressHint"
      | "phone"
      | "category"
      | "district"
      | "bankName"
      | "bankAccount"
      | "bankHolder"
      | "pickupPolicy"
    >
  >,
): Promise<GiuMerchant | { error: string } | null> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.accountId === accountId);
  if (!merchant) return null;
  const account = store.accounts.find((a) => a.id === accountId);
  if (patch.name?.trim()) merchant.name = patch.name.trim();
  if (patch.address?.trim()) merchant.address = patch.address.trim();
  if (patch.addressHint !== undefined) merchant.addressHint = patch.addressHint?.trim() || undefined;
  if (patch.phone !== undefined) {
    const phone = normalizePhone(patch.phone);
    if (phone.length < 8) return { error: "전화번호를 확인해 주세요" };
    if (
      (accountPhoneTaken(store, phone, "merchant") && account?.phone !== phone) ||
      merchantPhoneTaken(store, phone, merchant.id)
    ) {
      return { error: "이미 사용 중인 전화번호예요" };
    }
    merchant.phone = phone;
    if (account) account.phone = phone;
  }
  if (patch.category) merchant.category = patch.category;
  if (patch.district) merchant.district = patch.district;
  if (patch.bankName !== undefined) merchant.bankName = patch.bankName?.trim() || undefined;
  if (patch.bankAccount !== undefined) merchant.bankAccount = patch.bankAccount?.trim() || undefined;
  if (patch.bankHolder !== undefined) merchant.bankHolder = patch.bankHolder?.trim() || undefined;
  if (patch.pickupPolicy !== undefined) {
    merchant.pickupPolicy = {
      ...merchant.pickupPolicy,
      ...patch.pickupPolicy,
    };
  }
  requeuePendingPayouts(store, merchant);
  await saveStore(store);
  return merchant;
}

export async function deleteBox(
  merchantId: string,
  boxId: string,
): Promise<{ ok: true } | { error: string }> {
  const store = await loadStore();
  const box = store.boxes.find((b) => b.id === boxId && b.merchantId === merchantId);
  if (!box) return { error: "상품을 찾을 수 없어요" };
  if (box.status !== "huy") return { error: "취소된 상품만 삭제할 수 있어요" };
  const awaiting = store.reservations.some(
    (r) => r.boxId === boxId && r.paymentStatus === "paid" && r.status === "pickup_waiting",
  );
  if (awaiting) return { error: "픽업 대기 주문이 있어 삭제할 수 없어요" };
  store.boxes = store.boxes.filter((b) => b.id !== boxId);
  await saveStore(store);
  return { ok: true };
}

export async function republishBox(
  merchantId: string,
  sourceBoxId: string,
  schedule?: { dayOffset: number; startH: number; endH: number },
): Promise<GiuBox | { error: string }> {
  const store = await loadStore();
  const source = store.boxes.find((b) => b.id === sourceBoxId && b.merchantId === merchantId);
  if (!source) return { error: "상품을 찾을 수 없어요" };
  return cloneBoxForRepublish(store, source, schedule);
}

export async function republishLastBox(
  merchantId: string,
  schedule?: { dayOffset: number; startH: number; endH: number },
): Promise<GiuBox | { error: string }> {
  const store = await loadStore();
  const last = store.boxes
    .filter((b) => b.merchantId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!last) return { error: "이전 상품이 없어요. 먼저 한 번 등록해 주세요." };
  return cloneBoxForRepublish(store, last, schedule);
}

async function cloneBoxForRepublish(
  store: GiuStore,
  source: GiuBox,
  schedule?: { dayOffset: number; startH: number; endH: number },
): Promise<GiuBox | { error: string }> {
  const merchant = store.merchants.find((m) => m.id === source.merchantId);
  const market = merchant?.market ?? "kr";
  const dayOffset = schedule?.dayOffset ?? dayOffsetFromIso(source.pickupStart, market);
  const startH = schedule?.startH ?? hourFromIso(source.pickupStart, market);
  const endH = schedule?.endH ?? hourFromIso(source.pickupEnd, market);
  if (endH <= startH) return { error: "종료 시간은 시작보다 늦어야 합니다" };
  const win = buildPickupWindow(dayOffset, startH, endH, market);
  if (new Date(win.pickupEnd).getTime() <= Date.now()) {
    return { error: "픽업 종료 시간이 이미 지났어요. 시간을 다시 설정해 주세요" };
  }
  const box: GiuBox = {
    id: newId("box"),
    merchantId: source.merchantId,
    title: source.title,
    description: source.description,
    imageUrl: source.imageUrl,
    imageUrls: source.imageUrls,
    category: source.category,
    originalPriceVnd: source.originalPriceVnd,
    salePriceVnd: source.salePriceVnd,
    quantityTotal: source.quantityTotal,
    quantityLeft: source.quantityTotal,
    pickupStart: win.pickupStart,
    pickupEnd: win.pickupEnd,
    madeAt: source.madeAt,
    bestBefore: source.bestBefore,
    storageMethod: source.storageMethod,
    storageCustom: source.storageCustom,
    freshnessNote: source.freshnessNote,
    status: "mo",
    createdAt: new Date().toISOString(),
    expiresAt: win.expiresAt,
  };
  store.boxes.unshift(box);
  await saveStore(store);
  return box;
}

function pickupActiveForMerchant(
  _store: GiuStore,
  res: GiuReservation,
  merchantId: string,
): boolean {
  if (res.merchantId !== merchantId) return false;
  return isPickupQrValid(res);
}

export async function lookupPickupByCode(
  merchantId: string,
  code: string,
): Promise<GiuReservation | { error: string }> {
  const normalized = normalizePickupCodeInput(code);
  if (!isValidPickupCode(normalized)) {
    return { error: "손님이 알려준 3자리 숫자를 입력해 주세요" };
  }
  const lookup = /^\d{3}$/.test(normalized) ? normalized : normalized.toUpperCase();
  const store = await loadStore();
  const res = store.reservations.find(
    (r) =>
      r.merchantId === merchantId &&
      r.code === lookup &&
      pickupActiveForMerchant(store, r, merchantId),
  );
  if (!res) return { error: "코드를 찾을 수 없거나 이미 처리됐어요" };
  return res;
}

export async function lookupPickupByToken(
  merchantId: string,
  token: string,
): Promise<GiuReservation | { error: string }> {
  const { verifyPickupQrToken } = await import("@/giu/lib/pickup-qr");
  const verified = verifyPickupQrToken(token);
  if (!verified) {
    return { error: "QR이 만료되었거나 올바르지 않아요. 손님 화면에서 새 QR이 보이면 다시 스캔하세요." };
  }
  const store = await loadStore();
  const res = store.reservations.find(
    (r) =>
      r.id === verified.reservationId &&
      r.merchantId === merchantId &&
      r.paymentStatus === "paid",
  );
  if (!res) return { error: "주문을 찾을 수 없어요" };
  if (res.status === "pickup_completed" || res.status === "settlement_completed") {
    return { error: "이미 픽업 완료된 주문이에요" };
  }
  if (!pickupActiveForMerchant(store, res, merchantId)) {
    return { error: "픽업 시간이 지났어요. 손님 연장 승인 후 다시 스캔하거나 채팅으로 조율해 주세요." };
  }
  return res;
}

export async function confirmPickupById(
  merchantId: string,
  reservationId: string,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find(
    (r) => r.id === reservationId && r.merchantId === merchantId,
  );
  if (!res) return { error: "주문을 찾을 수 없어요" };
  return await finalizePickup(store, res, merchantId);
}

export async function confirmPickupByCode(
  merchantId: string,
  code: string,
): Promise<GiuReservation | { error: string }> {
  const looked = await lookupPickupByCode(merchantId, code);
  if ("error" in looked) return looked;
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === looked.id);
  if (!res) return { error: "주문을 찾을 수 없어요" };
  return await finalizePickup(store, res, merchantId);
}

export async function confirmPickupByToken(
  merchantId: string,
  token: string,
): Promise<GiuReservation | { error: string }> {
  const looked = await lookupPickupByToken(merchantId, token);
  if ("error" in looked) return looked;
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === looked.id);
  if (!res) return { error: "주문을 찾을 수 없어요" };
  return await finalizePickup(store, res, merchantId);
}

function queueMerchantPayout(
  store: GiuStore,
  res: GiuReservation,
  merchant: GiuMerchant,
): void {
  const net = res.totalVnd - res.platformFeeVnd;
  res.payoutAmountVnd = net;
  const hasAccount = Boolean(merchant.bankAccount?.trim() && merchant.bankName?.trim());
  res.payoutStatus = hasAccount ? "queued" : "pending_account";
}

function finalizePickup(
  store: GiuStore,
  res: GiuReservation,
  merchantId: string,
): Promise<GiuReservation | { error: string }> {
  if (res.status === "pickup_completed" || res.status === "settlement_completed") {
    return Promise.resolve(res);
  }
  if (!pickupActiveForMerchant(store, res, merchantId)) {
    return Promise.resolve({
      error: "픽업 시간이 지났어요. 손님 연장 승인 후 다시 시도하거나 채팅으로 조율해 주세요.",
    });
  }
  logTransition(store, res, "pickup_completed", {
    role: "merchant",
    id: merchantId,
    reason: "QR·코드 픽업 확인",
  });
  logTransition(store, res, "settlement_pending", {
    role: "system",
    id: "settlement",
    reason: "정산 대기",
  });
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (merchant) {
    merchant.rescuedBoxes += res.quantity;
    maybeAutoVerifyMerchant(store, merchant.id);
    if (res.settlementStatus === "held") {
      res.settlementStatus = "released";
      res.settledAt = new Date().toISOString();
      queueMerchantPayout(store, res, merchant);
      logTransition(store, res, "settlement_completed", {
        role: "system",
        id: "settlement",
        reason: "정산 완료",
      });
    }
  }
  return saveStore(store).then(() => res);
}

export async function addReview(input: {
  reservationId: string;
  customerId: string;
  rating: number;
  comment?: string;
}): Promise<GiuReview | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === input.reservationId);
  if (!res || res.customerId !== input.customerId) return { error: "주문을 찾을 수 없어요" };
  if (res.status !== "pickup_completed" && res.status !== "settlement_completed") {
    return { error: "픽업 완료 후에 리뷰를 남길 수 있어요" };
  }
  if (store.reviews.some((r) => r.reservationId === input.reservationId)) {
    return { error: "이미 리뷰를 남겼어요" };
  }
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const review: GiuReview = {
    id: newId("rev"),
    merchantId: res.merchantId,
    reservationId: res.id,
    customerId: input.customerId,
    rating,
    comment: input.comment?.trim().slice(0, 500) || undefined,
    createdAt: new Date().toISOString(),
  };
  store.reviews.unshift(review);
  recalcMerchantRating(store, res.merchantId);
  await saveStore(store);
  return review;
}

export async function getReviewForReservation(
  reservationId: string,
): Promise<GiuReview | null> {
  const store = await loadStore();
  return store.reviews.find((r) => r.reservationId === reservationId) ?? null;
}

export async function listCustomerReviews(
  customerId: string,
  limit = 30,
): Promise<GiuReview[]> {
  const store = await loadStore();
  return store.reviews
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function listMerchantReviews(
  merchantId: string,
  limit = 20,
): Promise<GiuReview[]> {
  const store = await loadStore();
  return store.reviews
    .filter((r) => r.merchantId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getCustomerFavorites(customerId: string): Promise<string[]> {
  const store = await loadStore();
  return store.customerFavorites[customerId] ?? [];
}

export async function setCustomerFavorites(
  customerId: string,
  merchantIds: string[],
): Promise<string[]> {
  const store = await loadStore();
  const valid = new Set(store.merchants.map((m) => m.id));
  const next = [...new Set(merchantIds.filter((id) => valid.has(id)))];
  store.customerFavorites[customerId] = next;
  await saveStore(store);
  return next;
}

export async function toggleCustomerFavorite(
  customerId: string,
  merchantId: string,
): Promise<{ ids: string[]; favorited: boolean }> {
  const store = await loadStore();
  if (!store.merchants.some((m) => m.id === merchantId)) {
    return { ids: store.customerFavorites[customerId] ?? [], favorited: false };
  }
  const current = store.customerFavorites[customerId] ?? [];
  const idx = current.indexOf(merchantId);
  let favorited: boolean;
  if (idx >= 0) {
    current.splice(idx, 1);
    favorited = false;
  } else {
    current.push(merchantId);
    favorited = true;
  }
  store.customerFavorites[customerId] = current;
  await saveStore(store);
  return { ids: current, favorited };
}

function chatAllowed(res: GiuReservation): boolean {
  if (res.paymentStatus !== "paid") return false;
  return chatAllowedForStatus(res.status);
}

export async function listReservationChatMessages(
  reservationId: string,
): Promise<GiuChatMessage[]> {
  const store = await loadStore();
  return store.chatMessages
    .filter((m) => m.reservationId === reservationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countUnreadChatMessages(
  reservationId: string,
  viewerRole: GiuAccountRole,
): Promise<number> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res) return 0;
  const lastRead =
    viewerRole === "customer"
      ? res.chatLastReadCustomerAt ?? ""
      : res.chatLastReadMerchantAt ?? "";
  return store.chatMessages.filter(
    (m) =>
      m.reservationId === reservationId &&
      m.senderRole !== viewerRole &&
      m.createdAt > lastRead,
  ).length;
}

export async function markReservationChatRead(
  reservationId: string,
  viewerRole: GiuAccountRole,
): Promise<void> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res) return;
  const now = new Date().toISOString();
  if (viewerRole === "customer") res.chatLastReadCustomerAt = now;
  else res.chatLastReadMerchantAt = now;
  await saveStore(store);
}

export async function addReservationChatMessage(input: {
  reservationId: string;
  senderRole: GiuAccountRole;
  senderId: string;
  body: string;
}): Promise<GiuChatMessage | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === input.reservationId);
  if (!res) return { error: "주문을 찾을 수 없어요" };
  if (!chatAllowed(res)) return { error: "이 주문에서는 채팅을 사용할 수 없어요" };

  if (input.senderRole === "customer" && res.customerId !== input.senderId) {
    return { error: "Unauthorized" };
  }
  if (input.senderRole === "merchant") {
    const merchant = store.merchants.find((m) => m.id === res.merchantId);
    if (!merchant || merchant.accountId !== input.senderId) {
      return { error: "Unauthorized" };
    }
  }

  const body = input.body.trim().slice(0, 500);
  if (body.length < 1) return { error: "메시지를 입력해 주세요" };

  const message: GiuChatMessage = {
    id: newId("msg"),
    reservationId: input.reservationId,
    senderRole: input.senderRole,
    senderId: input.senderId,
    body,
    createdAt: new Date().toISOString(),
  };
  if (!store.chatMessages) store.chatMessages = [];
  store.chatMessages.push(message);
  if (input.senderRole === "customer") res.chatLastReadCustomerAt = message.createdAt;
  else res.chatLastReadMerchantAt = message.createdAt;
  await saveStore(store);
  return message;
}

export async function listMerchantUnreadChats(
  merchantId: string,
): Promise<{ reservationId: string; unread: number }[]> {
  const store = await loadStore();
  const reservations = store.reservations.filter(
    (r) => r.merchantId === merchantId && chatAllowed(r),
  );
  return reservations
    .map((r) => ({
      reservationId: r.id,
      unread: store.chatMessages.filter(
        (m) =>
          m.reservationId === r.id &&
          m.senderRole === "customer" &&
          m.createdAt > (r.chatLastReadMerchantAt ?? ""),
      ).length,
    }))
    .filter((x) => x.unread > 0);
}

export async function requestPickupExtension(
  reservationId: string,
  customerId: string,
  input: { reason: string; plannedPickupAt: string },
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res || res.customerId !== customerId) return { error: "주문을 찾을 수 없어요" };
  if (res.paymentStatus !== "paid" || res.status !== "not_picked_up") {
    return { error: "미수령 상태에서만 픽업일 변경을 요청할 수 있어요" };
  }
  const maxChanges = maxPickupChangesPerOrder(store.platformSettings);
  if ((res.pickupChangeCount ?? 0) >= maxChanges) {
    return { error: "픽업일 변경은 주문당 1번만 가능해요" };
  }

  const box = store.boxes.find((b) => b.id === res.boxId);
  const merchant = store.merchants.find((m) => m.id === res.merchantId);
  if (!box || !merchant) return { error: "주문 정보를 찾을 수 없어요" };
  if (!isPickupChangeAllowedForBox(box)) {
    return { error: "이 상품은 픽업일 변경이 허용되지 않아요" };
  }

  if (res.extensionRequest?.status === "pending") {
    return { error: "이미 변경 요청을 보냈어요. 가게 확인을 기다려 주세요." };
  }

  const reason = input.reason.trim().slice(0, 300);
  const planned = new Date(input.plannedPickupAt);
  if (!reason || !Number.isFinite(planned.getTime()) || planned.getTime() <= Date.now()) {
    return { error: "사유와 받으러 올 시간을 입력해 주세요" };
  }

  const originalEnd = res.originalPickupEnd ?? box.pickupEnd;
  if (!isPickupChangeWithinLimit(originalEnd, planned.toISOString(), store.platformSettings)) {
    return { error: "픽업일 변경은 기존 픽업일로부터 24시간 이내만 가능해요" };
  }

  const now = new Date().toISOString();
  res.extensionRequest = {
    status: "pending",
    reason,
    plannedPickupAt: planned.toISOString(),
    requestedAt: now,
  };
  res.pickupExtensionRequestedAt = now;
  logTransition(store, res, "pickup_change_requested", {
    role: "customer",
    id: customerId,
    reason: "픽업일 변경 요청",
  });

  const message: GiuChatMessage = {
    id: newId("msg"),
    reservationId,
    senderRole: "customer",
    senderId: customerId,
    body: `픽업일 변경 요청\n사유: ${reason}\n새 픽업 시간: ${planned.toLocaleString("ko-KR")}`,
    createdAt: now,
  };
  if (!store.chatMessages) store.chatMessages = [];
  store.chatMessages.push(message);
  res.chatLastReadCustomerAt = message.createdAt;

  await notifyMerchantExtensionRequest({
    phone: merchant.phone,
    customerName: res.customerName,
    link: merchantOrderDeepLink(res.id),
  });

  await saveStore(store);
  return res;
}

export async function approvePickupExtension(
  merchantId: string,
  reservationId: string,
  note?: string,
  merchantStorageConfirmed?: boolean,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find(
    (r) => r.id === reservationId && r.merchantId === merchantId,
  );
  if (!res?.extensionRequest || res.extensionRequest.status !== "pending") {
    return { error: "승인할 연장 요청이 없어요" };
  }

  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (!merchant) return { error: "가게 정보를 찾을 수 없어요" };

  const until = res.extensionRequest.plannedPickupAt;
  if (new Date(until).getTime() <= Date.now()) {
    return { error: "약속 시간이 이미 지났어요. 채팅으로 새 시간을 정해 주세요" };
  }

  const box = store.boxes.find((b) => b.id === res.boxId);
  const originalEnd = res.originalPickupEnd ?? box?.pickupEnd ?? until;
  const isNextDay =
    new Date(until).toDateString() !== new Date(originalEnd).toDateString();
  if (isNextDay && !merchantStorageConfirmed) {
    return { error: "다음날 픽업 승인 시 상품 보관 확인이 필요해요" };
  }

  const reviewedAt = new Date().toISOString();
  res.extensionRequest.status = "approved";
  res.extensionRequest.reviewedAt = reviewedAt;
  res.extensionRequest.merchantNote = note?.trim().slice(0, 200) || undefined;
  res.extensionRequest.merchantStorageConfirmed = Boolean(merchantStorageConfirmed);
  res.pickupChangeCount = (res.pickupChangeCount ?? 0) + 1;
  res.notPickedUpAt = undefined;
  if (!res.pickupChangeHistory) res.pickupChangeHistory = [];
  res.pickupChangeHistory.push({
    id: newId("pchg"),
    fromPickupEnd: originalEnd,
    toPickupEnd: until,
    requestedByRole: "customer",
    approvedByRole: "merchant",
    reason: res.extensionRequest.reason,
    requestedAt: res.extensionRequest.requestedAt,
    reviewedAt,
    status: "approved",
  });
  logTransition(store, res, "pickup_change_completed", {
    role: "merchant",
    id: merchantId,
    reason: "픽업일 변경 승인",
  });
  logTransition(store, res, "pickup_waiting", {
    role: "system",
    id: "extension",
    reason: "변경된 픽업일 · 픽업 대기",
  });
  res.merchantPickupPromiseUntil = until;
  res.expiresAt = until;

  await notifyCustomerExtensionApproved({
    phone: res.customerPhone,
    merchantName: merchant.name,
    when: new Date(until).toLocaleString("ko-KR"),
    link: reservationDeepLink(res.id),
  });

  await saveStore(store);
  return res;
}

export async function rejectPickupExtension(
  merchantId: string,
  reservationId: string,
  note?: string,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find(
    (r) => r.id === reservationId && r.merchantId === merchantId,
  );
  if (!res?.extensionRequest || res.extensionRequest.status !== "pending") {
    return { error: "거절할 연장 요청이 없어요" };
  }

  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (!merchant) return { error: "가게 정보를 찾을 수 없어요" };

  res.extensionRequest.status = "rejected";
  res.extensionRequest.reviewedAt = new Date().toISOString();
  res.extensionRequest.merchantNote = note?.trim().slice(0, 200) || undefined;
  logTransition(store, res, "not_picked_up", {
    role: "merchant",
    id: merchantId,
    reason: "픽업일 변경 거절",
  });

  const chatBody =
    note?.trim() ||
    "죄송해요, 그 시간에는 어려워요. 채팅으로 다른 시간을 같이 정해 봐요.";
  const message: GiuChatMessage = {
    id: newId("msg"),
    reservationId,
    senderRole: "merchant",
    senderId: merchant.accountId,
    body: chatBody,
    createdAt: new Date().toISOString(),
  };
  if (!store.chatMessages) store.chatMessages = [];
  store.chatMessages.push(message);
  res.chatLastReadMerchantAt = message.createdAt;

  await notifyCustomerExtensionRejected({
    phone: res.customerPhone,
    merchantName: merchant.name,
    link: reservationDeepLink(res.id),
  });

  await saveStore(store);
  return res;
}

export async function promiseMerchantPickup(
  merchantId: string,
  reservationId: string,
  untilIso?: string,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find(
    (r) => r.id === reservationId && r.merchantId === merchantId,
  );
  if (!res) return { error: "주문을 찾을 수 없어요" };
  if (res.paymentStatus !== "paid") return { error: "픽업 가능한 주문이 아니에요" };
  if (
    res.status === "pickup_completed" ||
    res.status === "settlement_completed" ||
    res.status === "refund_completed" ||
    res.status === "order_cancelled"
  ) {
    return { error: "픽업 가능한 주문이 아니에요" };
  }

  const box = store.boxes.find((b) => b.id === res.boxId);
  if (!box) return { error: "상품 정보를 찾을 수 없어요" };

  const until = untilIso ?? defaultPromiseUntil(box.pickupEnd);
  if (new Date(until).getTime() <= Date.now()) {
    return { error: "보류 시간이 올바르지 않아요" };
  }

  logTransition(store, res, "pickup_waiting", {
    role: "merchant",
    id: merchantId,
    reason: "가게 픽업 약속",
  });
  res.merchantPickupPromiseUntil = until;
  res.expiresAt = until;
  await saveStore(store);
  return res;
}

export async function merchantConfirmOrder(
  merchantId: string,
  reservationId: string,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find(
    (r) => r.id === reservationId && r.merchantId === merchantId,
  );
  if (!res || res.paymentStatus !== "paid") return { error: "주문을 찾을 수 없어요" };
  if (res.status !== "payment_completed" && res.status !== "pickup_waiting") {
    return { error: "이미 확인된 주문이에요" };
  }
  logTransition(store, res, "merchant_confirmed", {
    role: "merchant",
    id: merchantId,
    reason: "가게 주문 확인",
  });
  logTransition(store, res, "pickup_waiting", {
    role: "system",
    id: "order",
    reason: "픽업 대기",
  });
  await saveStore(store);
  return res;
}

export async function reportOrderDispute(
  reservationId: string,
  customerId: string,
  reason: string,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res || res.customerId !== customerId) return { error: "주문을 찾을 수 없어요" };
  if (res.status !== "not_picked_up") {
    return { error: "미수령 상태에서만 문제 신고를 할 수 있어요" };
  }
  const trimmed = reason.trim().slice(0, 300);
  if (!trimmed) return { error: "신고 사유를 선택해 주세요" };

  if (!res.merchantProblemReports) res.merchantProblemReports = [];
  res.merchantProblemReports.push({
    id: newId("mprob"),
    reason: trimmed,
    createdAt: new Date().toISOString(),
  });
  const risk = computeCustomerRisk(customerId, store.reservations);
  res.customerRiskLevel = risk.level;

  logTransition(store, res, "dispute_processing", {
    role: "customer",
    id: customerId,
    reason: trimmed,
  });

  await saveStore(store);
  return res;
}

export async function getOrderStatusLogs(
  reservationId: string,
): Promise<GiuOrderStatusLog[]> {
  const store = await loadStore();
  return listOrderStatusLogsForReservation(store.orderStatusLogs ?? [], reservationId);
}

export async function getPlatformSettings() {
  const store = await loadStore();
  return platformOf(store);
}

export async function updatePlatformSettings(
  patch: Partial<import("./platform-settings").GiuPlatformSettings>,
): Promise<import("./platform-settings").GiuPlatformSettings> {
  const store = await loadStore();
  store.platformSettings = { ...platformOf(store), ...patch };
  await saveStore(store);
  return platformOf(store);
}

export async function proposePickupChangeByMerchant(
  merchantId: string,
  reservationId: string,
  input: { plannedPickupAt: string; reason?: string; merchantStorageConfirmed: boolean },
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId && r.merchantId === merchantId);
  if (!res || res.paymentStatus !== "paid") return { error: "주문을 찾을 수 없어요" };
  if ((res.pickupChangeCount ?? 0) >= maxPickupChangesPerOrder(store.platformSettings)) {
    return { error: "이미 픽업일 변경이 완료된 주문이에요" };
  }
  if (!input.merchantStorageConfirmed) {
    return { error: "상품 보관 가능 여부를 확인해 주세요" };
  }
  const planned = new Date(input.plannedPickupAt);
  if (!Number.isFinite(planned.getTime()) || planned.getTime() <= Date.now()) {
    return { error: "새 픽업 시간을 선택해 주세요" };
  }
  const box = store.boxes.find((b) => b.id === res.boxId);
  const originalEnd = res.originalPickupEnd ?? box?.pickupEnd;
  if (originalEnd && !isPickupChangeWithinLimit(originalEnd, planned.toISOString(), store.platformSettings)) {
    return { error: "픽업일 변경은 기존 픽업일로부터 24시간 이내만 가능해요" };
  }
  res.merchantPickupProposal = {
    status: "pending",
    plannedPickupAt: planned.toISOString(),
    reason: input.reason?.trim().slice(0, 300),
    proposedAt: new Date().toISOString(),
    merchantStorageConfirmed: input.merchantStorageConfirmed,
  };
  await saveStore(store);
  return res;
}

export async function approvePickupProposalByCustomer(
  reservationId: string,
  customerId: string,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId && r.customerId === customerId);
  const proposal = res?.merchantPickupProposal;
  if (!res || !proposal || proposal.status !== "pending") {
    return { error: "승인할 제안이 없어요" };
  }
  const until = proposal.plannedPickupAt;
  const box = store.boxes.find((b) => b.id === res.boxId);
  const originalEnd = res.originalPickupEnd ?? box?.pickupEnd ?? until;
  const reviewedAt = new Date().toISOString();
  proposal.status = "approved";
  proposal.reviewedAt = reviewedAt;
  res.pickupChangeCount = (res.pickupChangeCount ?? 0) + 1;
  res.notPickedUpAt = undefined;
  res.merchantPickupPromiseUntil = until;
  res.expiresAt = until;
  if (!res.pickupChangeHistory) res.pickupChangeHistory = [];
  res.pickupChangeHistory.push({
    id: newId("pchg"),
    fromPickupEnd: originalEnd,
    toPickupEnd: until,
    requestedByRole: "merchant",
    approvedByRole: "customer",
    reason: proposal.reason ?? "가게 픽업일 변경 제안",
    requestedAt: proposal.proposedAt,
    reviewedAt,
    status: "approved",
  });
  logTransition(store, res, "pickup_change_completed", {
    role: "customer",
    id: customerId,
    reason: "픽업일 변경 승인",
  });
  logTransition(store, res, "pickup_waiting", {
    role: "system",
    id: "extension",
    reason: "변경된 픽업일 · 픽업 대기",
  });
  await saveStore(store);
  return res;
}

export async function rejectPickupProposalByCustomer(
  reservationId: string,
  customerId: string,
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId && r.customerId === customerId);
  const proposal = res?.merchantPickupProposal;
  if (!res || !proposal || proposal.status !== "pending") {
    return { error: "거절할 제안이 없어요" };
  }
  proposal.status = "rejected";
  proposal.reviewedAt = new Date().toISOString();
  if (res.status !== "not_picked_up") {
    logTransition(store, res, "not_picked_up", {
      role: "customer",
      id: customerId,
      reason: "픽업일 변경 제안 거절",
    });
  }
  await saveStore(store);
  return res;
}

export async function requestStructuredRefund(
  reservationId: string,
  customerId: string,
  input: {
    reason: string;
    detail?: string;
    problemType?: string;
    evidenceUrls?: string[];
  },
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res || res.customerId !== customerId) return { error: "주문을 찾을 수 없어요" };
  if (!REFUNDABLE_ORDER_STATUSES.includes(res.status) && res.status !== "pickup_completed" && res.status !== "settlement_completed") {
    return { error: "환불할 수 없는 주문이에요" };
  }
  const reason = input.reason.trim();
  if (!reason) return { error: "환불 사유를 선택해 주세요" };

  res.refundRequest = {
    reason,
    detail: input.detail?.trim().slice(0, 500),
    problemType: input.problemType,
    evidenceUrls: input.evidenceUrls?.slice(0, 5),
    requestedAt: new Date().toISOString(),
    status: "requested",
  };
  logTransition(store, res, "refund_requested", {
    role: "customer",
    id: customerId,
    reason,
  });
  logTransition(store, res, "refund_review", {
    role: "system",
    id: "refund",
    reason: "환불 검토",
  });
  const risk = computeCustomerRisk(customerId, store.reservations);
  res.customerRiskLevel = risk.level;
  if (risk.level !== "normal") {
    logTransition(store, res, "admin_review_required", {
      role: "system",
      id: "risk",
      reason: risk.reasons[0] ?? "위험 거래 확인",
    });
  }
  await saveStore(store);
  return res;
}

export async function reportProductIssue(
  reservationId: string,
  customerId: string,
  input: {
    kind: string;
    description?: string;
    evidenceUrls?: string[];
    storageNote?: string;
  },
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res || res.customerId !== customerId) return { error: "주문을 찾을 수 없어요" };
  if (res.status !== "pickup_completed" && res.status !== "settlement_completed") {
    return { error: "픽업 완료 후에 상품 문제를 신고할 수 있어요" };
  }
  if (!res.productReports) res.productReports = [];
  const isFoodSafety = input.kind.includes("식품") || input.kind.includes("부패") || input.kind.includes("이물");
  res.productReports.push({
    id: newId("preport"),
    kind: input.kind,
    description: input.description?.trim().slice(0, 500),
    evidenceUrls: input.evidenceUrls?.slice(0, 5),
    storageNote: input.storageNote,
    isFoodSafety,
    status: "open",
    createdAt: new Date().toISOString(),
  });
  logTransition(store, res, "dispute_processing", {
    role: "customer",
    id: customerId,
    reason: `상품 문제 신고: ${input.kind}`,
  });
  const risk = computeCustomerRisk(customerId, store.reservations);
  res.customerRiskLevel = risk.level;
  await saveStore(store);
  return res;
}

export async function adminResolveDispute(
  reservationId: string,
  adminId: string,
  input: { outcome: "customer_fault" | "merchant_fault" | "needs_more_info" | "no_issue"; reason: string },
): Promise<GiuReservation | { error: string }> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === reservationId);
  if (!res) return { error: "주문을 찾을 수 없어요" };
  const reason = input.reason.trim().slice(0, 500);
  if (!reason) return { error: "처리 사유를 입력해 주세요" };
  res.adminDisputeResolution = {
    outcome: input.outcome,
    reason,
    resolvedAt: new Date().toISOString(),
    adminId,
  };
  appendOrderStatusLog(ensureOrderLogs(store), {
    reservationId: res.id,
    orderCode: res.code,
    fromStatus: res.status,
    toStatus: res.status,
    changedByRole: "admin",
    changedById: adminId,
    reason: `분쟁 처리: ${reason}`,
    customerId: res.customerId,
    merchantId: res.merchantId,
  });
  await saveStore(store);
  return res;
}

export async function listAdminOrderSummaries() {
  const store = await loadStore();
  return store.reservations.map((r) => {
    const customerRisk = computeCustomerRisk(r.customerId, store.reservations);
    const merchantRisk = computeMerchantRisk(r.merchantId, store.reservations);
    return {
      reservation: r,
      customerRisk,
      merchantRisk,
      logs: listOrderStatusLogsForReservation(store.orderStatusLogs ?? [], r.id),
      chatCount: store.chatMessages.filter((m) => m.reservationId === r.id).length,
    };
  });
}

export { defaultPickupWindow };
