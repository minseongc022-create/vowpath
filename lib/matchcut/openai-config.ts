import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { useKvStore } from "../kv-config";
import { kvGetSafe } from "../kv-safe";

const KV_KEY = "matchcut:openai";
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "matchcut-openai.json");

type OpenAiStore = {
  apiKey?: string;
  updatedAt?: string;
  updatedBy?: string;
};

async function readStore(): Promise<OpenAiStore> {
  if (useKvStore()) {
    return (await kvGetSafe<OpenAiStore>(KV_KEY)) ?? {};
  }
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as OpenAiStore;
  } catch {
    return {};
  }
}

async function writeStore(store: OpenAiStore) {
  if (useKvStore()) {
    await kv.set(KV_KEY, store);
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

/** Env first, then MatchCut-saved platform key (local/dev cloud). */
export async function resolveOpenAiApiKey(): Promise<string | null> {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const store = await readStore();
  const fromStore = store.apiKey?.trim();
  return fromStore || null;
}

export async function isOpenAiConfigured(): Promise<boolean> {
  return Boolean(await resolveOpenAiApiKey());
}

/**
 * Hydrate process.env so existing vision helpers that read OPENAI_API_KEY keep working.
 * Safe to call at the start of MatchCut API routes.
 */
export async function ensureOpenAiApiKeyLoaded(): Promise<string | null> {
  const key = await resolveOpenAiApiKey();
  if (key && !process.env.OPENAI_API_KEY?.trim()) {
    process.env.OPENAI_API_KEY = key;
  }
  return key;
}

export async function saveOpenAiApiKey(apiKey: string, updatedBy: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed.startsWith("sk-") || trimmed.length < 20) {
    throw new Error("OPENAI_KEY_INVALID_FORMAT");
  }
  await writeStore({
    apiKey: trimmed,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
  process.env.OPENAI_API_KEY = trimmed;
}

export async function clearOpenAiApiKey(): Promise<void> {
  await writeStore({});
  // Do not clear env if it was set externally — only clear if it matched stored key.
}

export async function validateOpenAiApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401) return { ok: false, error: "OPENAI_INVALID_KEY" };
    if (res.status === 429) return { ok: false, error: "OPENAI_INSUFFICIENT_QUOTA" };
    if (!res.ok) return { ok: false, error: "OPENAI_REQUEST_FAILED" };
    return { ok: true };
  } catch {
    return { ok: false, error: "OPENAI_REQUEST_FAILED" };
  }
}

export function matchCutOpenAiErrorMessage(code: string): string {
  switch (code) {
    case "OPENAI_API_KEY_MISSING":
      return "OpenAI API 키가 없습니다. 아래에 sk- 키를 저장한 뒤 다시 스캔하세요.";
    case "OPENAI_INVALID_KEY":
      return "OpenAI API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.";
    case "OPENAI_INSUFFICIENT_QUOTA":
      return "OpenAI 사용량/결제 한도에 도달했습니다. OpenAI 계정을 확인해 주세요.";
    case "OPENAI_TIMEOUT":
      return "OpenAI 응답이 지연되었습니다. 잠시 후 다시 시도해 주세요.";
    case "OPENAI_REQUEST_FAILED":
      return "OpenAI 요청에 실패했습니다. 네트워크 또는 키 권한을 확인해 주세요.";
    case "OPENAI_KEY_INVALID_FORMAT":
      return "OpenAI 키 형식이 아닙니다. sk- 로 시작하는 키를 입력하세요.";
    default:
      return code;
  }
}
