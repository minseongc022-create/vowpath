import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import { isValidBusinessEmail, normalizeUsBusinessPhone } from "./us-contact";
import { normalizeSmsPhone } from "./phone";

const KV_USERS_KEY = "vowpath:users";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  shopName: string;
  phone?: string;
  createdAt: string;
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

  const phoneNorm = normalizeUsBusinessPhone(phone);
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

  const phoneNorm = normalizeUsBusinessPhone(input.phone);
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

  const phoneNorm = normalizeUsBusinessPhone(phoneTrim);
  if (!phoneNorm) throw new Error("PHONE_INVALID");

  const phoneTaken = store.users.some((u) => {
    if (!u.phone) return false;
    const stored = normalizeSmsPhone(u.phone) ?? u.phone.replace(/\s/g, "");
    return stored === phoneNorm;
  });
  if (phoneTaken) {
    throw new Error("PHONE_EXISTS");
  }

  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash: input.passwordHash,
    shopName: input.shopName.trim() || "My HVAC Shop",
    phone: phoneNorm,
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  await saveStore(store);
  return user;
}
