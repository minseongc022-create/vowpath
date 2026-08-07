import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadEnvFile } from "../config/load.ts";
import { applyEnvConfig, readEnvConfig } from "../config/env-store.ts";
import { applyConnectionsToEnv } from "../connections/store.ts";
import { runGenerateAll } from "../pipeline/produce.ts";
import { buildNotifyPayload, notifyComplete } from "../notify/index.ts";

export type GenerateJobState = {
  id: string;
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
  error?: string;
  results?: Array<{ brandId: string; title: string; chars: number; platform: string; url?: string }>;
};

let currentJob: GenerateJobState | null = null;

export function getGenerateJob(): GenerateJobState | null {
  return currentJob;
}

export async function startGenerateJob(): Promise<GenerateJobState> {
  if (currentJob?.status === "running") return currentJob;

  const id = String(Date.now());
  currentJob = { id, status: "running", startedAt: new Date().toISOString() };

  void (async () => {
    try {
      loadEnvFile();
      applyEnvConfig(readEnvConfig());
      applyConnectionsToEnv();
      if (!process.env.LLM_API_KEY) process.env.MOCK_LLM = "1";

      const results = await runGenerateAll();
      const payload = buildNotifyPayload(results);
      await notifyComplete(payload);

      const summaryDir = join(ROOT, "data", "runs");
      mkdirSync(summaryDir, { recursive: true });
      writeFileSync(join(summaryDir, `generate-all-${id}.json`), JSON.stringify(results, null, 2));

      currentJob = {
        ...currentJob!,
        status: "done",
        finishedAt: new Date().toISOString(),
        results: results.map((r) => ({
          brandId: r.brandId,
          title: r.article.title,
          chars: r.article.charCount,
          platform: r.published?.platform || "?",
          url: r.published?.url,
        })),
      };
    } catch (e) {
      currentJob = {
        ...currentJob!,
        status: "error",
        finishedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : String(e),
      };
    }
  })();

  return currentJob;
}
