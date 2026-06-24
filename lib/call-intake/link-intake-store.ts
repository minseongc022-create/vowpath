import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";
import { useKvStore } from "../kv-config";
import type { JobPriority } from "../types";

/** Time to submit the form on first visit */
const NEW_INTAKE_TTL_SECONDS = 86_400;
/** After submit: same link stays open for view / edit */
const LINK_ACCESS_TTL_SECONDS = 14 * 86_400;
const DATA_DIR = path.join(process.cwd(), "data");
const LINK_FILE = path.join(DATA_DIR, "link-intake-sessions.json");

export type LinkIntakeSession = {
  token: string;
  userId: string;
  callSid: string;
  from: string;
  to: string;
  menuPriority: JobPriority | null;
  shopName?: string;
  createdAt: string;
  expiresAt: string;
  /** Set when customer submits the link form */
  usedAt?: string;
  bookingId?: string;
  callId?: string;
  customerPhone?: string;
  customerName?: string;
};

type LinkStore = { sessions: Record<string, LinkIntakeSession> };

function kvKey(token: string) {
  return `vowroad:link-intake:${token}`;
}

async function readFileStore(): Promise<LinkStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(LINK_FILE, "utf-8");
    return JSON.parse(raw) as LinkStore;
  } catch {
    return { sessions: {} };
  }
}

async function writeFileStore(store: LinkStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(LINK_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function ttlForSession(session: LinkIntakeSession): number {
  return session.usedAt ? LINK_ACCESS_TTL_SECONDS : NEW_INTAKE_TTL_SECONDS;
}

export async function saveLinkIntakeSession(session: LinkIntakeSession): Promise<void> {
  const ex = ttlForSession(session);
  if (useKvStore()) {
    await kv.set(kvKey(session.token), session, { ex });
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store.sessions[session.token] = session;
  await writeFileStore(store);
}

export async function getLinkIntakeSession(
  token: string,
): Promise<LinkIntakeSession | null> {
  if (!token) return null;
  if (useKvStore()) {
    return (await kvGetSafe<LinkIntakeSession>(kvKey(token))) ?? null;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  return store.sessions[token] ?? null;
}

export function isLinkIntakeSessionExpired(
  session: LinkIntakeSession | null,
): boolean {
  if (!session) return true;
  return new Date(session.expiresAt).getTime() <= Date.now();
}

/** First-time SMS link form (not yet submitted). */
export function canSubmitLinkIntakeForm(
  session: LinkIntakeSession | null,
): boolean {
  if (!session || session.usedAt) return false;
  return !isLinkIntakeSessionExpired(session);
}

/** Return visit: view / edit prior link submission. */
export function isLinkIntakePortalOpen(
  session: LinkIntakeSession | null,
): boolean {
  if (!session || !session.usedAt) return false;
  return !isLinkIntakeSessionExpired(session);
}

/** @deprecated Use canSubmitLinkIntakeForm */
export function isLinkIntakeSessionValid(session: LinkIntakeSession | null): boolean {
  return canSubmitLinkIntakeForm(session);
}

export async function completeLinkIntakeSession(
  token: string,
  meta: {
    bookingId: string;
    callId: string;
    customerPhone: string;
    customerName: string;
  },
): Promise<void> {
  const session = await getLinkIntakeSession(token);
  if (!session) return;
  const now = new Date();
  const updated: LinkIntakeSession = {
    ...session,
    usedAt: now.toISOString(),
    bookingId: meta.bookingId,
    callId: meta.callId,
    customerPhone: meta.customerPhone,
    customerName: meta.customerName,
    expiresAt: new Date(now.getTime() + LINK_ACCESS_TTL_SECONDS * 1000).toISOString(),
  };
  await saveLinkIntakeSession(updated);
}

/** @deprecated Use completeLinkIntakeSession */
export async function markLinkIntakeUsed(token: string): Promise<void> {
  const session = await getLinkIntakeSession(token);
  if (!session?.bookingId || !session.callId) return;
  await completeLinkIntakeSession(token, {
    bookingId: session.bookingId,
    callId: session.callId,
    customerPhone: session.customerPhone ?? session.from,
    customerName: session.customerName ?? "Customer",
  });
}
