/**
 * Polite HTTP. Slow, identifiable, retry-with-backoff, robots-aware.
 * A collector that hammers a host gets blocked, and a blocked collector loses
 * days of history it can never collect retroactively.
 */

export class HttpError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.retryable = retryable;
  }
}

export type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  /** Base backoff; doubles per attempt with ±25% jitter. */
  backoffMs?: number;
  signal?: AbortSignal;
};

export type FetchResult = {
  status: number;
  headers: Record<string, string>;
  text: string;
  json: unknown;
  durationMs: number;
  attempts: number;
  url: string;
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Header values must be latin-1. A Korean contact string or a stray em dash in
 * PRICEPULSE_USER_AGENT would otherwise throw inside fetch and look like a
 * network outage. Drop what cannot be sent rather than fail the collection.
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = value.replace(/[^\x00-\xFF]/g, "");
  }
  return out;
}

function jitter(ms: number): number {
  return Math.round(ms * (0.75 + Math.random() * 0.5));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Serializes requests to one host with a minimum gap between them. */
export class RateLimiter {
  private readonly minGapMs: number;
  private chain: Promise<void> = Promise.resolve();
  private lastAt = 0;

  constructor(minGapMs: number) {
    this.minGapMs = minGapMs;
  }

  acquire(): Promise<void> {
    const next = this.chain.then(async () => {
      const wait = this.lastAt + this.minGapMs - Date.now();
      if (wait > 0) await sleep(jitter(wait));
      this.lastAt = Date.now();
    });
    this.chain = next.catch(() => undefined);
    return next;
  }
}

export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const {
    method = "GET",
    headers = {},
    body,
    timeoutMs = 15_000,
    retries = 3,
    backoffMs = 1_000,
    signal,
  } = options;

  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const response = await fetch(url, {
        method,
        headers: sanitizeHeaders(headers),
        body,
        signal: composed,
        redirect: "follow",
      });
      const text = await response.text();

      if (!response.ok) {
        const retryable = RETRYABLE_STATUS.has(response.status);
        if (retryable && attempt <= retries) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const wait = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : jitter(backoffMs * 2 ** (attempt - 1));
          await sleep(wait);
          continue;
        }
        throw new HttpError(
          `${method} ${url} → ${response.status} ${response.statusText}: ${text.slice(0, 200)}`,
          response.status,
          retryable,
        );
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        text,
        json,
        durationMs: Date.now() - startedAt,
        attempts: attempt,
        url: response.url || url,
      };
    } catch (error) {
      lastError = error;
      const isHttp = error instanceof HttpError;
      if (isHttp && !error.retryable) throw error;
      if (attempt > retries) break;
      await sleep(jitter(backoffMs * 2 ** (attempt - 1)));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new HttpError(`${method} ${url} failed`, 0, true);
}

// ─── robots.txt ──────────────────────────────────────────────────────────────

export type RobotsRules = { allow: string[]; disallow: string[]; crawlDelaySec: number | null };

/** Minimal robots parser: exact UA group if present, else the `*` group. */
export function parseRobots(text: string, userAgent: string): RobotsRules {
  const ua = userAgent.toLowerCase();
  const groups = new Map<string, RobotsRules>();
  let active: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      const agent = value.toLowerCase();
      if (!groups.has(agent)) groups.set(agent, { allow: [], disallow: [], crawlDelaySec: null });
      active = [agent];
      continue;
    }
    for (const agent of active) {
      const rules = groups.get(agent);
      if (!rules) continue;
      if (key === "disallow" && value) rules.disallow.push(value);
      else if (key === "allow" && value) rules.allow.push(value);
      else if (key === "crawl-delay") {
        const delay = Number(value);
        if (Number.isFinite(delay)) rules.crawlDelaySec = delay;
      }
    }
  }

  const exact = [...groups.entries()].find(([agent]) => agent !== "*" && ua.includes(agent));
  return exact?.[1] ?? groups.get("*") ?? { allow: [], disallow: [], crawlDelaySec: null };
}

/** Longest matching rule wins; Allow beats Disallow at equal length. */
export function robotsAllows(rules: RobotsRules, path: string): boolean {
  const match = (patterns: string[]) =>
    patterns.reduce((best, pattern) => {
      const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
      return path.startsWith(prefix) && prefix.length > best ? prefix.length : best;
    }, -1);

  const allowLen = match(rules.allow);
  const disallowLen = match(rules.disallow);
  if (disallowLen < 0) return true;
  return allowLen >= disallowLen;
}

const robotsCache = new Map<string, RobotsRules>();

export async function loadRobots(origin: string, userAgent: string): Promise<RobotsRules> {
  const cacheKey = `${origin}|${userAgent}`;
  const cached = robotsCache.get(cacheKey);
  if (cached) return cached;
  try {
    const result = await fetchWithRetry(new URL("/robots.txt", origin).toString(), {
      headers: { "user-agent": userAgent },
      retries: 1,
      timeoutMs: 8_000,
    });
    const rules = parseRobots(result.text, userAgent);
    robotsCache.set(cacheKey, rules);
    return rules;
  } catch {
    // No robots.txt (or unreachable) ⇒ nothing is disallowed by it.
    const empty: RobotsRules = { allow: [], disallow: [], crawlDelaySec: null };
    robotsCache.set(cacheKey, empty);
    return empty;
  }
}
