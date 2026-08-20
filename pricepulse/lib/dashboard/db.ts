/**
 * Read-only Supabase access for the dashboard. Server-side only — this module
 * holds the service role key and must never be imported from a Client
 * Component or a route that ships to the browser bundle.
 *
 * Every query here reads from pricepulse_* tables/views defined in
 * pricepulse/sql/001_init.sql. Nothing here writes.
 */
import { createClient } from "@supabase/supabase-js";

export type RankRow = {
  target_id: string;
  external_id: string;
  name: string;
  seller_name: string | null;
  observed_on: string;
  rank_today: number;
  rank_prev: number | null;
  rank_delta: number | null;
  price_today: number | null;
  price_prev: number | null;
  price_delta: number | null;
};

export type PriceHistoryRow = {
  observed_on: string;
  price: number | null;
  list_price: number | null;
  rank: number;
  sold_out: boolean | null;
};

export type ProductInfo = {
  external_id: string;
  name: string;
  seller_name: string | null;
  product_url: string | null;
  image_url: string | null;
};

export function isDashboardDbConfigured(): boolean {
  return Boolean(
    process.env.PRICEPULSE_SUPABASE_URL?.trim() &&
      process.env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function client() {
  const url = process.env.PRICEPULSE_SUPABASE_URL?.trim();
  const key = process.env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Pricepulse dashboard: PRICEPULSE_SUPABASE_URL / PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY not set. " +
        "See pricepulse/README.md.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Latest-day rank board for one target, best rank first. */
export async function getRankBoard(targetId: string): Promise<RankRow[]> {
  const { data, error } = await client()
    .from("pricepulse_rank_moves")
    .select("*")
    .eq("target_id", targetId)
    .order("rank_today", { ascending: true });
  if (error) throw new Error(`getRankBoard: ${error.message}`);
  return (data ?? []) as RankRow[];
}

/** target_id → keyword text, for display on cross-seller views like trending. */
export async function getTargetQueries(): Promise<Map<string, string>> {
  const { data, error } = await client().from("pricepulse_targets").select("id, query");
  if (error) throw new Error(`getTargetQueries: ${error.message}`);
  return new Map((data ?? []).map((row: { id: string; query: string }) => [row.id, row.query]));
}

/** Which target ids actually have data yet — drives the dropdown + empty states. */
export async function getCollectedTargetIds(): Promise<Set<string>> {
  const { data, error } = await client()
    .from("pricepulse_health")
    .select("target_id")
    .not("parsed_item_count", "is", null)
    .gt("parsed_item_count", 0);
  if (error) throw new Error(`getCollectedTargetIds: ${error.message}`);
  return new Set((data ?? []).map((row: { target_id: string }) => row.target_id));
}

/** Biggest rank climbs across every target's latest day — the "급상승" feed. */
export async function getTrending(limit = 30): Promise<RankRow[]> {
  const { data, error } = await client()
    .from("pricepulse_rank_moves")
    .select("*")
    .not("rank_delta", "is", null)
    .gt("rank_delta", 0)
    .order("rank_delta", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getTrending: ${error.message}`);
  return (data ?? []) as RankRow[];
}

/** Full price/rank time series for one product. */
export async function getPriceHistory(externalId: string, days = 90): Promise<PriceHistoryRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await client()
    .from("pricepulse_observations")
    .select("observed_on, price, list_price, rank, sold_out")
    .eq("source", "toss-shopping")
    .eq("external_id", externalId)
    .gte("observed_on", since)
    .order("observed_on", { ascending: true });
  if (error) throw new Error(`getPriceHistory: ${error.message}`);
  return (data ?? []) as PriceHistoryRow[];
}

export async function getProductInfo(externalId: string): Promise<ProductInfo | null> {
  const { data, error } = await client()
    .from("pricepulse_products")
    .select("external_id, name, seller_name, product_url, image_url")
    .eq("source", "toss-shopping")
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw new Error(`getProductInfo: ${error.message}`);
  return (data as ProductInfo | null) ?? null;
}

export type RunSummary = {
  id: string;
  started_at: string;
  ok: boolean;
  target_count: number;
  failed_count: number;
  item_count: number;
  stored_count: number;
};

/** Most recent collection runs — "is this thing even alive" at a glance. */
export async function getRecentRuns(limit = 10): Promise<RunSummary[]> {
  const { data, error } = await client()
    .from("pricepulse_runs")
    .select("id, started_at, ok, target_count, failed_count, item_count, stored_count")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentRuns: ${error.message}`);
  return (data ?? []) as RunSummary[];
}
