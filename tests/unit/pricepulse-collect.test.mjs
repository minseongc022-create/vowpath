import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";

import { runCollection } from "../../pricepulse/lib/collect/run.ts";
import { getRuntimeConfig } from "../../pricepulse/lib/config.ts";
import { resetAlertDedupe } from "../../pricepulse/lib/alert.ts";

const ROOT = process.cwd();
const fixture = (name) => JSON.parse(readFileSync(path.join(ROOT, "pricepulse/fixtures", name), "utf8"));

const PAGE_1 = fixture("search-json-v1.json");
const PAGE_2 = fixture("search-json-v1-page2.json");

/** Fake Toss Shopping: serves the fixtures, counts requests, can be told to fail. */
async function startFakeSource({ failStatus = null } = {}) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    if (req.url.startsWith("/robots.txt")) {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("User-agent: *\nDisallow: /admin/\n");
      return;
    }
    if (failStatus) {
      res.writeHead(failStatus, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "nope" }));
      return;
    }
    const url = new URL(req.url, "http://localhost");
    const page = Number(url.searchParams.get("page") ?? "1");
    const body = page === 1 ? PAGE_1 : page === 2 ? PAGE_2 : { result: { products: [] } };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function memoryStore() {
  const observations = new Map();
  const runs = [];
  const health = [];
  return {
    name: "memory",
    observations,
    runs,
    health,
    async saveRun(run) {
      runs.push(run);
    },
    async saveObservations(batch) {
      for (const item of batch.items) {
        // Mirrors the production unique key (target, product, KST day).
        observations.set(`${batch.targetId}|${item.externalId}|${batch.observedOn}`, item);
      }
      return batch.items.length;
    },
    async saveHealth(record) {
      health.push(record);
    },
    async getLastFingerprint() {
      return null;
    },
  };
}

function testProfile(origin) {
  const base = JSON.parse(
    readFileSync(path.join(ROOT, "pricepulse/config/profile.toss-shopping.json"), "utf8"),
  );
  return {
    ...base,
    status: "verified",
    search: {
      ...base.search,
      pageSize: 12,
      endpoint: { ...base.search.endpoint, url: `${origin}/api/v1/search/products` },
    },
  };
}

const targets = [{ id: "kw-test", kind: "keyword", query: "무선이어폰", label: "무선이어폰", pages: 2 }];

function fastConfig(overrides = {}) {
  return { ...getRuntimeConfig(), minGapMs: 1, retries: 0, timeoutMs: 5_000, ...overrides };
}

test("collects both pages, dedupes, and stores one row per product per day", async () => {
  resetAlertDedupe();
  const source = await startFakeSource();
  try {
    const store = memoryStore();
    const run = await runCollection({
      profile: testProfile(source.origin),
      targets,
      config: fastConfig(),
      store,
      now: new Date("2026-03-02T15:30:00Z"), // 2026-03-03 KST
    });

    assert.equal(run.ok, true);
    assert.equal(run.targets[0].pagesFetched, 2);
    assert.equal(run.totals.failedTargets, 0);

    const keys = [...store.observations.keys()];
    assert.equal(keys.length, run.totals.items);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.every((key) => key.endsWith("|2026-03-03")), "day key is KST");

    const ranks = [...store.observations.values()].map((item) => item.rank).sort((a, b) => a - b);
    assert.equal(ranks[0], 1);
    assert.ok(ranks.includes(13), "page 2 continues the ranking (pageSize 12 + 1)");
    assert.equal(store.runs.length, 1);
    assert.equal(store.health.length, 1);
  } finally {
    await source.close();
  }
});

test("re-running the same day overwrites instead of duplicating", async () => {
  resetAlertDedupe();
  const source = await startFakeSource();
  try {
    const store = memoryStore();
    const options = {
      profile: testProfile(source.origin),
      targets,
      config: fastConfig(),
      store,
      now: new Date("2026-03-02T15:30:00Z"),
    };
    const first = await runCollection(options);
    const sizeAfterFirst = store.observations.size;
    const second = await runCollection(options);

    assert.equal(second.totals.items, first.totals.items);
    assert.equal(store.observations.size, sizeAfterFirst);
    assert.notEqual(second.runId, first.runId);
  } finally {
    await source.close();
  }
});

test("an HTTP failure fails the target loudly and stores nothing", async () => {
  resetAlertDedupe();
  const source = await startFakeSource({ failStatus: 500 });
  try {
    const store = memoryStore();
    const run = await runCollection({
      profile: testProfile(source.origin),
      targets,
      config: fastConfig(),
      store,
    });

    assert.equal(run.ok, false);
    assert.equal(run.totals.failedTargets, 1);
    assert.equal(store.observations.size, 0);
    assert.ok(run.alerts[0].includes("kw-test"));
    assert.ok(run.targets[0].error.includes("500"));
    assert.equal(store.runs[0].ok, false);
  } finally {
    await source.close();
  }
});

test("an unverified profile refuses to collect", async () => {
  const source = await startFakeSource();
  try {
    const profile = { ...testProfile(source.origin), status: "unverified" };
    await assert.rejects(
      () => runCollection({ profile, targets, config: fastConfig(), store: memoryStore() }),
      /unverified/,
    );
  } finally {
    await source.close();
  }
});

test("robots.txt is fetched once and checked before any request", async () => {
  resetAlertDedupe();
  const source = await startFakeSource();
  try {
    const profile = testProfile(source.origin);
    profile.search.endpoint.url = `${source.origin}/admin/search`; // disallowed by the fake robots.txt
    const run = await runCollection({
      profile,
      targets,
      config: fastConfig({ respectRobots: true }),
      store: memoryStore(),
    });

    assert.equal(run.ok, false);
    assert.ok(run.targets[0].error.includes("robots.txt disallows"));
    assert.ok(source.requests.some((url) => url.startsWith("/robots.txt")));
    assert.ok(!source.requests.some((url) => url.startsWith("/admin/")));
  } finally {
    await source.close();
  }
});
