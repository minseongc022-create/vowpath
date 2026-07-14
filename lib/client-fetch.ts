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

/** Redirect to login when session cookie is stale (401). */
export function redirectToLoginIfUnauthorized(res: Response): boolean {
  if (typeof window === "undefined" || res.status !== 401) return false;
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  return true;
}

export function sessionExpiredMessage(isEnglish = true): string {
  return isEnglish
    ? "Your session expired. Redirecting to sign in…"
    : "세션이 만료되었습니다. 로그인 페이지로 이동합니다…";
}
