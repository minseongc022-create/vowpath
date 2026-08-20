/**
 * Collection-side target source. When Supabase is configured, the watchlist
 * is whatever sellers have actually registered (pricepulse_targets) — no
 * admin curation step. Falls back to the static config/targets.json seed
 * list only for local development without a database.
 */
import { createClient } from "@supabase/supabase-js";
import type { CollectTarget, TargetKind } from "../types.ts";
import { loadTargets } from "../config.ts";
import type { RuntimeConfig } from "../config.ts";
import { getRuntimeConfig } from "../config.ts";

export async function listCollectionTargets(config: RuntimeConfig = getRuntimeConfig()): Promise<CollectTarget[]> {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    return loadTargets();
  }

  const db = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db
    .from("pricepulse_targets")
    .select("id, kind, query")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listCollectionTargets: ${error.message}`);

  return (data ?? []).map((row: { id: string; kind: string; query: string }) => ({
    id: row.id,
    kind: (row.kind as TargetKind) ?? "keyword",
    query: row.query,
    enabled: true,
  }));
}
