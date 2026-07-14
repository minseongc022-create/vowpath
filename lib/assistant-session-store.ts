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

type AssistantSnapshot = {
  messages: AssistantChatMessage[];
  loading: boolean;
  unread: boolean;
  booted: boolean;
  starters: string[];
};

const STORAGE_KEY = "effiroad-ai-chat-v3";

const defaultSnapshot = (): AssistantSnapshot => ({
  messages: [],
  loading: false,
  unread: false,
  booted: false,
  starters: [],
});

let snapshot: AssistantSnapshot = defaultSnapshot();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
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

export function hydrateAssistantStore() {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<AssistantSnapshot>;
    snapshot = {
      ...defaultSnapshot(),
      messages: parsed.messages ?? [],
      booted: Boolean(parsed.booted),
      starters: parsed.starters ?? [],
      unread: Boolean(parsed.unread),
      loading: false,
    };
  } catch {
    snapshot = defaultSnapshot();
  }
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
