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
  GiuStore,
  GiuWaitlistEntry,
} from "./types";
import { defaultPickupWindow, slugify } from "./format";
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
  };
}

function migrateMerchant(merchant: GiuMerchant): GiuMerchant {
  return {
    ...merchant,
    accountId: merchant.accountId ?? `acc_legacy_${merchant.id}`,
    market: merchant.market ?? "vn",
  };
}

function migrateReservation(reservation: GiuReservation): GiuReservation {
  return {
    ...reservation,
    customerId: reservation.customerId ?? "legacy",
    paymentStatus: reservation.paymentStatus ?? "paid",
    platformFeeVnd:
      reservation.platformFeeVnd ??
      Math.round(reservation.totalVnd * GIU_BRAND.commissionRate),
  };
}

function normalizeStore(raw: Partial<GiuStore>): GiuStore {
  const base = defaultStore();
  return {
    merchants: (raw.merchants?.length ? raw.merchants : base.merchants).map(migrateMerchant),
    boxes: raw.boxes?.length ? raw.boxes : base.boxes,
    reservations: (raw.reservations ?? []).map(migrateReservation),
    waitlist: raw.waitlist ?? [],
    accounts: raw.accounts ?? [],
  };
}

async function loadStore(): Promise<GiuStore> {
  if (kvConfigured()) {
    const raw = await kvGetSafe<GiuStore>(KV_STORE_KEY);
    if (raw) return normalizeStore(raw);
    const store = defaultStore();
    await saveStore(store);
    return store;
  }

  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(STORE_FILE, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<GiuStore>);
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
    return { error: "Email đã được đăng ký" };
  }
  const phone = normalizePhone(input.phone);
  if (store.accounts.some((a) => a.phone === phone)) {
    return { error: "Số điện thoại đã được đăng ký" };
  }
  const account: GiuAccount = {
    id: newId("acc"),
    role: "customer",
    email,
    phone,
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    market: input.market ?? "vn",
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
    return { error: "Email đã được đăng ký" };
  }
  const phone = normalizePhone(input.phone);
  if (store.accounts.some((a) => a.phone === phone)) {
    return { error: "Số điện thoại đã được đăng ký" };
  }
  if (store.merchants.some((m) => normalizePhone(m.phone) === phone)) {
    return { error: "Quán với SĐT này đã tồn tại — hãy đăng nhập" };
  }

  const account: GiuAccount = {
    id: newId("acc"),
    role: "merchant",
    email,
    phone,
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    market: input.market ?? "vn",
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
    market: input.market ?? "vn",
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
  if (!account) return { error: "Email hoặc mật khẩu không đúng" };
  if (input.role && account.role !== input.role) {
    return { error: "Tài khoản không đúng loại đăng nhập" };
  }
  const ok = await verifyPassword(input.password, account.passwordHash);
  if (!ok) return { error: "Email hoặc mật khẩu không đúng" };
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
    market: "vn",
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
}): Promise<GiuBox[]> {
  const store = await loadStore();
  const now = Date.now();
  return store.boxes
    .filter((b) => {
      if (filters?.merchantId && b.merchantId !== filters.merchantId) return false;
      if (filters?.category && b.category !== filters.category) return false;
      if (filters?.status && b.status !== filters.status) return false;
      if (filters?.openOnly) {
        if (b.status !== "mo" || b.quantityLeft <= 0) return false;
        if (new Date(b.expiresAt).getTime() < now) return false;
      }
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

async function processPayment(
  method: GiuPaymentMethod,
  amountVnd: number,
): Promise<{ ok: true; paymentId: string } | { ok: false; error: string }> {
  if (amountVnd < 5000) return { ok: false, error: "Số tiền không hợp lệ" };
  // MVP: instant success. Production hooks MoMo / VNPay / Stripe here.
  void method;
  return { ok: true, paymentId: `pay_${randomBytes(6).toString("hex")}` };
}

export async function createPaidReservation(input: {
  boxId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: GiuPaymentMethod;
  quantity?: number;
}): Promise<{ reservation: GiuReservation; box: GiuBox } | { error: string }> {
  const store = await loadStore();
  const box = store.boxes.find((b) => b.id === input.boxId);
  if (!box) return { error: "Không tìm thấy hộp" };
  if (box.status !== "mo" || box.quantityLeft <= 0) return { error: "Hộp đã hết" };
  if (new Date(box.expiresAt).getTime() < Date.now()) return { error: "Hộp đã hết hạn" };

  const qty = input.quantity ?? 1;
  if (qty > box.quantityLeft) return { error: "Không đủ số lượng" };

  const totalVnd = box.salePriceVnd * qty;
  const payment = await processPayment(input.paymentMethod, totalVnd);
  if (!payment.ok) return { error: payment.error };

  const holdMinutes = 60;
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();
  const platformFeeVnd = Math.round(totalVnd * GIU_BRAND.commissionRate);

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
    platformFeeVnd,
    paymentStatus: "paid",
    paymentMethod: input.paymentMethod,
    paidAt: new Date().toISOString(),
    status: "giu_cho",
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  box.quantityLeft -= qty;
  if (box.quantityLeft <= 0) box.status = "het";

  store.reservations.unshift(reservation);
  await saveStore(store);
  return { reservation, box };
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
    if (merchant) merchant.rescuedBoxes += res.quantity;
  }
  await saveStore(store);
  return res;
}

export async function cancelReservation(id: string): Promise<GiuReservation | null> {
  const store = await loadStore();
  const res = store.reservations.find((r) => r.id === id);
  if (!res || res.status !== "giu_cho") return null;
  const box = store.boxes.find((b) => b.id === res.boxId);
  if (box) {
    box.quantityLeft += res.quantity;
    if (box.status === "het" && box.quantityLeft > 0) box.status = "mo";
  }
  res.status = "huy";
  if (res.paymentStatus === "paid") res.paymentStatus = "refunded";
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

export { defaultPickupWindow };
