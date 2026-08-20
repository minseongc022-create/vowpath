#!/usr/bin/env node
/**
 * Replay a captured payload through the real parser — no network needed.
 *
 *   npm run pricepulse:replay -- pricepulse/captures/<stamp>/xhr_*.json
 *   npm run pricepulse:replay -- <file> --profile pricepulse/captures/<stamp>/profile.proposed.json
 *
 * Use this after every profile change, and to turn a captured payload into a
 * regression fixture. Exits non-zero when the parse would be alert-worthy.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadProfile } from "../pricepulse/lib/config.ts";
import { evaluateHealth, parseSearchPayload } from "../pricepulse/lib/parse/search.ts";
import { discover } from "../pricepulse/lib/parse/discover.ts";

const argv = process.argv.slice(2);
const file = argv.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("usage: pricepulse:replay -- <capture file> [--profile <path>] [--page <n>]");
  process.exit(2);
}
const profilePath = argv.includes("--profile") ? argv[argv.indexOf("--profile") + 1] : undefined;
const page = argv.includes("--page") ? Number(argv[argv.indexOf("--page") + 1]) : 1;

const profile = loadProfile(profilePath ? path.resolve(profilePath) : undefined);
const raw = readFileSync(path.resolve(file), "utf8");
const payload = file.endsWith(".html") ? raw : JSON.parse(raw);

const { items, diagnostics } = parseSearchPayload(payload, { profile, page });
const health = evaluateHealth(diagnostics);

console.log(`\nprofile: ${profilePath ?? "pricepulse/config/profile.toss-shopping.json"} (${profile.status})`);
console.log(`itemsPath: ${diagnostics.itemsPathUsed ?? "— not found —"}`);
console.log(`items: ${diagnostics.parsedItemCount}/${diagnostics.rawItemCount} parsed`);
console.log(`fingerprint: ${diagnostics.fingerprint ?? "—"}`);

console.log("\nfield coverage:");
for (const [field, ratio] of Object.entries(diagnostics.coverage)) {
  const bar = "█".repeat(Math.round(ratio * 20)).padEnd(20, "·");
  console.log(`  ${field.padEnd(13)} ${bar} ${(ratio * 100).toFixed(0)}%  ← ${diagnostics.matchedPaths[field] ?? "—"}`);
}

if (items.length) {
  console.log("\nfirst rows:");
  for (const item of items.slice(0, 5)) {
    console.log(
      `  #${String(item.rank).padStart(3)}  ${String(item.price ?? "—").padStart(8)}원  ` +
        `${(item.sellerName ?? "—").slice(0, 14).padEnd(14)}  ${item.name.slice(0, 48)}`,
    );
  }
}

if (diagnostics.warnings.length) {
  console.log("\nwarnings:");
  for (const warning of diagnostics.warnings) console.log(`  ! ${warning}`);
}

if (!health.ok || diagnostics.parsedItemCount === 0) {
  console.log("\ndiscovery says:");
  for (const proposal of discover(payload, 2)) {
    console.log(`  itemsPath "${proposal.itemsPath}" (${proposal.length} items, score ${proposal.score.toFixed(0)})`);
    for (const [field, paths] of Object.entries(proposal.fields)) {
      console.log(`    ${field.padEnd(13)} ← ${paths.join(", ")}`);
    }
  }
}

console.log(`\nhealth: ${health.severity}${health.reasons.length ? ` — ${health.reasons.join("; ")}` : ""}`);
process.exit(health.ok ? 0 : 1);
