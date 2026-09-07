import "server-only";

import { randomUUID } from "node:crypto";
import { kv } from "@vercel/kv";
import { emptyReservationState, type ReservationPersistentState } from "./reservation-ops-types";
import type { ReservationStateStore } from "./reservation-queue";

const STATE_KEY = "haruwith:reservation:v1:state";
const LOCK_KEY = "haruwith:reservation:v1:mutation-lock";
const globalMemory = globalThis as typeof globalThis & { __haruwithReservationState?: ReservationPersistentState };
globalMemory.__haruwithReservationState ??= emptyReservationState();

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function trimState(state: ReservationPersistentState): ReservationPersistentState {
  const webhookEntries = Object.entries(state.webhookEvents).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 5_000);
  return {
    ...state,
    webhookEvents: Object.fromEntries(webhookEntries),
    notifications: state.notifications.slice(0, 1_000),
    metrics: state.metrics.slice(-20_000),
  };
}

async function acquireLock(): Promise<string> {
  const token = randomUUID();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await kv.set(LOCK_KEY, token, { nx: true, px: 8_000 });
    if (result === "OK") return token;
    await new Promise((resolve) => setTimeout(resolve, 25 + attempt * 5));
  }
  throw new Error("RESERVATION_STORE_BUSY");
}

async function releaseLock(token: string): Promise<void> {
  if (await kv.get<string>(LOCK_KEY) === token) await kv.del(LOCK_KEY);
}

export const reservationStateStore: ReservationStateStore = {
  async read() {
    if (!hasKv()) return structuredClone(globalMemory.__haruwithReservationState!);
    return await kv.get<ReservationPersistentState>(STATE_KEY) ?? emptyReservationState();
  },
  async update<T>(mutate: (state: ReservationPersistentState) => T | Promise<T>) {
    if (!hasKv()) {
      const draft = structuredClone(globalMemory.__haruwithReservationState!);
      const result = await mutate(draft);
      globalMemory.__haruwithReservationState = trimState(draft);
      return result;
    }
    const token = await acquireLock();
    try {
      const state = await kv.get<ReservationPersistentState>(STATE_KEY) ?? emptyReservationState();
      const result = await mutate(state);
      await kv.set(STATE_KEY, trimState(state));
      return result;
    } finally {
      await releaseLock(token);
    }
  },
};

export function reservationPersistenceMode(): "vercel_kv" | "memory" {
  return hasKv() ? "vercel_kv" : "memory";
}
