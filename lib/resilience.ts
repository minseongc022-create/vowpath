/**
 * Generic resilience helpers — retry with backoff, per-key circuit breaker, and
 * fallback execution. Circuit breaker state is in-memory (Map), so it only holds
 * within a single warm Vercel serverless instance, not across instances.
 */

export type RetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries fn() on failure with exponential backoff. Throws the last error once attempts are exhausted. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delayMs = options?.delayMs ?? 1000;
  const backoff = options?.backoff ?? 2;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      options?.onRetry?.(attempt, e);
      if (attempt < maxAttempts) {
        await sleep(delayMs * Math.pow(backoff, attempt - 1));
      }
    }
  }
  throw lastError;
}

export class CircuitOpenError extends Error {
  constructor(key: string) {
    super(`Circuit breaker open for "${key}"`);
    this.name = "CircuitOpenError";
  }
}

type BreakerState = { consecutiveFailures: number; openedAt: number | null };

const CONSECUTIVE_FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 30 * 60 * 1000;

const breakers = new Map<string, BreakerState>();

function getBreaker(key: string): BreakerState {
  let state = breakers.get(key);
  if (!state) {
    state = { consecutiveFailures: 0, openedAt: null };
    breakers.set(key, state);
  }
  return state;
}

export function getCircuitBreakerState(key: string): {
  open: boolean;
  consecutiveFailures: number;
  reopensAt: string | null;
} {
  const state = breakers.get(key);
  if (!state) return { open: false, consecutiveFailures: 0, reopensAt: null };
  const open = state.openedAt !== null && Date.now() - state.openedAt < OPEN_DURATION_MS;
  return {
    open,
    consecutiveFailures: state.consecutiveFailures,
    reopensAt: state.openedAt ? new Date(state.openedAt + OPEN_DURATION_MS).toISOString() : null,
  };
}

/**
 * Blocks calls to fn() for OPEN_DURATION_MS once `key` has failed
 * CONSECUTIVE_FAILURE_THRESHOLD times in a row (fails fast with CircuitOpenError
 * instead of hammering a downed service). Auto-resumes after the cooldown.
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  key: string,
  options?: { onOpen?: (key: string, consecutiveFailures: number) => void | Promise<void> },
): Promise<T> {
  const state = getBreaker(key);

  if (state.openedAt !== null) {
    if (Date.now() - state.openedAt < OPEN_DURATION_MS) {
      throw new CircuitOpenError(key);
    }
    // Cooldown elapsed — allow one trial call through.
    state.openedAt = null;
    state.consecutiveFailures = 0;
  }

  try {
    const result = await fn();
    state.consecutiveFailures = 0;
    return result;
  } catch (e) {
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD && state.openedAt === null) {
      state.openedAt = Date.now();
      // Awaited (not fire-and-forget) — Vercel serverless doesn't guarantee background
      // work survives after the enclosing request handler returns.
      if (options?.onOpen) {
        try {
          await options.onOpen(key, state.consecutiveFailures);
        } catch {
          /* never let an alerting failure mask the real error below */
        }
      }
    }
    throw e;
  }
}

/** Runs fn(); on any failure, runs fallbackFn() instead (result or thrown error propagates from fallback). */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallbackFn: (error: unknown) => Promise<T> | T,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    return await fallbackFn(e);
  }
}
