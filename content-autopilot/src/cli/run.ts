#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAllBrands, loadBrand, loadEnvFile, ROOT } from "../config/load.ts";
import { produceOne, runGenerateAll, runNightly } from "../pipeline/produce.ts";
import { buildNotifyPayload, notifyComplete } from "../notify/index.ts";
import { applyConnectionsToEnv, connectionSummary } from "../connections/store.ts";
import { log } from "../lib/utils.ts";

loadEnvFile();

async function main() {
  const [, , cmd = "help", ...rest] = process.argv;

  if (cmd === "help" || cmd === "--help") {
    printHelp();
    return;
  }

  if (cmd === "list-brands") {
    console.log(loadAllBrands().map((b) => `${b.id}\t${b.name}\t${b.publishing.platform}`).join("\n"));
    return;
  }

  if (cmd === "dashboard") {
    const { startDashboard } = await import("../web/server.ts");
    startDashboard();
    return;
  }

  if (cmd === "connections") {
    const c = applyConnectionsToEnv();
    console.log(connectionSummary(c));
    return;
  }

  if (cmd === "dry-run") {
    process.env.MOCK_LLM = process.env.MOCK_LLM || "1";
    process.env.PUBLISH_MODE = "filesystem";
    const brandId = flag(rest, "--brand") || "personal-naver";
    const brand = loadBrand(brandId);
    const result = await produceOne(brand, { publish: true, maxAttempts: 2 });
    const summaryDir = join(ROOT, "data", "runs");
    mkdirSync(summaryDir, { recursive: true });
    const path = join(summaryDir, `dry-run-${brand.id}-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify(result, null, 2));
    log("info", `Dry-run OK → ${path}`);
    console.log(`\nTITLE: ${result.article.title}`);
    console.log(`QUALITY: passed=${result.quality.passed} score=${result.quality.score.toFixed(2)}`);
    console.log(`CHARS: ${result.article.charCount}`);
    console.log(`OUT: ${result.published?.url}`);
    return;
  }

  if (cmd === "produce") {
    const brandId = flag(rest, "--brand");
    if (!brandId) throw new Error("--brand <id> required");
    const brand = loadBrand(brandId);
    const result = await produceOne(brand, { publish: true });
    console.log(JSON.stringify({ title: result.article.title, quality: result.quality, published: result.published }, null, 2));
    return;
  }

  if (cmd === "generate-all") {
    process.env.MOCK_LLM = process.env.MOCK_LLM || (!process.env.LLM_API_KEY ? "1" : "0");
    const results = await runGenerateAll();
    const payload = buildNotifyPayload(results);
    await notifyComplete(payload);
    const summaryDir = join(ROOT, "data", "runs");
    mkdirSync(summaryDir, { recursive: true });
    const path = join(summaryDir, `generate-all-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify(results, null, 2));
    log("info", `Generate-all complete → ${path}`);
    return;
  }

  if (cmd === "nightly") {
    const brands = loadAllBrands();
    const n = Number(process.env.POSTS_PER_BRAND || flag(rest, "--count") || 1);
    const results = await runNightly(brands, n);
    const payload = buildNotifyPayload(results);
    await notifyComplete(payload);
    const summaryDir = join(ROOT, "data", "runs");
    mkdirSync(summaryDir, { recursive: true });
    const path = join(summaryDir, `nightly-${Date.now()}.json`);
    writeFileSync(
      path,
      JSON.stringify(
        results.map((r) => ({
          brandId: r.brandId,
          title: r.article.title,
          passed: r.quality.passed,
          published: r.published,
        })),
        null,
        2,
      ),
    );
    log("info", `Nightly complete → ${path}`);
    return;
  }

  printHelp();
  process.exitCode = 1;
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i >= 0) return args[i + 1];
  const pref = args.find((a) => a.startsWith(`${name}=`));
  return pref?.split("=")[1];
}

function printHelp() {
  console.log(`content-autopilot

Commands:
  list-brands
  dashboard                  Local UI to connect WordPress/Blogger/Naver (http://127.0.0.1:3847)
  connections                Show saved platform connections
  dry-run [--brand <id>]       Offline mock pipeline + quality gate
  produce --brand <id>       Real LLM produce + publish (needs LLM_API_KEY)
  generate-all               3 platforms (Naver/WP/Blogger) — 1 post each + notification
  nightly [--count N]        All brands batch + notification

Env: see .env.example
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
