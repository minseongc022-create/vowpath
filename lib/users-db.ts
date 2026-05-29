import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";

const KV_USERS_KEY = "vowpath:users";

function useKvStore(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

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
    const data = await kv.get<UserStore>(KV_USERS_KEY);
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
  const normalized = phone.replace(/\s/g, "");
  return store.users.find((u) => u.phone === normalized);
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

  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash: input.passwordHash,
    shopName: input.shopName.trim() || "My HVAC Shop",
    phone: input.phone?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  await saveStore(store);
  return user;
}
