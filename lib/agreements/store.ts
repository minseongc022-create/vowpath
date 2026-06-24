import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";
import { useKvStore } from "../kv-config";
import {
  DEFAULT_AGREEMENT_KEEPER_SETTINGS,
  type AgreementKeeperSettings,
  type MaintenanceAgreement,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function agreementsFile(userId: string) {
  return path.join(DATA_DIR, `agreements-${userId}.json`);
}

function settingsFile(userId: string) {
  return path.join(DATA_DIR, `agreement-settings-${userId}.json`);
}

function kvAgreementsKey(userId: string) {
  return `effiroad:agreements:${userId}`;
}

function kvSettingsKey(userId: string) {
  return `effiroad:agreement-settings:${userId}`;
}

type AgreementStore = { agreements: MaintenanceAgreement[] };

async function readAgreementsFile(userId: string): Promise<AgreementStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(agreementsFile(userId), "utf-8");
    return JSON.parse(raw) as AgreementStore;
  } catch {
    return { agreements: [] };
  }
}

async function writeAgreementsFile(userId: string, store: AgreementStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(agreementsFile(userId), JSON.stringify(store, null, 2), "utf-8");
}

async function readSettingsFile(userId: string): Promise<AgreementKeeperSettings> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(settingsFile(userId), "utf-8");
    return { ...DEFAULT_AGREEMENT_KEEPER_SETTINGS, ...(JSON.parse(raw) as AgreementKeeperSettings) };
  } catch {
    return { ...DEFAULT_AGREEMENT_KEEPER_SETTINGS };
  }
}

async function writeSettingsFile(userId: string, settings: AgreementKeeperSettings) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(settingsFile(userId), JSON.stringify(settings, null, 2), "utf-8");
}

function mergeSettings(input: Partial<AgreementKeeperSettings>): AgreementKeeperSettings {
  const base = { ...DEFAULT_AGREEMENT_KEEPER_SETTINGS };
  if (typeof input.enabled === "boolean") base.enabled = input.enabled;
  if (typeof input.offerAfterJobComplete === "boolean") {
    base.offerAfterJobComplete = input.offerAfterJobComplete;
  }
  if (typeof input.defaultPlanName === "string" && input.defaultPlanName.trim()) {
    base.defaultPlanName = input.defaultPlanName.trim();
  }
  if (typeof input.defaultAnnualPriceCents === "number" && input.defaultAnnualPriceCents >= 0) {
    base.defaultAnnualPriceCents = Math.round(input.defaultAnnualPriceCents);
  }
  if (typeof input.defaultVisitsPerYear === "number" && input.defaultVisitsPerYear >= 1) {
    base.defaultVisitsPerYear = Math.round(input.defaultVisitsPerYear);
  }
  if (typeof input.offerExpiresDays === "number" && input.offerExpiresDays >= 1) {
    base.offerExpiresDays = Math.round(input.offerExpiresDays);
  }
  if (Array.isArray(input.ownerReminderDays)) {
    base.ownerReminderDays = input.ownerReminderDays
      .filter((d) => typeof d === "number" && d > 0)
      .map((d) => Math.round(d));
  }
  if (Array.isArray(input.customerReminderDays)) {
    base.customerReminderDays = input.customerReminderDays
      .filter((d) => typeof d === "number" && d > 0)
      .map((d) => Math.round(d));
  }
  return base;
}

export async function getAgreementKeeperSettings(userId: string): Promise<AgreementKeeperSettings> {
  if (useKvStore()) {
    const raw = await kvGetSafe<AgreementKeeperSettings>(kvSettingsKey(userId));
    return mergeSettings(raw ?? {});
  }
  return readSettingsFile(userId);
}

export async function saveAgreementKeeperSettings(
  userId: string,
  input: Partial<AgreementKeeperSettings>,
): Promise<AgreementKeeperSettings> {
  const current = await getAgreementKeeperSettings(userId);
  const settings = mergeSettings({ ...current, ...input });
  if (useKvStore()) {
    await kv.set(kvSettingsKey(userId), settings);
  } else {
    await writeSettingsFile(userId, settings);
  }
  return settings;
}

export async function listAgreements(userId: string): Promise<MaintenanceAgreement[]> {
  if (useKvStore()) {
    const raw = await kvGetSafe<AgreementStore>(kvAgreementsKey(userId));
    return raw?.agreements ?? [];
  }
  const store = await readAgreementsFile(userId);
  return store.agreements;
}

export async function getAgreement(
  userId: string,
  agreementId: string,
): Promise<MaintenanceAgreement | null> {
  const agreements = await listAgreements(userId);
  return agreements.find((a) => a.id === agreementId) ?? null;
}

export async function saveAgreement(agreement: MaintenanceAgreement): Promise<MaintenanceAgreement> {
  const agreements = await listAgreements(agreement.userId);
  const idx = agreements.findIndex((a) => a.id === agreement.id);
  if (idx >= 0) agreements[idx] = agreement;
  else agreements.push(agreement);

  if (useKvStore()) {
    await kv.set(kvAgreementsKey(agreement.userId), { agreements });
  } else {
    await writeAgreementsFile(agreement.userId, { agreements });
  }
  return agreement;
}

export async function deleteAgreement(userId: string, agreementId: string): Promise<boolean> {
  const agreements = await listAgreements(userId);
  const next = agreements.filter((a) => a.id !== agreementId);
  if (next.length === agreements.length) return false;

  if (useKvStore()) {
    await kv.set(kvAgreementsKey(userId), { agreements: next });
  } else {
    await writeAgreementsFile(userId, { agreements: next });
  }
  return true;
}

export async function countRenewingSoon(userId: string, withinDays = 30): Promise<number> {
  const { isRenewingSoon } = await import("./types");
  const agreements = await listAgreements(userId);
  return agreements.filter((a) => isRenewingSoon(a, withinDays)).length;
}

export function newAgreementId(): string {
  return `agr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
