import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";

export type CompanyAiMemory = {
  userId: string;
  serviceAreas: string;
  businessHours: string;
  holidayRules: string;
  emergencyPolicy: string;
  approvalPolicy: string;
  specialInstructions: string;
  /** Custom opening line the AI speaks before the menu, e.g. "Thanks for calling Acme — your comfort experts since 1998." Empty = default. */
  customGreeting: string;
  dailyBriefingSmsEnabled: boolean;
  dailyBriefingSmsTime: string;
  /** "YYYY-MM-DD" — callers hear a closed message on this day. Empty = no override. */
  temporaryClosureDate: string;
  /** Custom message played to callers on the closure day. Defaults to generic closed message. */
  temporaryClosureMessage: string;
  updatedAt: string;
};

export type CompanyAiMemoryInput = Omit<CompanyAiMemory, "userId" | "updatedAt">;

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "company-ai-memory.json");

type Store = Record<string, CompanyAiMemory>;

function kvKey(userId: string) {
  return `effiroad:company-ai-memory:${userId}`;
}

export function defaultCompanyAiMemory(userId: string): CompanyAiMemory {
  return {
    userId,
    serviceAreas: "",
    businessHours: "",
    holidayRules: "",
    emergencyPolicy: "",
    approvalPolicy: "",
    specialInstructions: "",
    customGreeting: "",
    dailyBriefingSmsEnabled: false,
    dailyBriefingSmsTime: "08:00",
    temporaryClosureDate: "",
    temporaryClosureMessage: "",
    updatedAt: new Date().toISOString(),
  };
}

// Free-text fields are shop-authored (typed directly or via the AI admin chat)
// but still need a ceiling: temporaryClosureMessage is spoken aloud via TTS on
// real calls, and all of these persist indefinitely in KV, so an unbounded
// string (e.g. a pasted document) shouldn't be able to blow up call cost/UX
// or storage.
const LONG_FIELD_MAX = 1000;
const SPOKEN_FIELD_MAX = 300;

function clean(input: Partial<CompanyAiMemoryInput>, userId: string): CompanyAiMemory {
  const base = defaultCompanyAiMemory(userId);
  return {
    ...base,
    serviceAreas: String(input.serviceAreas ?? "").trim().slice(0, LONG_FIELD_MAX),
    businessHours: String(input.businessHours ?? "").trim().slice(0, LONG_FIELD_MAX),
    holidayRules: String(input.holidayRules ?? "").trim().slice(0, LONG_FIELD_MAX),
    emergencyPolicy: String(input.emergencyPolicy ?? "").trim().slice(0, LONG_FIELD_MAX),
    approvalPolicy: String(input.approvalPolicy ?? "").trim().slice(0, LONG_FIELD_MAX),
    specialInstructions: String(input.specialInstructions ?? "").trim().slice(0, LONG_FIELD_MAX),
    customGreeting: String(input.customGreeting ?? "").trim().slice(0, 240),
    dailyBriefingSmsEnabled: Boolean(input.dailyBriefingSmsEnabled),
    dailyBriefingSmsTime: String(input.dailyBriefingSmsTime ?? "08:00").trim() || "08:00",
    temporaryClosureDate: String(input.temporaryClosureDate ?? "").trim(),
    temporaryClosureMessage: String(input.temporaryClosureMessage ?? "").trim().slice(0, SPOKEN_FIELD_MAX),
    updatedAt: new Date().toISOString(),
  };
}

async function readFileStore(): Promise<Store> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    return JSON.parse(await readFile(FILE, "utf-8")) as Store;
  } catch {
    return {};
  }
}

async function writeFileStore(store: Store) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function getCompanyAiMemory(userId: string): Promise<CompanyAiMemory> {
  if (useKvStore()) {
    return (
      (await kvGetSafe<CompanyAiMemory>(kvKey(userId))) ??
      defaultCompanyAiMemory(userId)
    );
  }
  const store = await readFileStore();
  return store[userId] ?? defaultCompanyAiMemory(userId);
}

export async function saveCompanyAiMemory(
  userId: string,
  input: Partial<CompanyAiMemoryInput>,
): Promise<CompanyAiMemory> {
  const record = clean(input, userId);
  if (useKvStore()) {
    await kv.set(kvKey(userId), record);
    return record;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store[userId] = record;
  await writeFileStore(store);
  return record;
}
