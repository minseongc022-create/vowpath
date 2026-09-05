import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { isDatabaseConfigured, prisma } from "./db";
import type { BookingCallRecord, BookingCallStatus } from "./types";

/**
 * 하루위드가 대신 건 예약 전화의 기록.
 *
 * companion-store / notification-store와 같은 계약을 따른다: 운영 DB가 있으면 DB, 로컬 개발은
 * 파일, 배포됐는데 DB가 없으면 조용히 파일로 새지 않고 곧바로 에러를 낸다. 다만 여기는 표가
 * 하나뿐이라 파일을 셋으로 쪼개지 않고 한 파일 안에서 백엔드를 가른다.
 *
 * 이 기록이 서버에 있어야 하는 이유: 혼자 쓰는 계획은 브라우저에만 있는데, 통화 결과는 사용자가
 * 앱을 닫은 뒤에 통화 서비스 쪽에서 웹훅으로 돌아온다. 받아둘 곳이 여기밖에 없다.
 */

const DATA_DIR = join(process.cwd(), ".data", "dajeong");
const STORE_FILE = join(DATA_DIR, "booking-calls.json");

function isDeployed(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function useDatabase(): boolean {
  if (isDatabaseConfigured()) return true;
  if (isDeployed()) {
    throw new Error(
      "하루위드 예약 전화 기능은 DAJEONG_DATABASE_URL이 설정된 운영 DB가 필요해. " +
      "파일 저장소는 로컬 개발 전용 대체 수단입니다.",
    );
  }
  return false;
}

export function newBookingCallId(): string {
  return `call_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

// ── 파일 백엔드(로컬 개발 전용) ──────────────────────────────────────────

type FileStore = { calls: Record<string, BookingCallRecord> };

async function loadFile(): Promise<FileStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<FileStore>;
    return { calls: parsed.calls ?? {} };
  } catch {
    return { calls: {} };
  }
}

async function saveFile(store: FileStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

// ── DB 백엔드 ────────────────────────────────────────────────────────────

type BookingCallRow = {
  id: string;
  planId: string;
  taskId: string;
  ownerId: string;
  providerCallId: string | null;
  toNumber: string;
  placeName: string;
  status: string;
  outcome: string | null;
  confirmedDetail: string | null;
  offeredAlternative: string | null;
  quotedAmount: number | null;
  cancellationTerms: string | null;
  summary: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
};

function fromRow(row: BookingCallRow): BookingCallRecord {
  return {
    id: row.id,
    planId: row.planId,
    taskId: row.taskId,
    ownerId: row.ownerId,
    providerCallId: row.providerCallId ?? undefined,
    toNumber: row.toNumber,
    placeName: row.placeName,
    status: row.status as BookingCallStatus,
    outcome: (row.outcome ?? undefined) as BookingCallRecord["outcome"],
    confirmedDetail: row.confirmedDetail ?? undefined,
    offeredAlternative: row.offeredAlternative ?? undefined,
    quotedAmount: row.quotedAmount ?? undefined,
    cancellationTerms: row.cancellationTerms ?? undefined,
    summary: row.summary ?? undefined,
    failureReason: row.failureReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    endedAt: row.endedAt?.toISOString(),
  };
}

function toRowData(record: Partial<BookingCallRecord>) {
  return {
    ...(record.providerCallId !== undefined ? { providerCallId: record.providerCallId ?? null } : {}),
    ...(record.status !== undefined ? { status: record.status } : {}),
    ...(record.outcome !== undefined ? { outcome: record.outcome ?? null } : {}),
    ...(record.confirmedDetail !== undefined ? { confirmedDetail: record.confirmedDetail ?? null } : {}),
    ...(record.offeredAlternative !== undefined ? { offeredAlternative: record.offeredAlternative ?? null } : {}),
    ...(record.quotedAmount !== undefined ? { quotedAmount: record.quotedAmount ?? null } : {}),
    ...(record.cancellationTerms !== undefined ? { cancellationTerms: record.cancellationTerms ?? null } : {}),
    ...(record.summary !== undefined ? { summary: record.summary ?? null } : {}),
    ...(record.failureReason !== undefined ? { failureReason: record.failureReason ?? null } : {}),
    ...(record.endedAt !== undefined ? { endedAt: record.endedAt ? new Date(record.endedAt) : null } : {}),
  };
}

// ── 공개 API ─────────────────────────────────────────────────────────────

export async function createBookingCall(record: BookingCallRecord): Promise<BookingCallRecord> {
  if (useDatabase()) {
    const row = await prisma.dajeongBookingCall.create({
      data: {
        id: record.id,
        planId: record.planId,
        taskId: record.taskId,
        ownerId: record.ownerId,
        providerCallId: record.providerCallId ?? null,
        toNumber: record.toNumber,
        placeName: record.placeName,
        status: record.status,
      },
    });
    return fromRow(row as BookingCallRow);
  }
  const store = await loadFile();
  store.calls[record.id] = record;
  await saveFile(store);
  return record;
}

export async function updateBookingCall(id: string, patch: Partial<BookingCallRecord>): Promise<BookingCallRecord | null> {
  if (useDatabase()) {
    const row = await prisma.dajeongBookingCall.update({ where: { id }, data: toRowData(patch) }).catch(() => null);
    return row ? fromRow(row as BookingCallRow) : null;
  }
  const store = await loadFile();
  const existing = store.calls[id];
  if (!existing) return null;
  const next: BookingCallRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  store.calls[id] = next;
  await saveFile(store);
  return next;
}

export async function getBookingCall(id: string): Promise<BookingCallRecord | null> {
  if (useDatabase()) {
    const row = await prisma.dajeongBookingCall.findUnique({ where: { id } });
    return row ? fromRow(row as BookingCallRow) : null;
  }
  const store = await loadFile();
  return store.calls[id] ?? null;
}

/** 통화 서비스가 웹훅으로 알려주는 건 자기네 통화 id뿐이라, 그걸로 우리 기록을 찾아야 한다. */
export async function getBookingCallByProviderId(providerCallId: string): Promise<BookingCallRecord | null> {
  if (useDatabase()) {
    const row = await prisma.dajeongBookingCall.findUnique({ where: { providerCallId } });
    return row ? fromRow(row as BookingCallRow) : null;
  }
  const store = await loadFile();
  return Object.values(store.calls).find((call) => call.providerCallId === providerCallId) ?? null;
}

export async function listBookingCallsForPlan(planId: string, ownerId: string): Promise<BookingCallRecord[]> {
  if (useDatabase()) {
    const rows = await prisma.dajeongBookingCall.findMany({ where: { planId, ownerId }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => fromRow(row as BookingCallRow));
  }
  const store = await loadFile();
  return Object.values(store.calls)
    .filter((call) => call.planId === planId && call.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 같은 항목에 이미 걸고 있는 전화가 있으면 또 걸면 안 된다 — 가게에 두 번 전화가 간다. */
export async function activeCallForTask(planId: string, taskId: string): Promise<BookingCallRecord | null> {
  if (useDatabase()) {
    const row = await prisma.dajeongBookingCall.findFirst({
      where: { planId, taskId, status: { in: ["queued", "in_progress"] } },
      orderBy: { createdAt: "desc" },
    });
    return row ? fromRow(row as BookingCallRow) : null;
  }
  const store = await loadFile();
  return Object.values(store.calls).find(
    (call) => call.planId === planId && call.taskId === taskId && (call.status === "queued" || call.status === "in_progress"),
  ) ?? null;
}
