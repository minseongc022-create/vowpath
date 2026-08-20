/**
 * Runtime configuration. Profile and watchlist live as JSON on disk so the
 * probe can regenerate them and a human can review the diff before deploy.
 * Loading fails loudly — a collector that silently falls back to defaults is
 * how you lose a week of history.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { CollectTarget } from "./types.ts";
import { validateProfile, type SourceProfile } from "./profile.ts";

export const CONFIG_DIR =
  process.env.PRICEPULSE_CONFIG_DIR?.trim() ||
  path.join(process.cwd(), "pricepulse", "config");

export const PROFILE_PATH = path.join(CONFIG_DIR, "profile.toss-shopping.json");
export const TARGETS_PATH = path.join(CONFIG_DIR, "targets.json");

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `pricepulse: cannot read ${file} (${(error as Error).message}). ` +
        "Set PRICEPULSE_CONFIG_DIR or check outputFileTracingIncludes for the cron route.",
    );
  }
}

export function loadProfile(file: string = PROFILE_PATH): SourceProfile {
  const profile = readJson(file) as SourceProfile;
  const errors = validateProfile(profile);
  if (errors.length) throw new Error(`pricepulse: invalid profile ${file}:\n- ${errors.join("\n- ")}`);
  return profile;
}

export function loadTargets(file: string = TARGETS_PATH): CollectTarget[] {
  const raw = readJson(file) as { targets?: CollectTarget[] };
  const targets = Array.isArray(raw.targets) ? raw.targets : [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (!target.id || !target.query) throw new Error(`pricepulse: target missing id/query: ${JSON.stringify(target)}`);
    if (seen.has(target.id)) throw new Error(`pricepulse: duplicate target id "${target.id}"`);
    seen.add(target.id);
  }
  return targets.filter((target) => target.enabled !== false);
}

export type RuntimeConfig = {
  userAgent: string;
  minGapMs: number;
  timeoutMs: number;
  retries: number;
  defaultPages: number;
  maxPages: number;
  respectRobots: boolean;
  /** Guard rail: refuse to collect with an unverified profile unless opted in. */
  allowUnverifiedProfile: boolean;
  alertWebhook: string | null;
  supabaseUrl: string | null;
  supabaseServiceKey: string | null;
  fileStoreDir: string;
};

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    // Identify honestly: a contactable UA is what keeps a small crawler welcome.
    userAgent:
      env.PRICEPULSE_USER_AGENT?.trim() ||
      `PricepulseBot/0.1 (+contact: ${env.PRICEPULSE_CONTACT?.trim() || "unset, set PRICEPULSE_CONTACT"})`,
    minGapMs: num(env.PRICEPULSE_MIN_GAP_MS, 1_500),
    timeoutMs: num(env.PRICEPULSE_TIMEOUT_MS, 15_000),
    retries: num(env.PRICEPULSE_RETRIES, 3),
    defaultPages: num(env.PRICEPULSE_PAGES, 2),
    maxPages: num(env.PRICEPULSE_MAX_PAGES, 5),
    respectRobots: flag(env.PRICEPULSE_RESPECT_ROBOTS, true),
    allowUnverifiedProfile: flag(env.PRICEPULSE_ALLOW_UNVERIFIED_PROFILE, false),
    alertWebhook: env.PRICEPULSE_ALERT_WEBHOOK?.trim() || null,
    supabaseUrl: env.PRICEPULSE_SUPABASE_URL?.trim() || null,
    supabaseServiceKey: env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
    fileStoreDir:
      env.PRICEPULSE_FILE_STORE_DIR?.trim() || path.join(process.cwd(), "pricepulse", "data"),
  };
}
