/**
 * Supabase (Postgres) store. Schema: pricepulse/sql/001_init.sql.
 * Writes go through PostgREST rather than a pooled TCP connection — one less
 * thing to babysit on serverless.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectionRun } from "../types.ts";
import type { HealthRecord, ObservationBatch, PricepulseStore } from "./index.ts";

const CHUNK = 500;

function chunked<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export function createSupabaseStore(url: string, serviceKey: string): PricepulseStore {
  const client: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    name: "supabase",

    async saveRun(run: CollectionRun) {
      const { error } = await client.from("pricepulse_runs").upsert(
        {
          id: run.runId,
          source: run.source,
          started_at: run.startedAt,
          finished_at: run.finishedAt,
          ok: run.ok,
          dry_run: run.dryRun,
          target_count: run.totals.targets,
          failed_count: run.totals.failedTargets,
          item_count: run.totals.items,
          stored_count: run.totals.stored,
          alerts: run.alerts,
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(`saveRun: ${error.message}`);
    },

    async saveObservations(batch: ObservationBatch) {
      if (!batch.items.length) return 0;

      const products = batch.items.map((item) => ({
        source: batch.source,
        external_id: item.externalId,
        name: item.name,
        seller_name: item.sellerName,
        category_name: item.categoryName,
        product_url: item.productUrl,
        image_url: item.imageUrl,
        last_seen_at: new Date().toISOString(),
      }));
      for (const rows of chunked(products)) {
        const { error } = await client
          .from("pricepulse_products")
          .upsert(rows, { onConflict: "source,external_id" });
        if (error) throw new Error(`saveObservations/products: ${error.message}`);
      }

      const observations = batch.items.map((item) => ({
        run_id: batch.runId,
        target_id: batch.targetId,
        source: batch.source,
        external_id: item.externalId,
        observed_on: batch.observedOn,
        observed_at: new Date().toISOString(),
        rank: item.rank,
        page: item.page,
        price: item.price,
        list_price: item.listPrice,
        delivery_fee: item.deliveryFee,
        review_count: item.reviewCount,
        rating: item.rating,
        sold_out: item.soldOut,
        seller_name: item.sellerName,
        name: item.name,
      }));
      let stored = 0;
      for (const rows of chunked(observations)) {
        // One row per (target, product, KST day) — a retry overwrites, never duplicates.
        const { error } = await client
          .from("pricepulse_observations")
          .upsert(rows, { onConflict: "target_id,external_id,observed_on" });
        if (error) throw new Error(`saveObservations/observations: ${error.message}`);
        stored += rows.length;
      }
      return stored;
    },

    async saveHealth(record: HealthRecord) {
      const { error } = await client.from("pricepulse_health").insert({
        run_id: record.runId,
        target_id: record.targetId,
        fingerprint: record.diagnostics.fingerprint,
        items_path: record.diagnostics.itemsPathUsed,
        raw_item_count: record.diagnostics.rawItemCount,
        parsed_item_count: record.diagnostics.parsedItemCount,
        coverage: record.diagnostics.coverage,
        matched_paths: record.diagnostics.matchedPaths,
        warnings: record.diagnostics.warnings,
      });
      if (error) throw new Error(`saveHealth: ${error.message}`);
    },

    async getLastFingerprint(targetId: string) {
      const { data, error } = await client
        .from("pricepulse_health")
        .select("fingerprint")
        .eq("target_id", targetId)
        .not("fingerprint", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw new Error(`getLastFingerprint: ${error.message}`);
      return data?.[0]?.fingerprint ?? null;
    },
  };
}
