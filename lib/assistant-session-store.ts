"use client";

import { useSyncExternalStore } from "react";

export type AssistantChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      suggestions?: string[];
      actions?: { label: string; href?: string }[];
    };

export type AssistantScope = "shop" | "site";

type AssistantSnapshot = {
  messages: AssistantChatMessage[];
  loading: boolean;
  unread: boolean;
  booted: boolean;
  starters: string[];
};

const STORAGE_KEYS: Record<AssistantScope, string> = {
  shop: "effiroad-ai-chat-shop-v1",
  site: "effiroad-ai-chat-site-v1",
};

const defaultSnapshot = (): AssistantSnapshot => ({
  messages: [],
  loading: false,
  unread: false,
  booted: false,
  starters: [],
});

let activeScope: AssistantScope = "site";
let snapshot: AssistantSnapshot = defaultSnapshot();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEYS[activeScope],
      JSON.stringify({
        messages: snapshot.messages,
        booted: snapshot.booted,
        starters: snapshot.starters,
        unread: snapshot.unread,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

function loadScope(scope: AssistantScope): AssistantSnapshot {
  if (typeof window === "undefined") return defaultSnapshot();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS[scope]);
    if (!raw) return defaultSnapshot();
    const parsed = JSON.parse(raw) as Partial<AssistantSnapshot>;
    return {
      ...defaultSnapshot(),
      messages: parsed.messages ?? [],
      booted: Boolean(parsed.booted),
      starters: parsed.starters ?? [],
      unread: Boolean(parsed.unread),
      loading: false,
    };
  } catch {
    return defaultSnapshot();
  }
}

/** Hydrate (and switch) marketing vs shop chat so threads do not bleed across. */
export function hydrateAssistantStore(scope: AssistantScope = "site") {
  if (typeof window === "undefined") return;
  if (scope !== activeScope) {
    persist();
    activeScope = scope;
    inflight = 0;
  }
  snapshot = loadScope(scope);
  emit();
}

export function getAssistantScope(): AssistantScope {
  return activeScope;
}

export function subscribeAssistantStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAssistantSnapshot() {
  return snapshot;
}

export function patchAssistantStore(patch: Partial<AssistantSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  persist();
  emit();
}

export function pushAssistantMessage(message: AssistantChatMessage) {
  snapshot = { ...snapshot, messages: [...snapshot.messages, message] };
  persist();
  emit();
}

export function markAssistantRead() {
  if (!snapshot.unread) return;
  snapshot = { ...snapshot, unread: false };
  persist();
  emit();
}

let inflight = 0;

export function beginAssistantRequest() {
  inflight += 1;
  snapshot = { ...snapshot, loading: true };
  persist();
  emit();
}

export function endAssistantRequest(options?: { panelOpen?: boolean }) {
  inflight = Math.max(0, inflight - 1);
  const stillLoading = inflight > 0;
  const unread = stillLoading ? snapshot.unread : options?.panelOpen ? false : true;
  snapshot = { ...snapshot, loading: stillLoading, unread };
  persist();
  emit();
}

export function assistantHasInflight() {
  return inflight > 0;
}

const serverSnapshot = defaultSnapshot();

export function getAssistantServerSnapshot() {
  return serverSnapshot;
}

export function useAssistantStore() {
  return useSyncExternalStore(
    subscribeAssistantStore,
    getAssistantSnapshot,
    getAssistantServerSnapshot,
  );
}
