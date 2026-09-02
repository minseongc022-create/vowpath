"use client";

import type { AgeBand, DajeongPlan, ExperienceMood, ParsedSituation, PersonMemoryUpdate, PersonProfile } from "./types";

const STORAGE_KEY = "dajeong:plans:v1";
const PEOPLE_STORAGE_KEY = "haruon:people:v1";

function readAll(): DajeongPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as DajeongPlan[] : [];
  } catch {
    return [];
  }
}

export function savePlan(plan: DajeongPlan): void {
  const next = [plan, ...readAll().filter((entry) => entry.id !== plan.id)].slice(0, 20);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("dajeong:plans-updated"));
}

export function getPlan(id: string): DajeongPlan | null {
  return readAll().find((plan) => plan.id === id) ?? null;
}

export function listPlans(): DajeongPlan[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
