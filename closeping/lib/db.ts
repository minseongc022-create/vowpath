import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Quote, User } from "./types";

const DATA = path.join(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    await mkdir(DATA, { recursive: true });
    const raw = await readFile(path.join(DATA, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await mkdir(DATA, { recursive: true });
  await writeFile(path.join(DATA, file), JSON.stringify(data, null, 2), "utf-8");
}

export async function listUsers(): Promise<User[]> {
  return readJson<User[]>("users.json", []);
}

export async function saveUsers(users: User[]) {
  await writeJson("users.json", users);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await listUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await listUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  shopName: string;
}): Promise<User> {
  const users = await listUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("EMAIL_TAKEN");
  }
  const user: User = {
    id: crypto.randomUUID(),
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passwordHash,
    shopName: input.shopName.trim().slice(0, 80) || "My Shop",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function listQuotes(userId: string): Promise<Quote[]> {
  const all = await readJson<Quote[]>("quotes.json", []);
  return all
    .filter((q) => q.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listAllQuotes(): Promise<Quote[]> {
  return readJson<Quote[]>("quotes.json", []);
}

export async function saveAllQuotes(quotes: Quote[]) {
  await writeJson("quotes.json", quotes);
}

export async function getQuote(userId: string, id: string): Promise<Quote | null> {
  const quotes = await listQuotes(userId);
  return quotes.find((q) => q.id === id) ?? null;
}

export async function createQuote(
  userId: string,
  input: Omit<Quote, "id" | "userId" | "status" | "chaseSentAt" | "createdAt" | "updatedAt">,
): Promise<Quote> {
  const all = await listAllQuotes();
  const now = new Date().toISOString();
  const quote: Quote = {
    ...input,
    id: crypto.randomUUID(),
    userId,
    status: "draft",
    chaseSentAt: [],
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(quote);
  await saveAllQuotes(all.slice(0, 2000));
  return quote;
}

export async function updateQuote(
  userId: string,
  id: string,
  patch: Partial<Quote>,
): Promise<Quote | null> {
  const all = await listAllQuotes();
  const idx = all.findIndex((q) => q.id === id && q.userId === userId);
  if (idx < 0) return null;
  const merged = { ...all[idx]!, ...patch, updatedAt: new Date().toISOString() };
  all[idx] = merged;
  await saveAllQuotes(all);
  return merged;
}
