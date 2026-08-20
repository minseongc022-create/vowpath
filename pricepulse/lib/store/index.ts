/**
 * Storage seam. Supabase in production; NDJSON files locally so the collector
 * can be developed and replayed with zero infrastructure.
 */
import type { CollectedItem, CollectionRun, ParseDiagnostics } from "../types.ts";
import { getRuntimeConfig, type RuntimeConfig } from "../config.ts";

export type ObservationBatch = {
  runId: string;
  targetId: string;
  source: string;
  observedOn: string;
  items: CollectedItem[];
};

export type HealthRecord = {
  runId: string;
  targetId: string;
  diagnostics: ParseDiagnostics;
};

export interface PricepulseStore {
  readonly name: string;
  saveRun(run: CollectionRun): Promise<void>;
  saveObservations(batch: ObservationBatch): Promise<number>;
  saveHealth(record: HealthRecord): Promise<void>;
  /** Shape hash from this target's previous successful run, for drift detection. */
  getLastFingerprint(targetId: string): Promise<string | null>;
}

export async function createStore(config: RuntimeConfig = getRuntimeConfig()): Promise<PricepulseStore> {
  if (config.supabaseUrl && config.supabaseServiceKey) {
    const { createSupabaseStore } = await import("./supabase.ts");
    return createSupabaseStore(config.supabaseUrl, config.supabaseServiceKey);
  }
  const { createFileStore } = await import("./file.ts");
  return createFileStore(config.fileStoreDir);
}
