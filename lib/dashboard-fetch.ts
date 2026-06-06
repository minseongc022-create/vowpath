const DEFAULT_TIMEOUT_MS = 14_000;

export async function dashboardFetch(
  input: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      credentials: "same-origin",
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

/** Returns null on timeout or network error — never blocks the dashboard batch. */
export async function safeDashboardFetch(
  input: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response | null> {
  try {
    return await dashboardFetch(input, timeoutMs);
  } catch {
    return null;
  }
}
