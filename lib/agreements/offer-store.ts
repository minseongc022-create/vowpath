import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";
import { useKvStore } from "../kv-config";
import type { AgreementOfferSession } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const OFFER_FILE = path.join(DATA_DIR, "agreement-offers.json");
const OFFER_TTL_SECONDS = 14 * 86_400;

type OfferStore = { sessions: Record<string, AgreementOfferSession> };

function kvKey(token: string) {
  return `effiroad:agreement-offer:${token}`;
}

async function readFileStore(): Promise<OfferStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(OFFER_FILE, "utf-8");
    return JSON.parse(raw) as OfferStore;
  } catch {
    return { sessions: {} };
  }
}

async function writeFileStore(store: OfferStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OFFER_FILE, JSON.stringify(store, null, 2), "utf-8");
}

import { randomBytes } from "crypto";

export function newOfferToken(): string {
  return `pm_${randomBytes(16).toString("hex")}`;
}

export async function createAgreementOfferSession(
  session: Omit<AgreementOfferSession, "token" | "createdAt" | "expiresAt"> & {
    expiresDays?: number;
  },
): Promise<AgreementOfferSession> {
  const token = newOfferToken();
  const createdAt = new Date().toISOString();
  const days = session.expiresDays ?? 14;
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  const full: AgreementOfferSession = {
    ...session,
    token,
    createdAt,
    expiresAt,
  };

  if (useKvStore()) {
    await kv.set(kvKey(token), full, { ex: OFFER_TTL_SECONDS });
  } else {
    const store = await readFileStore();
    store.sessions[token] = full;
    await writeFileStore(store);
  }
  return full;
}

export async function getAgreementOfferSession(token: string): Promise<AgreementOfferSession | null> {
  if (useKvStore()) {
    return (await kvGetSafe<AgreementOfferSession>(kvKey(token))) ?? null;
  }
  const store = await readFileStore();
  const session = store.sessions[token];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session;
}

export async function markAgreementOfferUsed(
  token: string,
  agreementId: string,
): Promise<AgreementOfferSession | null> {
  const session = await getAgreementOfferSession(token);
  if (!session || session.usedAt) return null;

  const updated: AgreementOfferSession = {
    ...session,
    usedAt: new Date().toISOString(),
    agreementId,
  };

  if (useKvStore()) {
    await kv.set(kvKey(token), updated, { ex: OFFER_TTL_SECONDS });
  } else {
    const store = await readFileStore();
    store.sessions[token] = updated;
    await writeFileStore(store);
  }
  return updated;
}
