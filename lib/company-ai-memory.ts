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
    dailyBriefingSmsEnabled: false,
    dailyBriefingSmsTime: "08:00",
    temporaryClosureDate: "",
    temporaryClosureMessage: "",
    updatedAt: new Date().toISOString(),
  };
}

function clean(input: Partial<CompanyAiMemoryInput>, userId: string): CompanyAiMemory {
  const base = defaultCompanyAiMemory(userId);
  return {
    ...base,
    serviceAreas: String(input.serviceAreas ?? "").trim(),
    businessHours: String(input.businessHours ?? "").trim(),
    holidayRules: String(input.holidayRules ?? "").trim(),
    emergencyPolicy: String(input.emergencyPolicy ?? "").trim(),
    approvalPolicy: String(input.approvalPolicy ?? "").trim(),
    specialInstructions: String(input.specialInstructions ?? "").trim(),
    dailyBriefingSmsEnabled: Boolean(input.dailyBriefingSmsEnabled),
    dailyBriefingSmsTime: String(input.dailyBriefingSmsTime ?? "08:00").trim() || "08:00",
    temporaryClosureDate: String(input.temporaryClosureDate ?? "").trim(),
    temporaryClosureMessage: String(input.temporaryClosureMessage ?? "").trim(),
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
