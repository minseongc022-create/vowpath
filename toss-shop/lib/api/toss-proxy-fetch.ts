/**
 * 토스 API 전용 고정IP 프록시 fetch.
 *
 * 토스 공식 문서: "등록된 IP 주소만 API에 접근할 수 있습니다."
 * Vercel 서버리스는 기본적으로 고정 아웃바운드 IP가 없어서, 그대로 두면
 * 등록한 IP와 실제 호출 IP가 달라 언젠가 401/403으로 막힌다.
 *
 * QUOTAGUARD_STATIC_URL(또는 호환되는 QUOTAGUARDSTATIC_URL) 환경변수가 있으면
 * 그 프록시를 거쳐 고정 IP로 나가고, 없으면 평소처럼 직접 호출한다
 * (로컬 개발 등 고정 IP가 필요 없는 환경에서는 프록시 없이도 동작).
 */

let cachedDispatcher: unknown;
let dispatcherResolved = false;

function proxyUrl(): string | null {
  return (
    process.env.QUOTAGUARD_STATIC_URL?.trim() ||
    process.env.QUOTAGUARDSTATIC_URL?.trim() ||
    process.env.TOSS_API_PROXY_URL?.trim() ||
    null
  );
}

async function getDispatcher(): Promise<unknown> {
  if (dispatcherResolved) return cachedDispatcher;
  dispatcherResolved = true;
  const url = proxyUrl();
  if (!url) return undefined;
  try {
    const { ProxyAgent } = await import("undici");
    cachedDispatcher = new ProxyAgent(url);
  } catch {
    // 프록시 설정 실패 시 직접 호출로 폴백 — 토스가 IP를 막으면 명확한
    // 에러가 나므로 여기서 조용히 죽이는 것보다 원인 파악이 쉽다.
    cachedDispatcher = undefined;
  }
  return cachedDispatcher;
}

export function tossProxyConfigured(): boolean {
  return Boolean(proxyUrl());
}

/**
 * fetch와 동일하게 쓰되, 프록시가 설정되어 있으면 고정 IP로 내보낸다.
 * 토스 API(OAuth 토큰 발급 + FEP 호출) 전용 — 다른 외부 호출에는 쓰지 않는다.
 */
export async function tossFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const dispatcher = await getDispatcher();
  if (!dispatcher) return fetch(url, init);
  return fetch(url, { ...init, dispatcher } as RequestInit & { dispatcher: unknown });
}
