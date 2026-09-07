import "server-only";

import { randomUUID } from "node:crypto";
import { kv } from "@vercel/kv";
import { emptyAdState, type AdState, type AdStateStore } from "./ads";

const STATE_KEY = "haruwith:ads:v1:state";
const LOCK_KEY = "haruwith:ads:v1:lock";
const memory = globalThis as typeof globalThis & { __haruwithAdsState?: AdState };
memory.__haruwithAdsState ??= emptyAdState();
const hasKv = () => Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function lock(): Promise<string> {
  const token = randomUUID();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await kv.set(LOCK_KEY, token, { nx: true, px: 5_000 }) === "OK") return token;
    await new Promise((resolve) => setTimeout(resolve, 20 + attempt * 5));
  }
  throw new Error("ADS_STORE_BUSY");
}

export const adStateStore: AdStateStore = {
  async read() { return hasKv() ? await kv.get<AdState>(STATE_KEY) ?? emptyAdState() : structuredClone(memory.__haruwithAdsState!); },
  async update<T>(mutate: (state: AdState) => T | Promise<T>) {
    if (!hasKv()) { const draft = structuredClone(memory.__haruwithAdsState!); const result = await mutate(draft); memory.__haruwithAdsState = draft; return result; }
    const token = await lock();
    try { const state = await kv.get<AdState>(STATE_KEY) ?? emptyAdState(); const result = await mutate(state); state.events = state.events.slice(-50_000); await kv.set(STATE_KEY, state); return result; }
    finally { if (await kv.get<string>(LOCK_KEY) === token) await kv.del(LOCK_KEY); }
  },
};
