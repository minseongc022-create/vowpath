"use client";

const IDENTITY_KEY = "dajeong:identity:v1";

export type DajeongIdentity = { id: string; name: string };

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `person_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getIdentity(): DajeongIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(IDENTITY_KEY) ?? "null") as DajeongIdentity | null;
    if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") return parsed;
  } catch {
    // ignore corrupted value
  }
  return null;
}

export function getOrCreateIdentity(): DajeongIdentity {
  const existing = getIdentity();
  if (existing) return existing;
  const identity: DajeongIdentity = { id: randomId(), name: "나" };
  if (typeof window !== "undefined") window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export function setIdentityName(name: string): DajeongIdentity {
  const trimmed = name.trim().slice(0, 20) || "나";
  const identity: DajeongIdentity = { ...getOrCreateIdentity(), name: trimmed };
  if (typeof window !== "undefined") window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}
