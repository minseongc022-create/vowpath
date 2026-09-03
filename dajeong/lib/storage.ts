"use client";

import { getCachedResolvedIdentityId, getOrCreateIdentity } from "./identity";
import type { AgeBand, DajeongPlan, ExperienceMood, PaceUpdate, ParsedSituation, PersonMemoryUpdate, PersonProfile } from "./types";

const STORAGE_KEY = "dajeong:plans:v1";
const PEOPLE_STORAGE_KEY = "haruon:people:v1";
const PACE_STORAGE_KEY = "haruon:pace:v1";

function readAll(): DajeongPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as DajeongPlan[] : [];
  } catch {
    return [];
  }
}

/**
 * A plan saved before this field existed has no localOwnerId at all. Treating that as "belongs
 * to whoever the anonymous device id is" (never to a since-logged-in account) is the safe
 * default: it keeps a pre-login user's own old plans visible to them, while a different account
 * signing in later on the same browser — whose resolved id is "user_<...>", not the anonymous
 * id — never inherits them.
 */
function ownerOf(plan: DajeongPlan): string {
  return plan.localOwnerId ?? getOrCreateIdentity().id;
}

export function savePlan(plan: DajeongPlan): void {
  const stamped: DajeongPlan = { ...plan, localOwnerId: plan.localOwnerId ?? getCachedResolvedIdentityId() };
  const next = [stamped, ...readAll().filter((entry) => entry.id !== plan.id)].slice(0, 20);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("dajeong:plans-updated"));
}

export function getPlan(id: string): DajeongPlan | null {
  const plan = readAll().find((entry) => entry.id === id) ?? null;
  return plan && ownerOf(plan) === getCachedResolvedIdentityId() ? plan : null;
}

export function listPlans(): DajeongPlan[] {
  const owner = getCachedResolvedIdentityId();
  return readAll().filter((plan) => ownerOf(plan) === owner).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function removePlan(id: string): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readAll().filter((plan) => plan.id !== id)));
  window.dispatchEvent(new CustomEvent("dajeong:plans-updated"));
}

function readPeople(): PersonProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PEOPLE_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as PersonProfile[] : [];
  } catch {
    return [];
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function getPersonProfile(relation: string): PersonProfile | null {
  return readPeople().find((profile) => profile.relation === relation || profile.name === relation) ?? null;
}

export function listPersonProfiles(): PersonProfile[] {
  return readPeople().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function rememberPersonProfile(
  situation: ParsedSituation,
  extras: { ageBand?: AgeBand; preferences?: string[]; moodPreferences?: ExperienceMood[]; notes?: string[]; memoryUpdate?: PersonMemoryUpdate } = {},
): PersonProfile | null {
  if (typeof window === "undefined" || situation.recipient === "함께할 사람") return null;
  const current = getPersonProfile(situation.recipient);
  const profile: PersonProfile = {
    id: current?.id ?? `person_${situation.recipient.replace(/\s+/g, "_")}`,
    name: current?.name ?? situation.recipient,
    relation: situation.recipient,
    ageBand: extras.ageBand && extras.ageBand !== "미상" ? extras.ageBand : situation.ageBand !== "미상" ? situation.ageBand : current?.ageBand ?? "미상",
    preferences: unique([...(current?.preferences ?? []), ...situation.preferences, ...(extras.preferences ?? []), ...(extras.memoryUpdate?.preferences ?? [])]),
    constraints: unique([...(current?.constraints ?? []), ...situation.constraints, ...(extras.memoryUpdate?.constraints ?? [])]),
    likedFoods: unique([...(current?.likedFoods ?? []), ...situation.preferences.filter((value) => /한식|일식|이탈리안|고기|베이커리|파스타|디저트/.test(value)), ...(extras.memoryUpdate?.likedFoods ?? [])]),
    dislikedFoods: unique([...(current?.dislikedFoods ?? []), ...situation.constraints.filter((value) => /음식|알레르기|채식|논알코올|맵/.test(value)), ...(extras.memoryUpdate?.dislikedFoods ?? [])]),
    hobbies: unique([...(current?.hobbies ?? []), ...situation.preferences.filter((value) => /전시|공연|야경|소품샵|사진|미디어아트|체험/.test(value)), ...(extras.memoryUpdate?.hobbies ?? [])]),
    moodPreferences: Array.from(new Set([...(current?.moodPreferences ?? []), ...situation.desiredMoods, ...(extras.moodPreferences ?? [])])),
    visitedPlaceIds: current?.visitedPlaceIds ?? [],
    likedPlaceIds: current?.likedPlaceIds ?? [],
    dislikedPlaceIds: current?.dislikedPlaceIds ?? [],
    likedActivities: unique([...(current?.likedActivities ?? []), ...(extras.memoryUpdate?.likedActivities ?? [])]),
    dislikedActivities: unique([...(current?.dislikedActivities ?? []), ...(extras.memoryUpdate?.dislikedActivities ?? [])]),
    likedAtmospheres: unique([...(current?.likedAtmospheres ?? []), ...(extras.memoryUpdate?.likedAtmospheres ?? [])]),
    dislikedAtmospheres: unique([...(current?.dislikedAtmospheres ?? []), ...(extras.memoryUpdate?.dislikedAtmospheres ?? [])]),
    crowdTolerance: extras.memoryUpdate?.crowdTolerance && extras.memoryUpdate.crowdTolerance !== "unknown" ? extras.memoryUpdate.crowdTolerance : current?.crowdTolerance ?? "unknown",
    walkingTolerance: extras.memoryUpdate?.walkingTolerance && extras.memoryUpdate.walkingTolerance !== "unknown" ? extras.memoryUpdate.walkingTolerance : current?.walkingTolerance ?? "unknown",
    likedPlanIds: current?.likedPlanIds ?? [],
    dislikedPlanIds: current?.dislikedPlanIds ?? [],
    notes: unique([...(current?.notes ?? []), ...(extras.notes ?? [])]).slice(-20),
    updatedAt: new Date().toISOString(),
  };
  const next = [profile, ...readPeople().filter((entry) => entry.id !== profile.id)].slice(0, 20);
  window.localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(next));
  return profile;
}

type StoredPace = { companionKey: string; density?: PaceUpdate["density"]; placesPerDay?: number; notes: string[]; updatedAt: string };

function readPace(): Record<string, StoredPace> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PACE_STORAGE_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, StoredPace> : {};
  } catch {
    return {};
  }
}

/** Only "profile"-scoped feedback should ever reach here — session-only remarks stay on the plan itself. */
export function rememberPacePreference(companionKey: string, update: PaceUpdate): StoredPace {
  const all = readPace();
  const current = all[companionKey];
  const next: StoredPace = {
    companionKey,
    density: update.density ?? current?.density,
    placesPerDay: update.placesPerDay ?? current?.placesPerDay,
    notes: Array.from(new Set([...(current?.notes ?? []), update.note])).slice(-20),
    updatedAt: new Date().toISOString(),
  };
  all[companionKey] = next;
  if (typeof window !== "undefined") window.localStorage.setItem(PACE_STORAGE_KEY, JSON.stringify(all));
  return next;
}

export function getPacePreference(companionKey: string): StoredPace | null {
  return readPace()[companionKey] ?? null;
}
