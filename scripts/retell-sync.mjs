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
console.log("\nTest: call your shop line — press 1 → press 2 for AI on the call (or press 1 for SMS form).");
