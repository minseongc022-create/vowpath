/**
 * 자비스 저장소
 *
 * ★ 옛 저장소와 완전히 분리된 키를 쓴다
 *
 * 옛 toss-shop 저장소에는 옛 엔진이 만든 초안이 남아 있다 — 2,700만원짜리
 * 태블릿 케이스가 그중 하나다. 엔진을 고쳐도 **이미 만들어진 초안은 소급해서
 * 바뀌지 않기 때문에** 화면에 계속 떴다. 새 키로 시작하면 그 오염이 구조적으로
 * 넘어오지 않는다.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { DEFAULT_SETTINGS, type Draft, type JarvisState } from "./types";

export const JARVIS_STATE_VERSION = "2.0";

const KV_KEY = "jarvis:state:v2";
const DATA_DIR = join(process.cwd(), ".data");
const STATE_FILE = join(DATA_DIR, "jarvis-state.json");

/** 대화·초안이 무한히 쌓이지 않게 — 오래된 것부터 잘라낸다 */
const MAX_CHAT_TURNS = 200;
const MAX_DRAFTS = 300;
const MAX_CANDIDATES = 120;

function emptyState(): JarvisState {
  return {
    version: JARVIS_STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    candidates: [],
    drafts: [],
    chat: [],
  };
}

/**
 * 저장된 값을 지금 타입에 맞게 채운다.
 *
 * 필드가 빠진 옛 데이터를 그대로 쓰면 `undefined.map is not a function` 같은
 * 런타임 오류가 화면에서 터진다. 읽는 쪽에서 매번 방어하는 대신 여기서 한 번만 맞춘다.
 */
function normalize(raw: Partial<JarvisState> | null): JarvisState {
  const base = emptyState();
  if (!raw) return base;
  return {
    version: JARVIS_STATE_VERSION,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    candidates: Array.isArray(raw.candidates) ? raw.candidates : [],
    drafts: Array.isArray(raw.drafts) ? raw.drafts : [],
    chat: Array.isArray(raw.chat) ? raw.chat : [],
    lastSourcingRun: raw.lastSourcingRun,
    lastAutopilotAt: raw.lastAutopilotAt,
    activity: raw.activity,
  };
}

export async function loadState(): Promise<JarvisState> {
  if (useKvStore()) {
    const raw = await kvGetSafe<JarvisState>(KV_KEY);
    return normalize(raw);
  }
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<JarvisState>);
  } catch {
    return emptyState();
  }
}

export async function saveState(state: JarvisState): Promise<void> {
  // 잘라내기는 저장 직전에 한 번만 — 여러 곳에서 하면 기준이 어긋난다
  const trimmed: JarvisState = {
    ...state,
    version: JARVIS_STATE_VERSION,
    chat: state.chat.slice(-MAX_CHAT_TURNS),
    drafts: state.drafts.slice(0, MAX_DRAFTS),
    candidates: state.candidates.slice(0, MAX_CANDIDATES),
  };

  if (useKvStore()) {
    await kv.set(KV_KEY, trimmed);
    return;
  }
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STATE_FILE, JSON.stringify(trimmed, null, 2));
  } catch {
    // 읽기 전용 파일시스템(서버리스 로컬 실행 등) — 저장을 못 해도 요청은 살린다
  }
}

/** 읽고 → 고치고 → 저장을 한 번에. 중간에 다른 곳이 끼어들 여지를 줄인다 */
export async function mutateState<T>(
  fn: (state: JarvisState) => T | Promise<T>,
): Promise<{ state: JarvisState; result: T }> {
  const state = await loadState();
  const result = await fn(state);
  await saveState(state);
  return { state, result };
}

// ─────────────────────────────────────────────────────────────
// 초안
// ─────────────────────────────────────────────────────────────

export function pendingDrafts(state: JarvisState): Draft[] {
  return state.drafts.filter((d) => d.status === "pending_review");
}

export function findDraft(state: JarvisState, draftId: string): Draft | undefined {
  return state.drafts.find((d) => d.id === draftId);
}

/**
 * 검수 대기 초안을 비운다.
 *
 * 이미 등록됐거나 등록 중인 건 건드리지 않는다 — 그건 실제로 팔리고 있는
 * 상품이라 지우면 화면과 토스의 상태가 어긋난다.
 */
export function discardPendingDrafts(state: JarvisState): number {
  const before = state.drafts.length;
  state.drafts = state.drafts.filter(
    (d) => d.status === "published" || d.status === "publishing",
  );
  return before - state.drafts.length;
}

// ─────────────────────────────────────────────────────────────
// 대화
// ─────────────────────────────────────────────────────────────

export function appendChat(
  state: JarvisState,
  turn: Omit<import("./types").ChatTurn, "id" | "at">,
): import("./types").ChatTurn {
  const full: import("./types").ChatTurn = {
    ...turn,
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
  };
  state.chat.push(full);
  return full;
}

// ─────────────────────────────────────────────────────────────
// 지금 뭐 하는 중인지
// ─────────────────────────────────────────────────────────────

export async function setActivity(label: string, done = false): Promise<void> {
  await mutateState((s) => {
    s.activity = { label, at: new Date().toISOString(), done };
  });
}
