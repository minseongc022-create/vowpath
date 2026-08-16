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
  GiuMarket,
  GiuMerchant,
  GiuPaymentMethod,
  GiuReservation,
  GiuReservationStatus,
  GiuReview,
  GiuStore,
  GiuWaitlistEntry,
} from "./types";
import { getDistrictLabel, isKrDistrict } from "./districts";
import { notifyPickupCode } from "./notify";
import { defaultPickupWindow, formatPickupWindow, slugify } from "./format";
import { resolveGiuPaymentBackend } from "./payments";
import { vndToUsdCents } from "./lemon-squeezy-giu";
import {
  SEED_BOXES,
  SEED_CO2_KG,
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

function reservationCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultStore(): GiuStore {
  return {
    merchants: [...SEED_MERCHANTS],
    boxes: [...SEED_BOXES],
    reservations: [],
    waitlist: [],
    accounts: [],
    reviews: [],
    customerFavorites: {},
  };
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
  return {
    ...reservation,
    customerId: reservation.customerId ?? "legacy",
    paymentStatus: reservation.paymentStatus ?? "paid",
    platformFeeVnd:
      reservation.platformFeeVnd ??
      Math.round(reservation.totalVnd * GIU_BRAND.commissionRate),
    paymentExpiresAt: reservation.paymentExpiresAt,
    settlementStatus:
      reservation.settlementStatus ??
      (reservation.paymentStatus === "paid" ? "held" : undefined),
  };
}

function normalizeStore(raw: Partial<GiuStore>): GiuStore {
  const base = defaultStore();
  return {
    merchants: (raw.merchants?.length ? raw.merchants : base.merchants).map(migrateMerchant),
    boxes: raw.boxes?.length ? raw.boxes : base.boxes,
    reservations: (raw.reservations ?? []).map(migrateReservation),
    waitlist: raw.waitlist ?? [],
    accounts: (raw.accounts ?? []).map(migrateAccount),
    reviews: raw.reviews ?? [],
    customerFavorites: raw.customerFavorites ?? {},
  };
}

async function loadStore(): Promise<GiuStore> {
  if (kvConfigured()) {
    const raw = await kvGetSafe<GiuStore>(KV_STORE_KEY);
    if (raw) {
      const store = normalizeStore(raw);
      if (storeNeedsKrMigration(raw)) await saveStore(store);
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
    if (storeNeedsKrMigration(parsed)) await saveStore(store);
    return store;
  } catch {
    const store = defaultStore();
    await saveStore(store);
    return store;
  }
}

async function saveStore(store: GiuStore): Promise<void> {
  if (kvConfigured()) {
    await kv.set(KV_STORE_KEY, store);
    return;
  }

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STORE_FILE, JSON.stringify(store, null, 2));
  } catch {
    // read-only FS on some hosts
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
  if (store.accounts.some((a) => a.email === email)) {
    return { error: "이미 등록된 이메일입니다" };
  }
  const phone = normalizePhone(input.phone);
  if (store.accounts.some((a) => a.phone === phone)) {
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
  name: string;
  phone: string;
  category: GiuMerchant["category"];
  district: GiuMerchant["district"];
  address: string;
  zalo?: string;
  market?: GiuMarket;
}): Promise<{ account: GiuAccount; merchant: GiuMerchant } | { error: string }> {
  const store = await loadStore();
  const email = normalizeEmail(input.email);
  if (store.accounts.some((a) => a.email === email)) {
    return { error: "이미 등록된 이메일입니다" };
  }
  const phone = normalizePhone(input.phone);
  if (store.accounts.some((a) => a.phone === phone)) {
    return { error: "이미 등록된 전화번호입니다" };
  }
  if (store.merchants.some((m) => normalizePhone(m.phone) === phone)) {
    return { error: "이 전화번호의 가게가 이미 있습니다 — 로그인하세요" };
  }

  const account: GiuAccount = {
    id: newId("acc"),
    role: "merchant",
    email,
    phone,
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    market: input.market ?? "kr",
    createdAt: new Date().toISOString(),
  };

  let slug = slugify(input.name);
  if (store.merchants.some((m) => m.slug === slug)) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }

  const merchant: GiuMerchant = {
    id: newId("mer"),
    accountId: account.id,
    name: input.name.trim(),
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
  const account = store.accounts.find((a) => a.email === email);
  if (!account) return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  if (input.role && account.role !== input.role) {
    return { error: "로그인 유형과 맞지 않는 계정입니다" };
  }
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
const PICKUP_HOLD_MINUTES = 60;
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
  res.status = "giu_cho";
  res.settlementStatus = "held";
  res.expiresAt = new Date(Date.now() + PICKUP_HOLD_MINUTES * 60 * 1000).toISOString();
  res.paymentExpiresAt = undefined;

  await saveStore(store);

  const [box, merchant] = [
    store.boxes.find((b) => b.id === res.boxId),
    store.merchants.find((m) => m.id === res.merchantId),
  ];
  if (box && merchant) {
    const sms = await notifyPickupCode({
      phone: res.customerPhone,
      code: res.code,
      merchantName: merchant.name,
      totalVnd: res.totalVnd,
      pickupWindow: formatPickupWindow(box.pickupStart, box.pickupEnd),
    });
    res.smsSent = Boolean(sms.ok && !sms.skipped);
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
      | "freshnessNote"
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
  if (box.quantityLeft <= 0 && box.status === "mo") box.status = "het";
  if (box.quantityLeft > 0 && box.status === "het" && patch.status !== "huy") {
    box.status = "mo";
  }
  await saveStore(store);
  return box;
}

export async function expireStaleGiuReservations(): Promise<{
  expiredPayments: number;
  expiredPickups: number;
}> {
  const store = await loadStore();
  const now = Date.now();
  let expiredPayments = 0;
  let expiredPickups = 0;

  for (const res of store.reservations) {
    if (res.paymentStatus === "pending" && res.status === "giu_cho") {
      const deadline = res.paymentExpiresAt ?? res.expiresAt;
      if (new Date(deadline).getTime() < now) {
        res.paymentStatus = "failed";
        res.status = "huy";
        await releaseBoxQuantity(store, res.boxId, res.quantity);
        expiredPayments++;
      }
    } else if (res.paymentStatus === "paid" && res.status === "giu_cho") {
      if (new Date(res.expiresAt).getTime() < now) {
        res.status = "het_han";
        expiredPickups++;
      }
    }
  }

  if (expiredPayments > 0 || expiredPickups > 0) {
    await saveStore(store);
  }

  return { expiredPayments, expiredPickups };
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
  if (!box) return { error: "박스를 찾을 수 없습니다" };
  if (box.status !== "mo" || box.quantityLeft <= 0) return { error: "박스가 매진되었습니다" };
  if (new Date(box.expiresAt).getTime() < Date.now()) return { error: "박스가 만료되었습니다" };

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
    code: reservationCode(),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    quantity: qty,
    totalVnd,
    chargeAmountUsdCents,
    platformFeeVnd,
    paymentStatus: "pending",
    paymentMethod: input.paymentMethod,
    status: "giu_cho",
    paymentExpiresAt,
    createdAt: new Date().toISOString(),
    expiresAt: paymentExpiresAt,
  };

  if (!(await holdBoxQuantity(store, box, qty))) {
    return { error: "수량이 부족합니다" };
  }

  store.reservations.unshift(reservation);
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

export async function getReservation(id: string): Promise<GiuReservation | null> {
  const store = await loadStore();
  return store.reservations.find((r) => r.id === id) ?? null;
}

export async function getReservationByCode(code: string): Promise<GiuReservation | null> {
  const store = await loadStore();
  return (
    store.reservations.find((r) => r.code.toUpperCase() === code.toUpperCase()) ?? null
  );
}

export async function listReservations(filters?: {
  phone?: string;
  customerId?: string;
  merchantId?: string;
  boxId?: string;
}): Promise<GiuReservation[]> {
  const store = await loadStore();
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
  status: GiuReservationStatus,
): Promise<GiuReservation | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === id);
  if (!res) return null;
  res.status = status;
  if (status === "da_lay") {
    const merchant = store.merchants.find((m) => m.id === res.merchantId);
    if (merchant) {
      merchant.rescuedBoxes += res.quantity;
      maybeAutoVerifyMerchant(store, merchant.id);
    }
    if (res.paymentStatus === "paid" && res.settlementStatus === "held") {
      res.settlementStatus = "released";
      res.settledAt = new Date().toISOString();
      if (merchant) queueMerchantPayout(store, res, merchant);
    }
  }
  await saveStore(store);
  return res;
}

export async function cancelReservation(id: string): Promise<GiuReservation | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === id);
  if (!res || res.status !== "giu_cho") return null;
  if (res.paymentStatus === "pending") {
    await releaseBoxQuantity(store, res.boxId, res.quantity);
  } else if (res.paymentStatus === "paid") {
    await releaseBoxQuantity(store, res.boxId, res.quantity);
  }
  res.status = "huy";
  if (res.paymentStatus === "paid") {
    res.paymentStatus = "refunded";
    res.settlementStatus = "refunded";
  } else if (res.paymentStatus === "pending") {
    res.paymentStatus = "failed";
  }
  await saveStore(store);
  return res;
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
  const completedReservations = store.reservations.filter((r) => r.status === "da_lay");
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
    Pick<GiuMerchant, "name" | "address" | "addressHint" | "phone" | "category" | "district" | "bankName" | "bankAccount" | "bankHolder">
  >,
): Promise<GiuMerchant | null> {
  const store = await loadStore();
  const merchant = store.merchants.find((m) => m.accountId === accountId);
  if (!merchant) return null;
  if (patch.name?.trim()) merchant.name = patch.name.trim();
  if (patch.address?.trim()) merchant.address = patch.address.trim();
  if (patch.addressHint !== undefined) merchant.addressHint = patch.addressHint?.trim() || undefined;
  if (patch.phone?.trim()) merchant.phone = normalizePhone(patch.phone);
  if (patch.category) merchant.category = patch.category;
  if (patch.district) merchant.district = patch.district;
  if (patch.bankName !== undefined) merchant.bankName = patch.bankName?.trim() || undefined;
  if (patch.bankAccount !== undefined) merchant.bankAccount = patch.bankAccount?.trim() || undefined;
  if (patch.bankHolder !== undefined) merchant.bankHolder = patch.bankHolder?.trim() || undefined;
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
    (r) => r.boxId === boxId && r.paymentStatus === "paid" && r.status === "giu_cho",
  );
  if (awaiting) return { error: "픽업 대기 주문이 있어 삭제할 수 없어요" };
  store.boxes = store.boxes.filter((b) => b.id !== boxId);
  await saveStore(store);
  return { ok: true };
}

export async function republishBox(
  merchantId: string,
  sourceBoxId: string,
): Promise<GiuBox | { error: string }> {
  const store = await loadStore();
  const source = store.boxes.find((b) => b.id === sourceBoxId && b.merchantId === merchantId);
  if (!source) return { error: "상품을 찾을 수 없어요" };
  return cloneBoxForRepublish(store, source);
}

export async function republishLastBox(
  merchantId: string,
): Promise<GiuBox | { error: string }> {
  const store = await loadStore();
  const last = store.boxes
    .filter((b) => b.merchantId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!last) return { error: "이전 박스가 없어요. 먼저 한 번 등록해 주세요." };
  return cloneBoxForRepublish(store, last);
}

async function cloneBoxForRepublish(
  store: GiuStore,
  source: GiuBox,
): Promise<GiuBox | { error: string }> {
  const win = defaultPickupWindow(2);
  const box: GiuBox = {
    id: newId("box"),
    merchantId: source.merchantId,
    title: source.title,
    description: source.description,
    imageUrl: source.imageUrl,
    category: source.category,
    originalPriceVnd: source.originalPriceVnd,
    salePriceVnd: source.salePriceVnd,
    quantityTotal: source.quantityTotal,
    quantityLeft: source.quantityTotal,
    pickupStart: win.start,
    pickupEnd: win.end,
    freshnessNote: source.freshnessNote,
    status: "mo",
    createdAt: new Date().toISOString(),
    expiresAt: win.expires,
  };
  store.boxes.unshift(box);
  await saveStore(store);
  return box;
}

export async function confirmPickupByCode(
  merchantId: string,
  code: string,
): Promise<GiuReservation | { error: string }> {
  const normalized = code.trim().toUpperCase();
  const store = await loadStore();
  const res = store.reservations.find(
    (r) =>
      r.merchantId === merchantId &&
      r.code.toUpperCase() === normalized &&
      r.paymentStatus === "paid" &&
      r.status === "giu_cho",
  );
  if (!res) return { error: "코드를 찾을 수 없거나 이미 처리됐어요" };
  return await finalizePickup(store, res, merchantId);
}

export async function confirmPickupByToken(
  merchantId: string,
  token: string,
): Promise<GiuReservation | { error: string }> {
  const { verifyPickupQrToken } = await import("@/giu/lib/pickup-qr");
  const verified = verifyPickupQrToken(token);
  if (!verified) return { error: "QR이 만료되었거나 올바르지 않아요. 손님 화면에서 새 QR이 보이면 다시 스캔하세요." };
  const store = await loadStore();
  const res = store.reservations.find(
    (r) =>
      r.id === verified.reservationId &&
      r.merchantId === merchantId &&
      r.paymentStatus === "paid",
  );
  if (!res) return { error: "주문을 찾을 수 없어요" };
  if (res.status === "da_lay") return res;
  if (res.status !== "giu_cho") return { error: "픽업 대기 상태가 아니에요" };
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
  if (res.status === "da_lay") return Promise.resolve(res);
  if (res.status !== "giu_cho" || res.paymentStatus !== "paid") {
    return Promise.resolve({ error: "픽업 대기 상태가 아니에요" });
  }
  res.status = "da_lay";
  const merchant = store.merchants.find((m) => m.id === merchantId);
  if (merchant) {
    merchant.rescuedBoxes += res.quantity;
    maybeAutoVerifyMerchant(store, merchant.id);
    if (res.settlementStatus === "held") {
      res.settlementStatus = "released";
      res.settledAt = new Date().toISOString();
      queueMerchantPayout(store, res, merchant);
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
  if (res.status !== "da_lay") return { error: "픽업 완료 후에 리뷰를 남길 수 있어요" };
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

export { defaultPickupWindow };
