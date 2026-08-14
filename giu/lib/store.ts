import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type {
  GiuBox,
  GiuBoxStatus,
  GiuMerchant,
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

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function reservationCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function defaultStore(): GiuStore {
  return {
    merchants: [...SEED_MERCHANTS],
    boxes: [...SEED_BOXES],
    reservations: [],
    waitlist: [],
  };
}

function normalizeStore(raw: Partial<GiuStore>): GiuStore {
  const base = defaultStore();
  return {
    merchants: raw.merchants?.length ? raw.merchants : base.merchants,
    boxes: raw.boxes?.length ? raw.boxes : base.boxes,
    reservations: raw.reservations ?? [],
    waitlist: raw.waitlist ?? [],
  };
}

async function loadStore(): Promise<GiuStore> {
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

export async function getMerchantByPhone(phone: string): Promise<GiuMerchant | null> {
  const store = await loadStore();
  const normalized = phone.replace(/\s/g, "");
  return store.merchants.find((m) => m.phone.replace(/\s/g, "") === normalized) ?? null;
}

export async function createMerchant(
  input: Omit<
    GiuMerchant,
    "id" | "slug" | "verified" | "rating" | "reviewCount" | "rescuedBoxes" | "createdAt"
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
    slug,
    verified: false,
    rating: 0,
    reviewCount: 0,
    rescuedBoxes: 0,
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

export async function createReservation(input: {
  boxId: string;
  customerName: string;
  customerPhone: string;
  quantity?: number;
}): Promise<{ reservation: GiuReservation; box: GiuBox } | { error: string }> {
  const store = await loadStore();
  const box = store.boxes.find((b) => b.id === input.boxId);
  if (!box) return { error: "Không tìm thấy hộp" };
  if (box.status !== "mo" || box.quantityLeft <= 0) return { error: "Hộp đã hết" };
  if (new Date(box.expiresAt).getTime() < Date.now()) return { error: "Hộp đã hết hạn" };

  const qty = input.quantity ?? 1;
  if (qty > box.quantityLeft) return { error: "Không đủ số lượng" };

  const holdMinutes = 60;
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

  const reservation: GiuReservation = {
    id: newId("res"),
    boxId: box.id,
    merchantId: box.merchantId,
    code: reservationCode(),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    quantity: qty,
    totalVnd: box.salePriceVnd * qty,
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
  merchantId?: string;
  boxId?: string;
}): Promise<GiuReservation[]> {
  const store = await loadStore();
  return store.reservations
    .filter((r) => {
      if (filters?.phone && r.customerPhone !== filters.phone) return false;
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
  };
}

export { defaultPickupWindow };
