"use client";

const IDENTITY_KEY = "dajeong:identity:v1";
const RESOLVED_ID_CACHE_KEY = "dajeong:identity:resolved-id:v1";

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

/**
 * Real login, when available, replaces the guessable anonymous device id with a stable id
 * tied to an actual account — that's what makes "다른 기기/브라우저에서도 이어보기" and the
 * companion-sharing permission model trustworthy instead of resting entirely on whichever
 * browser happens to hold a given localStorage value. Logged-out users keep working exactly
 * as before (anonymous device id) — login is additive, not a hard requirement.
 */
export async function resolveIdentity(): Promise<DajeongIdentity> {
  if (typeof window === "undefined") return getOrCreateIdentity();
  const resolved = await resolveIdentityUncached();
  window.localStorage.setItem(RESOLVED_ID_CACHE_KEY, resolved.id);
  return resolved;
}

async function resolveIdentityUncached(): Promise<DajeongIdentity> {
  try {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    if (session?.user?.id) {
      return { id: `user_${session.user.id}`, name: session.user.name?.trim().slice(0, 20) || "나" };
    }
  } catch {
    // next-auth not reachable (no DB/provider configured) — fall through to anonymous id
  }
  return getOrCreateIdentity();
}

/**
 * Synchronous best-effort read of the last identity resolveIdentity() computed — for storage.ts,
 * which needs to scope localStorage plan lists to "whoever is using this browser right now"
 * without awaiting a session check on every read. Falls back to the anonymous device id (the
 * safe default: an unresolved cache never accidentally exposes an account-scoped plan).
 */
export function getCachedResolvedIdentityId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(RESOLVED_ID_CACHE_KEY) || getOrCreateIdentity().id;
}
