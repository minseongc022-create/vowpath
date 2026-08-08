import { randomBytes } from "node:crypto";

const PREFIX = "content-autopilot:";

export type CloudConnections = {
  wordpress?: { baseUrl?: string; username?: string; appPassword?: string; connectedAt?: string };
  blogger?: { blogId?: string; accessToken?: string; connectedAt?: string };
  naver?: { blogId?: string; blogUrl?: string; connectedAt?: string };
};

export type CloudSettings = {
  llmApiKey?: string;
  llmModel?: string;
  ntfyTopic?: string;
  webhookUrl?: string;
  pin?: string;
};

export type CloudArticle = {
  brandId: string;
  title: string;
  markdown: string;
  chars: number;
  platform: string;
  url?: string;
  createdAt: string;
};

export type CloudInbox = {
  title: string;
  body: string;
  results: CloudArticle[];
  at: string;
};

export type CloudJob = {
  id: string;
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
  error?: string;
  results?: CloudArticle[];
};

function memStore() {
  const g = globalThis as unknown as { __autopilotMem?: Map<string, unknown> };
  if (!g.__autopilotMem) g.__autopilotMem = new Map();
  return g.__autopilotMem;
}

async function kvClient(): Promise<{ get: (k: string) => Promise<unknown>; set: (k: string, v: unknown, opts?: { ex?: number }) => Promise<unknown> } | null> {
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    return null;
  }
  try {
    const mod = await import("@vercel/kv");
    return mod.kv as {
      get: (k: string) => Promise<unknown>;
      set: (k: string, v: unknown, opts?: { ex?: number }) => Promise<unknown>;
    };
  } catch {
    return null;
  }
}

async function getJson<T>(key: string, fallback: T): Promise<T> {
  const client = await kvClient();
  if (client) {
    try {
      const v = (await client.get(`${PREFIX}${key}`)) as T | null;
      if (v != null) return v;
    } catch {
      /* fall through */
    }
  }
  const m = memStore().get(key);
  if (m != null) return m as T;
  return fallback;
}

async function setJson(key: string, value: unknown, ex?: number): Promise<void> {
  const client = await kvClient();
  if (client) {
    try {
      if (ex) await client.set(`${PREFIX}${key}`, value, { ex });
      else await client.set(`${PREFIX}${key}`, value);
      return;
    } catch {
      /* fall through */
    }
  }
  memStore().set(key, value);
}

export async function getConnections(): Promise<CloudConnections> {
  return getJson("connections", {});
}

export async function saveConnections(data: CloudConnections): Promise<void> {
  await setJson("connections", data);
}

export async function getSettings(): Promise<CloudSettings> {
  return getJson("settings", {});
}

export async function saveSettings(patch: Partial<CloudSettings>): Promise<CloudSettings> {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await setJson("settings", next);
  return next;
}

export async function ensurePin(): Promise<string> {
  const s = await getSettings();
  if (s.pin && s.pin.length >= 4) return s.pin;
  const envPin = process.env.AUTOPILOT_PIN?.trim();
  if (envPin) {
    await saveSettings({ pin: envPin });
    return envPin;
  }
  const pin = String(100000 + Math.floor(Math.random() * 900000));
  await saveSettings({ pin });
  return pin;
}

export async function getInbox(): Promise<CloudInbox | null> {
  return getJson<CloudInbox | null>("inbox", null);
}

export async function setInbox(inbox: CloudInbox): Promise<void> {
  await setJson("inbox", inbox);
}

export async function getJob(): Promise<CloudJob | null> {
  return getJson<CloudJob | null>("job", null);
}

export async function setJob(job: CloudJob): Promise<void> {
  await setJson("job", job);
}

export async function saveArticle(article: CloudArticle): Promise<void> {
  const list = await getJson<CloudArticle[]>("articles", []);
  list.unshift(article);
  await setJson("articles", list.slice(0, 50));
}

export function newSessionToken(): string {
  return randomBytes(24).toString("hex");
}

export async function saveSession(token: string): Promise<void> {
  await setJson(`session:${token}`, "1", 60 * 60 * 24 * 30);
}

export async function sessionValid(token?: string): Promise<boolean> {
  if (!token) return false;
  const v = await getJson<string | null>(`session:${token}`, null);
  return Boolean(v);
}
