import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";
import { useKvStore } from "../kv-config";
import { kvGetSafe } from "../kv-safe";

const KV_USERS_KEY = "matchcut:users";

export type MatchCutUser = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
  sessionVersion: number;
};

type UserStore = { users: MatchCutUser[] };

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "matchcut-users.json");

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
    return (await kvGetSafe<UserStore>(KV_USERS_KEY)) ?? { users: [] };
  }
  return readFileStore();
}

async function saveStore(store: UserStore) {
  if (useKvStore()) {
    await kv.set(KV_USERS_KEY, store);
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  await writeFileStore(store);
}

export async function findMatchCutUserByEmail(email: string): Promise<MatchCutUser | null> {
  const store = await ensureStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function findMatchCutUserById(id: string): Promise<MatchCutUser | null> {
  const store = await ensureStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export async function createMatchCutUser(input: {
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<MatchCutUser> {
  const store = await ensureStore();
  const normalized = input.email.trim().toLowerCase();
  if (store.users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error("EMAIL_TAKEN");
  }
  const user: MatchCutUser = {
    id: randomUUID(),
    email: normalized,
    passwordHash: input.passwordHash,
    displayName: input.displayName.trim() || "셀러",
    createdAt: new Date().toISOString(),
    sessionVersion: 0,
  };
  store.users.push(user);
  await saveStore(store);
  return user;
}

export async function bumpMatchCutSessionVersion(userId: string): Promise<number> {
  const store = await ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await saveStore(store);
  return user.sessionVersion;
}
