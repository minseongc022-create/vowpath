#!/usr/bin/env node
/**
 * Pricepulse structure probe — run this on YOUR machine (it needs real network
 * access to shopping.toss.im).
 *
 *   npm run pricepulse:probe -- --keyword "무선이어폰"
 *   npm run pricepulse:probe -- --keyword "무선이어폰" --headed
 *
 * What it does:
 *   1. opens the Toss Shopping search page in a real browser
 *   2. records every JSON response the page fetches (the listing has to be in
 *      one of them) plus the rendered HTML
 *   3. runs structure discovery over each capture and ranks the candidates
 *   4. writes pricepulse/captures/<timestamp>/ and a proposed profile
 *
 * Then: read the proposal, sanity-check the field mapping, copy it into
 * pricepulse/config/profile.toss-shopping.json, set "status": "verified".
 * Nothing collects for real until you do.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { discover } from "../pricepulse/lib/parse/discover.ts";
import { extractEmbeddedJson } from "../pricepulse/lib/parse/html.ts";

const ROOT = process.cwd();
const CANDIDATES = JSON.parse(
  readFileSync(path.join(ROOT, "pricepulse/config/probe-candidates.json"), "utf8"),
);

function parseArgs(argv) {
  const args = { keyword: "무선이어폰", headed: false, timeout: 20000, url: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--keyword") args.keyword = argv[++i];
    else if (arg === "--url") args.url = argv[++i];
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--timeout") args.timeout = Number(argv[++i]);
  }
  return args;
}

function isInteresting(url) {
  if (CANDIDATES.ignoreUrlPatterns?.some((pattern) => url.includes(pattern))) return false;
  return CANDIDATES.interestingHosts?.some((host) => url.includes(host)) ?? true;
}

function slug(url) {
  return url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 120);
}

/** Turn a concrete request URL into a templated endpoint spec. */
function templatize(requestUrl, keyword, page) {
  const url = new URL(requestUrl);
  const query = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (value === keyword || value === encodeURIComponent(keyword)) query[key] = "{{keyword}}";
    else if (/^(page|pageNo|pageNum|pageIndex|offset|start)$/i.test(key)) query[key] = "{{page}}";
    else if (/^(size|limit|count|pageSize|perPage)$/i.test(key)) query[key] = "{{size}}";
    else query[key] = value;
  }
  url.search = "";
  return { method: "GET", url: url.toString(), query, headers: { accept: "application/json" }, page };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(ROOT, "pricepulse", "captures", stamp);
  await mkdir(outDir, { recursive: true });

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  // robots.txt first — if it says no, that decides the approach, not the code.
  try {
    const robots = await fetch(CANDIDATES.robotsUrl).then((r) => r.text());
    await writeFile(path.join(outDir, "robots.txt"), robots, "utf8");
    console.log(`\n── robots.txt (${CANDIDATES.robotsUrl}) ──\n${robots.slice(0, 1200)}\n`);
  } catch (error) {
    console.warn(`robots.txt fetch failed: ${error.message}`);
  }

  const browser = await chromium.launch({ headless: !args.headed });
  const context = await browser.newContext({
    locale: "ko-KR",
    viewport: { width: 1280, height: 2000 },
  });
  const page = await context.newPage();

  const captures = [];
  page.on("response", async (response) => {
    const url = response.url();
    if (!isInteresting(url)) return;
    const type = response.headers()["content-type"] ?? "";
    if (!type.includes("json")) return;
    try {
      const text = await response.text();
      if (text.length < 200) return;
      captures.push({ url, status: response.status(), request: response.request().url(), text });
    } catch {
      /* body already consumed / redirect */
    }
  });

  const pageUrls = args.url
    ? [args.url]
    : CANDIDATES.searchPages.map((pattern) =>
        pattern.replace("{{keyword}}", encodeURIComponent(args.keyword)),
      );

  const pageReports = [];
  for (const pageUrl of pageUrls) {
    console.log(`→ ${pageUrl}`);
    try {
      const response = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: args.timeout });
      await page.waitForTimeout(3500);
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(2500);
      const html = await page.content();
      const file = path.join(outDir, `page_${slug(pageUrl)}.html`);
      await writeFile(file, html, "utf8");
      await page.screenshot({ path: path.join(outDir, `page_${slug(pageUrl)}.png`), fullPage: false });

      const embedded = extractEmbeddedJson(html);
      const embeddedProposals = embedded
        .flatMap((entry) => discover(entry.value, 2).map((proposal) => ({ ...proposal, source: entry.source })))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      pageReports.push({
        pageUrl,
        finalUrl: page.url(),
        status: response?.status() ?? null,
        htmlBytes: html.length,
        keywordInHtml: html.includes(args.keyword),
        embeddedProposals,
      });
      console.log(
        `   status=${response?.status()} html=${html.length}B embeddedCandidates=${embeddedProposals.length}`,
      );
    } catch (error) {
      pageReports.push({ pageUrl, error: error.message });
      console.log(`   failed: ${error.message}`);
    }
  }

  await browser.close();

  // ─── analyse captured JSON responses ──────────────────────────────────────
  const jsonReports = [];
  for (const capture of captures) {
    let payload;
    try {
      payload = JSON.parse(capture.text);
    } catch {
      continue;
    }
    const proposals = discover(payload, 2);
    if (!proposals.length) continue;
    const file = path.join(outDir, `xhr_${slug(capture.url)}.json`);
    await writeFile(file, capture.text, "utf8");
    jsonReports.push({
      url: capture.url,
      status: capture.status,
      file: path.relative(ROOT, file),
      best: proposals[0],
      all: proposals,
    });
  }
  jsonReports.sort((a, b) => b.best.score - a.best.score);

  console.log(`\n── captured ${captures.length} JSON responses, ${jsonReports.length} product-shaped ──`);
  for (const report of jsonReports.slice(0, 8)) {
    console.log(`\n[${report.best.score.toFixed(0)}] ${report.url}`);
    console.log(`   itemsPath: ${report.best.itemsPath}  (${report.best.length} items)`);
    console.log(`   fields:`);
    for (const [field, paths] of Object.entries(report.best.fields)) {
      console.log(`     ${field.padEnd(13)} ← ${paths.join(", ")}`);
    }
    if (report.best.missingRequired.length) {
      console.log(`   MISSING REQUIRED: ${report.best.missingRequired.join(", ")}`);
    }
  }

  // ─── write proposed profile from the best candidate ───────────────────────
  const winner = jsonReports.find((report) => report.best.missingRequired.length === 0) ?? jsonReports[0];
  let proposedPath = null;
  if (winner) {
    const endpoint = templatize(winner.url, args.keyword, 1);
    const fields = {};
    for (const [field, paths] of Object.entries(winner.best.fields)) fields[field] = paths;
    const profile = {
      version: 1,
      source: "toss-shopping",
      status: "unverified",
      notes: `Proposed by pricepulse-probe at ${stamp} for keyword "${args.keyword}". Review every field path, confirm paging params, then set status to "verified".`,
      search: {
        mode: "json",
        endpoint: { method: endpoint.method, url: endpoint.url, query: endpoint.query, headers: endpoint.headers },
        itemsPath: [winner.best.itemsPath],
        totalPath: ["totalCount", "total", "data.totalCount", "result.totalCount"],
        pageSize: winner.best.length,
        urlBase: "https://shopping.toss.im",
        fields,
      },
    };
    proposedPath = path.join(outDir, "profile.proposed.json");
    await writeFile(proposedPath, JSON.stringify(profile, null, 2), "utf8");
  }

  const report = { stamp, keyword: args.keyword, pageReports, jsonReports, proposedPath };
  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log(`\ncaptures → ${path.relative(ROOT, outDir)}`);
  if (proposedPath) {
    console.log(`proposed profile → ${path.relative(ROOT, proposedPath)}`);
    console.log(
      "\nNext: review it, copy into pricepulse/config/profile.toss-shopping.json, set status=\"verified\",\n" +
        "then: npm run pricepulse:collect -- --dry-run --only <targetId>",
    );
  } else {
    console.log(
      "\nNo product-shaped JSON found. The listing may be server-rendered: check the saved HTML and\n" +
        "the embeddedProposals in report.json, then set profile.search.mode to \"html-embedded\".",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
