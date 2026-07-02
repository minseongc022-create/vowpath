import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";

/**
 * Undo-expiry tracking for auto-confirmed bookings that never get a real calendar
 * slot (scheduling disabled — see finalize-intake.ts). Kept separate from
 * schedule-bookings-db's ScheduledBookingRecord so a placeholder "now" slot never
 * shows up in slot-availability (offer-slots.ts) or revenue-matching (revenue-sync.ts).
 */
type Store = Record<string, string>; // bookingId -> undoExpiresAt ISO string

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "instant-undo.json");

function kvKey(userId: string) {
  return `effiroad:instant-undo:${userId}`;
}

async function readFileStore(): Promise<Record<string, Store>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as Record<string, Store>;
  } catch {
    return {};
  }
}

async function writeFileStore(all: Record<string, Store>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2), "utf-8");
}

async function readStore(userId: string): Promise<Store> {
  if (useKvStore()) {
    return (await kvGetSafe<Store>(kvKey(userId))) ?? {};
  }
  const all = await readFileStore();
  return all[userId] ?? {};
}

async function writeStore(userId: string, store: Store): Promise<void> {
  if (useKvStore()) {
    await kv.set(kvKey(userId), store);
    return;
  }
  const all = await readFileStore();
  all[userId] = store;
  await writeFileStore(all);
}

export async function setInstantUndoExpiry(
  userId: string,
  bookingId: string,
  undoWindowMinutes: number,
): Promise<string> {
  const store = await readStore(userId);
  const undoAt = new Date(Date.now() + undoWindowMinutes * 60_000).toISOString();
  store[bookingId] = undoAt;
  await writeStore(userId, store);
  return undoAt;
}

/** Deletes the entry regardless of expiry — call after a successful undo, or to clean up. */
export async function clearInstantUndoExpiry(userId: string, bookingId: string): Promise<void> {
  const store = await readStore(userId);
  if (!(bookingId in store)) return;
  delete store[bookingId];
  await writeStore(userId, store);
}

/** Returns the expiry if the booking has one AND it hasn't passed yet; null otherwise. */
export async function getActiveInstantUndoExpiry(
  userId: string,
  bookingId: string,
): Promise<string | null> {
  const store = await readStore(userId);
  const expiresAt = store[bookingId];
  if (!expiresAt) return null;
  return new Date(expiresAt).getTime() > Date.now() ? expiresAt : null;
}

/** Most recent still-active instant-undo entry, if any — for replies with no explicit ref. */
export async function findMostRecentActiveInstantUndo(
  userId: string,
): Promise<{ bookingId: string; undoExpiresAt: string } | null> {
  const store = await readStore(userId);
  const now = Date.now();
  const active = Object.entries(store).filter(([, at]) => new Date(at).getTime() > now);
  if (active.length === 0) return null;
  // bookingId prefix is a sortable ULID/UUID-ish id in this codebase's usage; fall back to
  // whichever was read last if not, since exact ordering here only affects an edge case
  // (owner has 2+ un-acted auto-confirms and replies 9 with no ref).
  const [bookingId, undoExpiresAt] = active[active.length - 1];
  return { bookingId, undoExpiresAt };
}
