import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { kstDay, toBool, toFloat, toInt, toText } from "../../pricepulse/lib/normalize.ts";
import { getPath, renderTemplate, shapeFingerprint, validateProfile } from "../../pricepulse/lib/profile.ts";
import { discover, findItemArrays } from "../../pricepulse/lib/parse/discover.ts";
import { extractEmbeddedJson, extractNextData } from "../../pricepulse/lib/parse/html.ts";
import { evaluateHealth, parseSearchPayload } from "../../pricepulse/lib/parse/search.ts";
import { parseRobots, robotsAllows, sanitizeHeaders } from "../../pricepulse/lib/fetch/http.ts";
import { buildSearchRequest } from "../../pricepulse/lib/collect/run.ts";
import { formatAlert, resetAlertDedupe, shouldSend } from "../../pricepulse/lib/alert.ts";

const ROOT = process.cwd();
const readFixture = (name) => readFileSync(path.join(ROOT, "pricepulse/fixtures", name), "utf8");
const readJsonFixture = (name) => JSON.parse(readFixture(name));

const profile = JSON.parse(readFileSync(path.join(ROOT, "pricepulse/config/profile.toss-shopping.json"), "utf8"));

test("normalizers survive Korean price formatting", () => {
  assert.equal(toInt("19,900원"), 19900);
  assert.equal(toInt(" 24900 "), 24900);
  assert.equal(toInt(19900.4), 19900);
  assert.equal(toInt("무료"), null);
  assert.equal(toInt(null), null);
  assert.equal(toFloat("4.7점"), 4.7);
  assert.equal(toText("  이어폰  "), "이어폰");
  assert.equal(toText(""), null);
  assert.equal(toBool("SOLD_OUT"), true);
  assert.equal(toBool("ON_SALE"), false);
  assert.equal(toBool("아마도"), null);
});

test("snapshot day is KST, not UTC", () => {
  // 2026-03-02 15:30 UTC == 2026-03-03 00:30 KST → belongs to the 3rd.
  assert.equal(kstDay(new Date("2026-03-02T15:30:00Z")), "2026-03-03");
  assert.equal(kstDay(new Date("2026-03-02T14:30:00Z")), "2026-03-02");
});

test("path resolution handles nesting and array indexes", () => {
  const root = { a: { b: [{ c: 1 }, { c: 2 }] }, list: ["x", "y"] };
  assert.equal(getPath(root, "a.b[1].c"), 2);
  assert.equal(getPath(root, "list[0]"), "x");
  assert.equal(getPath(root, "a.missing.deep"), undefined);
  assert.equal(renderTemplate("p={{page}}&q={{keyword}}", { page: 2, keyword: "립밤" }), "p=2&q=립밤");
});

test("shipped profile is structurally valid", () => {
  assert.deepEqual(validateProfile(profile), []);
});

test("parses a search payload into ranked rows", () => {
  const payload = readJsonFixture("search-json-v1.json");
  const { items, diagnostics } = parseSearchPayload(payload, { profile, page: 1 });

  assert.equal(diagnostics.itemsPathUsed, "result.products");
  assert.ok(items.length >= 10);
  assert.equal(items[0].rank, 1);
  assert.equal(items[0].name.length > 0, true);
  assert.equal(typeof items[0].price, "number");
  // Relative product urls become absolute so the dashboard can link out.
  assert.match(items[0].productUrl, /^https:\/\/shopping\.toss\.im\/product\//);
  assert.equal(items[0].sellerName !== null, true);
});

test("ad rows are skipped and duplicates keep the better rank", () => {
  const payload = readJsonFixture("search-json-v1.json");
  const { items, diagnostics } = parseSearchPayload(payload, { profile, page: 1 });

  // Fixture holds one banner row (no id/name) and one repeated product.
  assert.ok(diagnostics.rawItemCount > diagnostics.parsedItemCount);
  const ids = items.map((item) => item.externalId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(diagnostics.warnings.some((warning) => warning.includes("skipped")));
});

test("rank is absolute across pages", () => {
  const page2 = readJsonFixture("search-json-v1-page2.json");
  const { items } = parseSearchPayload(page2, { profile, page: 2 });
  assert.equal(items[0].rank, profile.search.pageSize + 1);
  assert.equal(items[0].page, 2);
});

test("listing embedded in the HTML document is found", () => {
  const html = readFixture("search-page-embedded.html");
  assert.equal(extractNextData(html).length, 1);
  assert.ok(extractEmbeddedJson(html).length >= 1);

  const embeddedProfile = {
    ...profile,
    search: {
      ...profile.search,
      mode: "html-embedded",
      itemsPath: ["props.pageProps.searchResult.products"],
    },
  };
  const { items, diagnostics } = parseSearchPayload(html, { profile: embeddedProfile, page: 1 });
  assert.ok(items.length >= 4);
  assert.ok(diagnostics.warnings.some((warning) => warning.includes("embedded JSON")));
});

test("a payload the profile does not match fails loudly, with a suggestion", () => {
  const alt = readJsonFixture("search-json-v2-alt-shape.json");
  const { items, diagnostics } = parseSearchPayload(alt, { profile, page: 1 });

  assert.equal(items.length, 0);
  assert.equal(diagnostics.itemsPathUsed, null);
  assert.ok(diagnostics.warnings.some((warning) => warning.includes("data.searchResult.items")));

  const health = evaluateHealth(diagnostics);
  assert.equal(health.ok, false);
  assert.equal(health.severity, "critical");
});

test("discovery locates the listing in an unknown shape and proposes fields", () => {
  const alt = readJsonFixture("search-json-v2-alt-shape.json");
  const [best] = discover(alt);

  assert.equal(best.itemsPath, "data.searchResult.items");
  assert.equal(best.length, 8);
  assert.deepEqual(best.missingRequired, []);
  assert.equal(best.fields.externalId[0], "goodsId");
  assert.equal(best.fields.name[0], "title");
  assert.ok(best.fields.price[0].startsWith("price."));
  assert.ok(findItemArrays(alt).length >= 1);
});

test("a rediscovered profile parses the new shape with no code change", () => {
  const alt = readJsonFixture("search-json-v2-alt-shape.json");
  const [best] = discover(alt);
  const rebuilt = {
    ...profile,
    search: { ...profile.search, itemsPath: [best.itemsPath], pageSize: 8, fields: best.fields },
  };

  const { items, diagnostics } = parseSearchPayload(alt, { profile: rebuilt, page: 1 });
  assert.equal(items.length, 8);
  assert.equal(items[0].externalId, "G0");
  assert.equal(items[0].price, 10000);
  assert.equal(items[0].sellerName, "사운드랩");
  assert.equal(evaluateHealth(diagnostics).ok, true);
});

test("payload shape change is a warning even when the parse still works", () => {
  const payload = readJsonFixture("search-json-v1.json");
  const { diagnostics } = parseSearchPayload(payload, { profile, page: 1 });
  assert.ok(diagnostics.fingerprint);

  const same = evaluateHealth(diagnostics, { previousFingerprint: diagnostics.fingerprint });
  assert.equal(same.severity, "ok");

  const drifted = evaluateHealth(diagnostics, { previousFingerprint: "0000deadbeef0000" });
  assert.equal(drifted.severity, "warn");
  assert.equal(drifted.ok, true);
  assert.ok(drifted.reasons[0].includes("shape changed"));

  assert.notEqual(
    shapeFingerprint({ productId: 1, name: "a" }),
    shapeFingerprint({ productId: 1, name: "a", newField: 2 }),
  );
});

test("missing prices across the page are critical, not a shrug", () => {
  const payload = readJsonFixture("search-json-v1.json");
  for (const product of payload.result.products) delete product.salePrice;
  const { items, diagnostics } = parseSearchPayload(payload, { profile, page: 1 });

  assert.ok(items.length > 0, "rows still parse — only the price is gone");
  assert.ok(diagnostics.coverage.price < 0.8);
  assert.equal(evaluateHealth(diagnostics).severity, "critical");
});

test("search requests are built from the profile template", () => {
  const request = buildSearchRequest(profile, { keyword: "립밤", page: 3, size: 40 }, "PricepulseBot/0.1");
  const url = new URL(request.url);
  assert.equal(url.searchParams.get("keyword"), "립밤");
  assert.equal(url.searchParams.get("page"), "3");
  assert.equal(url.searchParams.get("size"), "40");
  assert.equal(request.headers["user-agent"], "PricepulseBot/0.1");
});

test("robots.txt is respected, longest match wins", () => {
  const robots = [
    "User-agent: *",
    "Disallow: /api/",
    "Allow: /api/v1/search",
    "Crawl-delay: 2",
    "",
    "User-agent: BadBot",
    "Disallow: /",
  ].join("\n");

  const rules = parseRobots(robots, "PricepulseBot/0.1");
  assert.equal(rules.crawlDelaySec, 2);
  assert.equal(robotsAllows(rules, "/api/v1/search/products"), true);
  assert.equal(robotsAllows(rules, "/api/internal/orders"), false);
  assert.equal(robotsAllows(rules, "/search"), true);

  const bad = parseRobots(robots, "BadBot");
  assert.equal(robotsAllows(bad, "/search"), false);
});

test("alerts dedupe inside the window", () => {
  resetAlertDedupe();
  const now = Date.now();
  assert.equal(shouldSend("parse|kw-lip-balm", now), true);
  assert.equal(shouldSend("parse|kw-lip-balm", now + 60_000), false);
  assert.equal(shouldSend("parse|kw-lip-balm", now + 2 * 60 * 60 * 1000), true);

  const text = formatAlert({
    severity: "critical",
    key: "k",
    title: "수집 실패",
    detail: "0 items",
    context: { targetId: "kw-lip-balm" },
  });
  assert.ok(text.includes("[pricepulse]"));
  assert.ok(text.includes("targetId=kw-lip-balm"));
});

test("header values are forced to latin-1 so a Korean contact cannot break fetch", () => {
  const headers = sanitizeHeaders({
    "user-agent": "PricepulseBot/0.1 (+contact: 김민성 — 서울)",
    "accept-language": "ko-KR,ko;q=0.9",
  });
  // fetch() throws on any code point above 255; the request must still go out.
  assert.equal(/[^\x00-\xFF]/.test(headers["user-agent"]), false);
  assert.ok(headers["user-agent"].startsWith("PricepulseBot/0.1"));
  assert.equal(headers["accept-language"], "ko-KR,ko;q=0.9");
});
