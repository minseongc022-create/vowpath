/**
 * NDJSON file store — local development and probe replay. Same interface as
 * Supabase so `pricepulse:collect` behaves identically with or without a DB.
 */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollectionRun } from "../types.ts";
import type { HealthRecord, ObservationBatch, PricepulseStore } from "./index.ts";

export function createFileStore(dir: string): PricepulseStore {
  const ensure = async () => {
    await mkdir(dir, { recursive: true });
  };
  const fingerprintFile = path.join(dir, "fingerprints.json");

  const readFingerprints = async (): Promise<Record<string, string>> => {
    try {
      return JSON.parse(await readFile(fingerprintFile, "utf8")) as Record<string, string>;
    } catch {
      return {};
    }
  };

  return {
    name: `file:${dir}`,

    async saveRun(run: CollectionRun) {
      await ensure();
      await appendFile(path.join(dir, "runs.ndjson"), `${JSON.stringify(run)}\n`, "utf8");
    },

    async saveObservations(batch: ObservationBatch) {
      if (!batch.items.length) return 0;
      await ensure();
      const file = path.join(dir, `observations-${batch.observedOn}.ndjson`);
      const lines = batch.items
        .map((item) =>
          JSON.stringify({
            runId: batch.runId,
            targetId: batch.targetId,
            source: batch.source,
            observedOn: batch.observedOn,
            ...item,
          }),
        )
        .join("\n");
      await appendFile(file, `${lines}\n`, "utf8");
      return batch.items.length;
    },

    async saveHealth(record: HealthRecord) {
      await ensure();
      await appendFile(
        path.join(dir, "health.ndjson"),
        `${JSON.stringify({ ...record, at: new Date().toISOString() })}\n`,
        "utf8",
      );
      if (record.diagnostics.fingerprint) {
        const all = await readFingerprints();
        all[record.targetId] = record.diagnostics.fingerprint;
        await writeFile(fingerprintFile, JSON.stringify(all, null, 2), "utf8");
      }
    },

    async getLastFingerprint(targetId: string) {
      const all = await readFingerprints();
      return all[targetId] ?? null;
    },
  };
}
