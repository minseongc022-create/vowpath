/**
 * One-shot Retell production sync (local).
 * Usage: npm run retell:sync
 */
import { loadEnvLocal } from "./lib/load-env.mjs";
import { runRetellSync } from "./lib/run-retell-sync.mjs";

loadEnvLocal();

const result = await runRetellSync();
if (!result.ok) {
  console.error("Retell sync failed:", result.error);
  process.exit(1);
}

console.log("OK Retell agent synced");
console.log("  Phone:", result.phone);
console.log("  Agent:", result.agentId);
console.log("  LLM:", result.llmId);
console.log("  Voice:", result.voiceId);
console.log("\nTest: call +1 (225) 529-1680 — AI explains options, offers link vs phone.");
