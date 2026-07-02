import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import { normalizeOwnerSignupPhone } from "./owner-phone-policy";
import { isValidBusinessEmail } from "./us-contact";
import type { PlanId } from "./constants";
import { normalizeSmsPhone } from "./phone";
import type { SubscriptionStatus } from "./billing";

const KV_USERS_KEY = "effiroad:users";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  shopName: string;
  phone?: string;
  createdAt: string;
  plan?: PlanId;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  flexBillableCount?: number;
  paidAt?: string;
  sessionVersion?: number;
  passwordChangedAt?: string;
  /** 14-day free trial from signup — checked by isEntitled() while subscriptionStatus is "trialing". */
  trialEndsAt?: string;
  feedbackText?: string;
  feedbackSubmittedAt?: string;
  /** Set when the user gives trial-end feedback and unlocks the $129/mo intro rate. */
  discountCohort?: "beta_feedback";
  /** When the cron in api/cron/beta-cohort-price-step should step their price 129 -> 159. */
  betaCohortPriceStepAt?: string;
  betaCohortSteppedAt?: string;
};

type UserStore = {
  users: UserRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function readFileStore(): Promise<UserStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(USERS_FILE, "utf-8");
    return JSON.parse(raw) as UserStore;
  } catch {
    return { users: [] };
  }
}

async function writeFileStore(store: UserStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function ensureStore(): Promise<UserStore> {
  if (useKvStore()) {
    const data = await kvGetSafe<UserStore>(KV_USERS_KEY);
    return data ?? { users: [] };
  }
  return readFileStore();
}

async function saveStore(store: UserStore) {
  if (useKvStore()) {
    await kv.set(KV_USERS_KEY, store);
    return;
  }
  if (process.env.VERCEL === "1") {
    throw new Error("KV_REQUIRED");
  }
  await writeFileStore(store);
}

export async function findUserByEmail(
  email: string,
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email === normalized);
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  return store.users.find((u) => u.id === id);
}

export async function findUserByPhone(
  phone: string,
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const target = normalizeSmsPhone(phone) ?? phone.replace(/\s/g, "");
  return store.users.find((u) => {
    if (!u.phone) return false;
    const stored = normalizeSmsPhone(u.phone) ?? u.phone.replace(/\s/g, "");
    return stored === target;
  });
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return undefined;
  user.passwordHash = passwordHash;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.passwordChangedAt = new Date().toISOString();
  await saveStore(store);
  return user;
}

export async function updateUserPhone(
  userId: string,
  phone: string,
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return undefined;

  const phoneNorm = normalizeOwnerSignupPhone(user.email, phone);
  if (!phoneNorm) throw new Error("PHONE_INVALID");

  const phoneTaken = store.users.some((u) => {
    if (u.id === userId || !u.phone) return false;
    const stored = normalizeSmsPhone(u.phone) ?? u.phone.replace(/\s/g, "");
    return stored === phoneNorm;
  });
  if (phoneTaken) {
    throw new Error("PHONE_EXISTS");
  }

  user.phone = phoneNorm;
  await saveStore(store);
  return user;
}

export async function updateUserContact(
  userId: string,
  input: { email: string; phone: string },
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return undefined;

  const email = input.email.trim().toLowerCase();
  if (!isValidBusinessEmail(email)) throw new Error("EMAIL_INVALID");

  const phoneNorm = normalizeOwnerSignupPhone(email, input.phone);
  if (!phoneNorm) throw new Error("PHONE_INVALID");

  if (store.users.some((u) => u.id !== userId && u.email === email)) {
    throw new Error("EMAIL_EXISTS");
  }

  const phoneTaken = store.users.some((u) => {
    if (u.id === userId || !u.phone) return false;
    const stored = normalizeSmsPhone(u.phone) ?? u.phone.replace(/\s/g, "");
    return stored === phoneNorm;
  });
  if (phoneTaken) throw new Error("PHONE_EXISTS");

  user.email = email;
  user.phone = phoneNorm;
  await saveStore(store);
  return user;
}

export async function updateUserShopName(
  userId: string,
  shopName: string,
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return undefined;

  const trimmed = shopName.trim();
  if (!trimmed) throw new Error("SHOP_NAME_REQUIRED");

  user.shopName = trimmed.slice(0, 80);
  await saveStore(store);
  return user;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  shopName: string;
  phone?: string;
}): Promise<UserRecord> {
  const store = await ensureStore();
  const normalized = input.email.trim().toLowerCase();

  if (store.users.some((u) => u.email === normalized)) {
    throw new Error("EMAIL_EXISTS");
  }

  const phoneTrim = input.phone?.trim();
  if (!phoneTrim) {
    throw new Error("PHONE_REQUIRED");
  }

  const phoneNorm = normalizeOwnerSignupPhone(normalized, phoneTrim);
  if (!phoneNorm) throw new Error("PHONE_INVALID");

  const phoneTaken = store.users.some((u) => {
    if (!u.phone) return false;
    const stored = normalizeSmsPhone(u.phone) ?? u.phone.replace(/\s/g, "");
    return stored === phoneNorm;
  });
  if (phoneTaken) {
    throw new Error("PHONE_EXISTS");
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash: input.passwordHash,
    shopName: input.shopName.trim() || "My Restoration Co",
    phone: phoneNorm,
    createdAt: now.toISOString(),
    sessionVersion: 0,
    subscriptionStatus: "trialing",
    trialEndsAt: trialEndsAt.toISOString(),
  };

  store.users.push(user);
  await saveStore(store);
  return user;
}

export async function updateUserBilling(
  userId: string,
  patch: {
    plan?: PlanId;
    paddleCustomerId?: string;
    paddleSubscriptionId?: string;
    subscriptionStatus?: SubscriptionStatus;
    flexBillableCount?: number;
    paidAt?: string;
    trialEndsAt?: string;
    feedbackText?: string;
    feedbackSubmittedAt?: string;
    discountCohort?: "beta_feedback";
    betaCohortPriceStepAt?: string;
    betaCohortSteppedAt?: string;
  },
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return undefined;
  Object.assign(user, patch);
  await saveStore(store);
  return user;
}

export async function findUserByPaddleCustomerId(
  customerId: string,
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  return store.users.find((u) => u.paddleCustomerId === customerId);
}

export async function listUsers(): Promise<UserRecord[]> {
  const store = await ensureStore();
  return [...store.users];
}

export async function deleteUserFromStore(userId: string): Promise<boolean> {
  const store = await ensureStore();
  const before = store.users.length;
  store.users = store.users.filter((u) => u.id !== userId);
  if (store.users.length === before) return false;
  await saveStore(store);
  return true;
}

export async function incrementFlexBillableCount(
  userId: string,
): Promise<UserRecord | undefined> {
  const store = await ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return undefined;
  user.flexBillableCount = (user.flexBillableCount ?? 0) + 1;
  await saveStore(store);
  return user;
}
