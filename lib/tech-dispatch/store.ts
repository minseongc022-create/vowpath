import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";
import { useKvStore } from "../kv-config";
import {
  DEFAULT_TECH_DISPATCH_SETTINGS,
  type TechAssignment,
  type TechDispatchSettings,
  type TechMember,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "tech-dispatch-settings.json");
const ASSIGN_FILE = path.join(DATA_DIR, "tech-assignments.json");

function settingsKey(userId: string) {
  return `vowpath:tech-dispatch:${userId}`;
}

function assignmentKey(userId: string, bookingId: string) {
  return `vowpath:tech-assignment:${userId}:${bookingId}`;
}

function sanitizeTechs(techs: TechMember[] | undefined): TechMember[] {
  if (!techs?.length) return [];
  return techs
    .filter((t) => t.name.trim().length >= 1 && t.phone.trim().length >= 8)
    .map((t) => ({
      id: t.id || crypto.randomUUID(),
      name: t.name.trim(),
      phone: t.phone.trim(),
      active: t.active !== false,
      senior: t.senior === true,
    }));
}

export function mergeTechDispatchSettings(
  partial?: Partial<TechDispatchSettings> | null,
): TechDispatchSettings {
  const base = DEFAULT_TECH_DISPATCH_SETTINGS;
  if (!partial) return { ...base, techs: [] };
  return {
    enabled: partial.enabled === true,
    responseTimeoutMinutes:
      typeof partial.responseTimeoutMinutes === "number"
        ? Math.min(120, Math.max(5, Math.round(partial.responseTimeoutMinutes)))
        : base.responseTimeoutMinutes,
    assignOnApprove: partial.assignOnApprove !== false,
    p1SeniorOnly: partial.p1SeniorOnly === true,
    techs: sanitizeTechs(partial.techs),
    lastAssignedTechId:
      typeof partial.lastAssignedTechId === "string" ? partial.lastAssignedTechId : null,
  };
}

async function readJsonFile<T>(file: string): Promise<T> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

async function writeJsonFile<T>(file: string, data: T) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export async function getTechDispatchSettings(
  userId: string,
): Promise<TechDispatchSettings> {
  if (useKvStore()) {
    const raw = await kvGetSafe<Partial<TechDispatchSettings>>(settingsKey(userId));
    return mergeTechDispatchSettings(raw ?? undefined);
  }
  const all = await readJsonFile<Record<string, TechDispatchSettings>>(SETTINGS_FILE);
  return mergeTechDispatchSettings(all[userId]);
}

export async function saveTechDispatchSettings(
  userId: string,
  partial: Partial<TechDispatchSettings>,
): Promise<TechDispatchSettings> {
  const current = await getTechDispatchSettings(userId);
  const next = mergeTechDispatchSettings({ ...current, ...partial, techs: partial.techs ?? current.techs });

  if (useKvStore()) {
    await kv.set(settingsKey(userId), next);
    return next;
  }

  const all = await readJsonFile<Record<string, TechDispatchSettings>>(SETTINGS_FILE);
  all[userId] = next;
  await writeJsonFile(SETTINGS_FILE, all);
  return next;
}

export async function getTechAssignment(
  userId: string,
  bookingId: string,
): Promise<TechAssignment | null> {
  if (useKvStore()) {
    return (await kvGetSafe<TechAssignment>(assignmentKey(userId, bookingId))) ?? null;
  }
  const all = await readJsonFile<Record<string, TechAssignment>>(ASSIGN_FILE);
  return all[`${userId}:${bookingId}`] ?? null;
}

export async function saveTechAssignment(assignment: TechAssignment): Promise<void> {
  const key = `${assignment.userId}:${assignment.bookingId}`;
  if (useKvStore()) {
    await kv.set(assignmentKey(assignment.userId, assignment.bookingId), assignment);
    return;
  }
  const all = await readJsonFile<Record<string, TechAssignment>>(ASSIGN_FILE);
  all[key] = assignment;
  await writeJsonFile(ASSIGN_FILE, all);
}

function pendingOfferKey(userId: string, techId: string) {
  return `vowpath:tech-pending:${userId}:${techId}`;
}

export async function setTechPendingOffer(
  userId: string,
  techId: string,
  bookingId: string,
): Promise<void> {
  if (useKvStore()) {
    await kv.set(pendingOfferKey(userId, techId), bookingId);
    return;
  }
  const all = await readJsonFile<Record<string, string>>(path.join(DATA_DIR, "tech-pending.json"));
  all[`${userId}:${techId}`] = bookingId;
  await writeJsonFile(path.join(DATA_DIR, "tech-pending.json"), all);
}

export async function clearTechPendingOffer(userId: string, techId: string): Promise<void> {
  if (useKvStore()) {
    await kv.del(pendingOfferKey(userId, techId));
    return;
  }
  const all = await readJsonFile<Record<string, string>>(path.join(DATA_DIR, "tech-pending.json"));
  delete all[`${userId}:${techId}`];
  await writeJsonFile(path.join(DATA_DIR, "tech-pending.json"), all);
}

export async function getTechPendingOffer(
  userId: string,
  techId: string,
): Promise<string | null> {
  if (useKvStore()) {
    return (await kvGetSafe<string>(pendingOfferKey(userId, techId))) ?? null;
  }
  const all = await readJsonFile<Record<string, string>>(path.join(DATA_DIR, "tech-pending.json"));
  return all[`${userId}:${techId}`] ?? null;
}

export async function findTechByPhone(
  userId: string,
  phoneRaw: string,
): Promise<TechMember | null> {
  const { normalizeSmsPhone } = await import("../phone");
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone) return null;
  const settings = await getTechDispatchSettings(userId);
  for (const tech of settings.techs) {
    if (!tech.active) continue;
    const t = normalizeSmsPhone(tech.phone);
    if (t && t === phone) return tech;
  }
  return null;
}
