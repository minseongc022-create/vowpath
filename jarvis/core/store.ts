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
import { DEFAULT_SETTINGS, emptyReportWindow, type Draft, type JarvisState } from "./types";
import { emptySharelinkState } from "../sharelink/types";

export const JARVIS_STATE_VERSION = "2.0";

const KV_KEY = "jarvis:state:v2";
const DATA_DIR = join(process.cwd(), ".data");
const STATE_FILE = join(DATA_DIR, "jarvis-state.json");

/** 대화·초안이 무한히 쌓이지 않게 — 오래된 것부터 잘라낸다 */
const MAX_CHAT_TURNS = 200;
const MAX_DRAFTS = 300;
const MAX_CANDIDATES = 120;
const MAX_SHARELINK_POSTS = 300;
const MAX_SHARELINK_ITEMS = 60;
/** "오늘 이미 올린 상품" 중복 방지용. 무한히 쌓이면 언젠가 모든 인기상품이
 *  "이미 올림"으로 막힌다 — 최근 것만 남기고 흘려보낸다 */
const MAX_POSTED_PRODUCT_IDS = 500;

function emptyState(): JarvisState {
  return {
    version: JARVIS_STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    candidates: [],
    drafts: [],
    chat: [],
    reportWindow: emptyReportWindow(),
    returns: [],
    sharelink: emptySharelinkState(),
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
    reportWindow: raw.reportWindow ?? emptyReportWindow(),
    returns: Array.isArray(raw.returns) ? raw.returns : [],
    sharelink: normalizeSharelink(raw.sharelink),
  };
}

/**
 * 쉐어링크 상태도 같은 이유로 방어한다 — 옛 상태(이 기능이 생기기 전에
 * 저장된 것)에는 `sharelink` 자체가 없거나, 배열 필드가 없을 수 있다.
 * `undefined.filter is not a function` 같은 사고를 여기서 한 번에 막는다.
 */
function normalizeSharelink(
  raw: Partial<import("../sharelink/types").SharelinkState> | undefined,
): import("../sharelink/types").SharelinkState {
  const base = emptySharelinkState();
  if (!raw) return base;
  return {
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    items: Array.isArray(raw.items) ? raw.items : [],
    posts: Array.isArray(raw.posts) ? raw.posts : [],
    lastRun: raw.lastRun,
    lastAutopilotAt: raw.lastAutopilotAt,
    postedProductIds: Array.isArray(raw.postedProductIds) ? raw.postedProductIds : [],
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
    sharelink: state.sharelink
      ? {
          ...state.sharelink,
          posts: state.sharelink.posts.slice(0, MAX_SHARELINK_POSTS),
          items: state.sharelink.items.slice(0, MAX_SHARELINK_ITEMS),
          postedProductIds: state.sharelink.postedProductIds.slice(-MAX_POSTED_PRODUCT_IDS),
        }
      : state.sharelink,
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
