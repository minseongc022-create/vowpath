const DEFAULT_CLIENT_TIMEOUT_MS = 12_000;

/** Browser fetch with a hard timeout so UI never spins forever. */
export async function clientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_CLIENT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      credentials: "same-origin",
      ...init,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("REQUEST_TIMEOUT");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function clientFetchTimeoutMessage(fallback = "Request timed out.") {
  return fallback;
}
