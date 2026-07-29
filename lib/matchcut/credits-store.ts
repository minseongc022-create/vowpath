import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import { kvGetSafe } from "../kv-safe";
import type { CreditPackId } from "./constants";
import { WELCOME_CREDITS } from "./constants";

const KV_PREFIX = "matchcut:credits:";

export type CreditWallet = {
  userId: string;
  /** 매월 초기화 (구독) */
  subscriptionCredits: number;
  /** 영구 보관 (단건 구매·충전·웰컴) */
  permanentCredits: number;
  subscriptionPlan: CreditPackId | null;
  /** YYYY-MM — 구독 크레딧 리셋 기준 */
  subscriptionMonth: string | null;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const CREDITS_FILE = path.join(DATA_DIR, "matchcut-credits.json");

type FileStore = Record<string, CreditWallet>;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readFileStore(): Promise<FileStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(CREDITS_FILE, "utf-8");
    return JSON.parse(raw) as FileStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: FileStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CREDITS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function loadWallet(userId: string): Promise<CreditWallet | null> {
  if (useKvStore()) {
    return (await kvGetSafe<CreditWallet>(`${KV_PREFIX}${userId}`)) ?? null;
  }
  const store = await readFileStore();
  return store[userId] ?? null;
}

async function saveWallet(wallet: CreditWallet) {
  wallet.updatedAt = new Date().toISOString();
  if (useKvStore()) {
    await kv.set(`${KV_PREFIX}${wallet.userId}`, wallet);
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store[wallet.userId] = wallet;
  await writeFileStore(store);
}

export async function initWelcomeWallet(userId: string): Promise<CreditWallet> {
  const wallet: CreditWallet = {
    userId,
    subscriptionCredits: 0,
    permanentCredits: WELCOME_CREDITS,
    subscriptionPlan: null,
    subscriptionMonth: null,
    updatedAt: new Date().toISOString(),
  };
  await saveWallet(wallet);
  return wallet;
}

export async function getCreditWallet(userId: string): Promise<CreditWallet> {
  const existing = await loadWallet(userId);
  if (existing) {
    return maybeResetSubscription(existing);
  }
  return initWelcomeWallet(userId);
}

function maybeResetSubscription(wallet: CreditWallet): CreditWallet {
  const month = currentMonthKey();
  if (wallet.subscriptionPlan && wallet.subscriptionMonth !== month) {
    wallet.subscriptionMonth = month;
    // Credits refreshed on grant — don't zero here; grant sets amount
  }
  return wallet;
}

export function totalCredits(wallet: CreditWallet): number {
  return wallet.subscriptionCredits + wallet.permanentCredits;
}

export async function grantCredits(
  userId: string,
  amount: number,
  kind: "permanent" | "subscription",
  plan?: CreditPackId | null,
): Promise<CreditWallet> {
  const wallet = await getCreditWallet(userId);
  if (kind === "permanent") {
    wallet.permanentCredits += amount;
  } else {
    wallet.subscriptionCredits = amount;
    wallet.subscriptionPlan = plan ?? wallet.subscriptionPlan;
    wallet.subscriptionMonth = currentMonthKey();
  }
  await saveWallet(wallet);
  return wallet;
}

export async function debitCredits(
  userId: string,
  amount: number,
): Promise<{ wallet: CreditWallet; debited: number }> {
  if (amount <= 0) {
    return { wallet: await getCreditWallet(userId), debited: 0 };
  }
  const wallet = await getCreditWallet(userId);
  const total = totalCredits(wallet);
  if (total < amount) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  let remaining = amount;
  if (wallet.subscriptionCredits > 0) {
    const fromSub = Math.min(wallet.subscriptionCredits, remaining);
    wallet.subscriptionCredits -= fromSub;
    remaining -= fromSub;
  }
  if (remaining > 0) {
    wallet.permanentCredits -= remaining;
  }
  await saveWallet(wallet);
  return { wallet, debited: amount };
}

export type CreditBalanceView = {
  total: number;
  subscriptionCredits: number;
  permanentCredits: number;
  subscriptionPlan: CreditPackId | null;
};

export async function getCreditBalance(userId: string): Promise<CreditBalanceView> {
  const wallet = await getCreditWallet(userId);
  return {
    total: totalCredits(wallet),
    subscriptionCredits: wallet.subscriptionCredits,
    permanentCredits: wallet.permanentCredits,
    subscriptionPlan: wallet.subscriptionPlan,
  };
}
