/**
 * Auto-sync Retell agent prompt + tools on Vercel production deploy.
 */
import { runRetellSync } from "./lib/run-retell-sync.mjs";

if (process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "production") {
  console.log("[postbuild] skip Retell sync (not Vercel production)");
  process.exit(0);
}

const result = await runRetellSync();
if (!result.ok) {
  if (result.error === "RETELL_API_KEY not set") {
    console.log("[postbuild] skip Retell sync (RETELL_API_KEY not set)");
    process.exit(0);
  }
  console.error("[postbuild] Retell sync failed:", result.error);
  process.exit(1);
}

console.log("[postbuild] Retell agent synced →", result.phone);
