/**
 * Collection orchestrator: targets → HTTP → parse → health → store.
 *
 * Rules that keep the history trustworthy:
 *  - refuse to run on an unverified profile (garbage rows are worse than none)
 *  - one row per (target, product, KST day), upserted — retries never duplicate
 *  - every target's parse health is recorded, and a failure alerts immediately
 */
import { randomUUID } from "node:crypto";
import type {
  CollectTarget,
  CollectedItem,
  CollectionRun,
  ParseDiagnostics,
  SourceId,
  TargetResult,
} from "../types.ts";
import { getRuntimeConfig, loadProfile, type RuntimeConfig } from "../config.ts";
import { listCollectionTargets } from "../store/targets.ts";
import { renderTemplate, type SourceProfile } from "../profile.ts";
import { evaluateHealth, parseSearchPayload } from "../parse/search.ts";
import { fetchWithRetry, loadRobots, RateLimiter, robotsAllows } from "../fetch/http.ts";
import { kstDay } from "../normalize.ts";
import { sendAlert } from "../alert.ts";
import { createStore, type PricepulseStore } from "../store/index.ts";

export type CollectOptions = {
  profile?: SourceProfile;
  targets?: CollectTarget[];
  config?: RuntimeConfig;
  store?: PricepulseStore;
  /** Parse and report, write nothing. */
  dryRun?: boolean;
  /** Collect only these target ids. */
  only?: string[];
  now?: Date;
};

export type SearchRequest = { url: string; method: string; headers: Record<string, string>; body?: string };

/** Endpoint spec + page → a concrete request. Shared with the probe. */
export function buildSearchRequest(
  profile: SourceProfile,
  vars: { keyword: string; page: number; size: number; category?: string },
  userAgent: string,
): SearchRequest {
  const endpoint = profile.search.endpoint;
  const substitutions = {
    keyword: encodeURIComponent(vars.keyword),
    page: vars.page,
    size: vars.size,
    category: vars.category ? encodeURIComponent(vars.category) : "",
  };

  const url = new URL(renderTemplate(endpoint.url, substitutions));
  for (const [key, value] of Object.entries(endpoint.query ?? {})) {
    // Templated query values are substituted raw — URL() re-encodes them.
    const rendered = renderTemplate(value, { ...substitutions, keyword: vars.keyword });
    url.searchParams.set(key, rendered);
  }

  return {
    url: url.toString(),
    method: endpoint.method ?? "GET",
    headers: {
      "user-agent": userAgent,
      "accept-language": "ko-KR,ko;q=0.9",
      ...(endpoint.headers ?? {}),
    },
    body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
  };
}

/** Same product on two pages ⇒ keep the better (lower) rank. */
function mergeByBestRank(items: CollectedItem[]): CollectedItem[] {
  const best = new Map<string, CollectedItem>();
  for (const item of items) {
    const existing = best.get(item.externalId);
    if (!existing || item.rank < existing.rank) best.set(item.externalId, item);
  }
  return [...best.values()].sort((a, b) => a.rank - b.rank);
}

function mergeDiagnostics(list: ParseDiagnostics[]): ParseDiagnostics {
  const merged: ParseDiagnostics = {
    itemsPathUsed: list.find((d) => d.itemsPathUsed)?.itemsPathUsed ?? null,
    rawItemCount: list.reduce((sum, d) => sum + d.rawItemCount, 0),
    parsedItemCount: list.reduce((sum, d) => sum + d.parsedItemCount, 0),
    matchedPaths: Object.assign({}, ...list.map((d) => d.matchedPaths)),
    coverage: {},
    fingerprint: list.find((d) => d.fingerprint)?.fingerprint ?? null,
    warnings: [...new Set(list.flatMap((d) => d.warnings))],
  };
  const fields = new Set(list.flatMap((d) => Object.keys(d.coverage)));
  for (const field of fields) {
    const weighted = list.filter((d) => d.parsedItemCount > 0);
    const total = weighted.reduce((sum, d) => sum + d.parsedItemCount, 0);
    if (!total) continue;
    merged.coverage[field] = Number(
      (weighted.reduce((sum, d) => sum + (d.coverage[field] ?? 0) * d.parsedItemCount, 0) / total).toFixed(3),
    );
  }
  return merged;
}

async function collectTarget(
  target: CollectTarget,
  context: {
    profile: SourceProfile;
    config: RuntimeConfig;
    limiter: RateLimiter;
    robotsOk: (url: string) => boolean;
  },
): Promise<{ result: TargetResult; items: CollectedItem[] }> {
  const { profile, config, limiter, robotsOk } = context;
  const startedAt = Date.now();
  const pages = Math.min(target.pages ?? config.defaultPages, config.maxPages);
  const collected: CollectedItem[] = [];
  const diagnosticsList: ParseDiagnostics[] = [];
  let pagesFetched = 0;

  for (let page = 1; page <= pages; page += 1) {
    const request = buildSearchRequest(
      profile,
      {
        keyword: target.kind === "keyword" ? target.query : "",
        category: target.kind === "category" ? target.query : undefined,
        page,
        size: profile.search.pageSize,
      },
      config.userAgent,
    );

    if (!robotsOk(request.url)) {
      throw new Error(`robots.txt disallows ${request.url} for ${config.userAgent}`);
    }

    await limiter.acquire();
    const response = await fetchWithRetry(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      timeoutMs: config.timeoutMs,
      retries: config.retries,
    });
    pagesFetched += 1;

    const payload = profile.search.mode === "html-embedded" ? response.text : (response.json ?? response.text);
    const parsed = parseSearchPayload(payload, { profile, page, keyword: target.query });
    diagnosticsList.push(parsed.diagnostics);
    collected.push(...parsed.items);

    // Empty page ⇒ end of results (or a break); either way stop paging.
    if (parsed.items.length === 0) break;
  }

  const items = mergeByBestRank(collected);
  return {
    result: {
      targetId: target.id,
      kind: target.kind,
      query: target.query,
      pagesFetched,
      itemCount: items.length,
      ok: true,
      diagnostics: mergeDiagnostics(diagnosticsList),
      durationMs: Date.now() - startedAt,
    },
    items,
  };
}

export async function runCollection(options: CollectOptions = {}): Promise<CollectionRun> {
  const config = options.config ?? getRuntimeConfig();
  const profile = options.profile ?? loadProfile();
  const source = profile.source as SourceId;
  const dryRun = options.dryRun ?? false;

  if (profile.status !== "verified" && !config.allowUnverifiedProfile) {
    throw new Error(
      "pricepulse: profile status is 'unverified'. Run `npm run pricepulse:probe` against the live site, " +
        "confirm the generated profile, set status to 'verified' — or set PRICEPULSE_ALLOW_UNVERIFIED_PROFILE=1 " +
        "for an explicitly experimental run.",
    );
  }

  const allTargets = options.targets ?? (await listCollectionTargets(config));
  const targets = options.only?.length
    ? allTargets.filter((target) => options.only?.includes(target.id))
    : allTargets;

  const runId = randomUUID();
  const startedAt = options.now ?? new Date();
  const observedOn = kstDay(startedAt);
  const limiter = new RateLimiter(config.minGapMs);
  const store = options.store ?? (dryRun ? null : await createStore(config));
  const alerts: string[] = [];

  let robotsOk: (url: string) => boolean = () => true;
  if (config.respectRobots) {
    const origin = new URL(profile.search.endpoint.url).origin;
    const rules = await loadRobots(origin, config.userAgent);
    if (rules.crawlDelaySec && rules.crawlDelaySec * 1000 > config.minGapMs) {
      // Honour a stated crawl-delay even when our own gap is shorter.
      config.minGapMs = rules.crawlDelaySec * 1000;
    }
    robotsOk = (url: string) => robotsAllows(rules, new URL(url).pathname);
  }

  const results: TargetResult[] = [];
  let storedTotal = 0;

  for (const target of targets) {
    try {
      const { result, items } = await collectTarget(target, { profile, config, limiter, robotsOk });

      const previousFingerprint = store ? await store.getLastFingerprint(target.id) : null;
      const health = evaluateHealth(result.diagnostics!, { previousFingerprint });

      if (!health.ok || health.severity === "warn") {
        const message = `${target.id}: ${health.reasons.join("; ")}`;
        alerts.push(message);
        await sendAlert({
          severity: health.severity === "critical" ? "critical" : "warn",
          key: `parse|${target.id}|${health.reasons[0] ?? ""}`,
          title: `수집 이상 — ${target.label ?? target.query}`,
          detail: health.reasons.join("\n"),
          context: { runId, targetId: target.id, items: result.itemCount },
        });
      }

      if (store && health.ok) {
        result.storedCount = await store.saveObservations({
          runId,
          targetId: target.id,
          source,
          observedOn,
          items,
        });
        storedTotal += result.storedCount;
      }
      if (store) await store.saveHealth({ runId, targetId: target.id, diagnostics: result.diagnostics! });

      result.ok = health.ok;
      if (!health.ok) result.error = health.reasons.join("; ");
      results.push(result);
    } catch (error) {
      const message = (error as Error).message;
      alerts.push(`${target.id}: ${message}`);
      results.push({
        targetId: target.id,
        kind: target.kind,
        query: target.query,
        pagesFetched: 0,
        itemCount: 0,
        ok: false,
        error: message,
        diagnostics: null,
        durationMs: 0,
      });
      await sendAlert({
        severity: "critical",
        key: `fetch|${target.id}|${message.slice(0, 80)}`,
        title: `수집 실패 — ${target.label ?? target.query}`,
        detail: message,
        context: { runId, targetId: target.id },
      });
    }
  }

  const failed = results.filter((result) => !result.ok);
  const run: CollectionRun = {
    runId,
    source,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    ok: failed.length === 0 && results.length > 0,
    dryRun,
    targets: results,
    totals: {
      targets: results.length,
      okTargets: results.length - failed.length,
      failedTargets: failed.length,
      items: results.reduce((sum, result) => sum + result.itemCount, 0),
      stored: storedTotal,
    },
    alerts,
  };

  if (store) await store.saveRun(run);

  // Whole-run failure is its own page: partial outages hide inside per-target noise.
  if (results.length > 0 && failed.length === results.length) {
    await sendAlert({
      severity: "critical",
      key: "run|total-failure",
      title: "수집 전체 실패",
      detail: `${failed.length}개 타깃 전부 실패했습니다. 프로필/엔드포인트를 확인하세요.`,
      context: { runId },
    });
  }

  return run;
}
