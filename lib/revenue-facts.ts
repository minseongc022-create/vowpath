import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";

export type RevenueFact = {
  invoiceId: string;
  invoiceNumber?: string;
  invoiceStatus: string;
  issuedDate?: string;
  collectedCents: number;
  invoicedCents: number;
  outstandingCents: number;
  jobberJobIds: string[];
  jobberRequestId?: string;
  vowpathCallId?: string;
  vowpathBookingId?: string;
  attributedToVowpath: boolean;
  jobberWebUri?: string;
  updatedAt: string;
};

export type RevenueLedger = {
  factsByInvoiceId: Record<string, RevenueFact>;
  syncedAt: string;
  rangeStart: string;
  rangeEnd: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "revenue-ledgers.json");

function kvKey(userId: string) {
  return `vowpath:revenue-ledger:${userId}`;
}

async function readFileStore(): Promise<Record<string, RevenueLedger>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as Record<string, RevenueLedger>;
  } catch {
    return {};
  }
}

async function writeFileStore(all: Record<string, RevenueLedger>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function getRevenueLedger(userId: string): Promise<RevenueLedger | null> {
  if (useKvStore()) {
    return kvGetSafe<RevenueLedger>(kvKey(userId));
  }
  const all = await readFileStore();
  return all[userId] ?? null;
}

export async function saveRevenueLedger(userId: string, ledger: RevenueLedger): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(userId), ledger);
    return;
  }
  const all = await readFileStore();
  all[userId] = ledger;
  await writeFileStore(all);
}

export function mergeRevenueFacts(
  existing: Record<string, RevenueFact>,
  incoming: RevenueFact[],
): Record<string, RevenueFact> {
  const next = { ...existing };
  for (const fact of incoming) {
    next[fact.invoiceId] = fact;
  }
  return next;
}

export function ledgerCoversRange(ledger: RevenueLedger, start: Date, end: Date): boolean {
  const syncStart = new Date(ledger.rangeStart).getTime();
  const syncEnd = new Date(ledger.rangeEnd).getTime();
  return syncStart <= start.getTime() && syncEnd >= end.getTime();
}

export const REVENUE_SYNC_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function ledgerIsStale(ledger: RevenueLedger | null, now = Date.now()): boolean {
  if (!ledger?.syncedAt) return true;
  const synced = new Date(ledger.syncedAt).getTime();
  return now - synced > REVENUE_SYNC_MAX_AGE_MS;
}
