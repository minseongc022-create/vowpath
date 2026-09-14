import "server-only";

import { createPrivateKey } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";

/**
 * GitHub App 인증.
 *
 * ★ 왜 OAuth App이 아니라 GitHub App인가
 *
 * OAuth App에는 "저장소 읽기 전용" 권한이 없다. private 저장소를 읽으려면
 * `repo` 스코프를 받아야 하는데 그건 **쓰기 권한까지 포함**이다. 남의 앱
 * 저장소를 검사해주겠다면서 그 저장소에 커밋할 수 있는 토큰을 들고 있는 건
 * 말이 안 된다.
 *
 * GitHub App은 `contents: read` + `metadata: read`만 요청할 수 있고,
 * 사용자가 설치할 때 **저장소를 골라서** 허용한다. 게다가 우리가 보관하는 건
 * 설치 id뿐이고 실제 토큰은 1시간짜리를 매번 새로 받는다 — DB가 새도 남의
 * 저장소에 접근할 수 있는 값이 들어있지 않다.
 */

// 테스트에서 가짜 GitHub 서버를 가리키는 용도(AI 제공자·토스와 같은 패턴).
// 운영에서는 절대 설정하지 않는다.
const GITHUB_API = process.env.VIBESAFE_GITHUB_API_BASE_URL?.trim() || "https://api.github.com";
const GITHUB_OAUTH_HOST = process.env.VIBESAFE_GITHUB_OAUTH_BASE_URL?.trim() || "https://github.com";

export type GithubAppConfig = {
  appId: string;
  privateKeyPem: string;
  slug: string;
  webhookSecret: string | null;
};

export function getGithubAppConfig(): GithubAppConfig | null {
  const appId = process.env.VIBESAFE_GITHUB_APP_ID?.trim();
  const slug = process.env.NEXT_PUBLIC_VIBESAFE_GITHUB_APP_SLUG?.trim();
  // 줄바꿈은 환경변수에 그대로 못 넣는 경우가 많아 `\n` 이스케이프도 받는다.
  const rawKey = process.env.VIBESAFE_GITHUB_APP_PRIVATE_KEY?.trim();
  if (!appId || !slug || !rawKey) return null;
  return {
    appId,
    slug,
    privateKeyPem: rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey,
    webhookSecret: process.env.VIBESAFE_GITHUB_WEBHOOK_SECRET?.trim() || null,
  };
}

export function isGithubAppConfigured(): boolean {
  return getGithubAppConfig() !== null;
}

/**
 * "GitHub로 계속하기"(비밀번호 없이 가입)에 필요한 값.
 *
 * ★ App 설정과 별개로 켜고 끌 수 있다
 *
 * client_id/secret은 GitHub App 설정 화면에 이미 있는 값이지만, 이걸
 * 넣는다고 자동으로 켜지지 않는다 — App 쪽에서도 "Request user
 * authorization (OAuth) during installation"을 켜야 콜백에 `code`가
 * 실린다. 둘 다 안 됐으면 설치는 여전히 되지만 신원 확인만 못 하므로,
 * 이 함수가 false를 주면 화면은 "GitHub로 계속하기" 버튼 자체를 숨기고
 * 기존 이메일 가입만 보여준다.
 */
export function getGithubOAuthConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.VIBESAFE_GITHUB_APP_CLIENT_ID?.trim();
  const clientSecret = process.env.VIBESAFE_GITHUB_APP_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isGithubOAuthConfigured(): boolean {
  return isGithubAppConfigured() && getGithubOAuthConfig() !== null;
}

/**
 * 설치 콜백에 실린 1회용 code를 이 사람 명의의 사용자 토큰으로 바꾼다.
 * 이 토큰은 신원 확인(getViewer, getViewerEmail)에만 쓰고 버린다 —
 * 저장소 접근은 여전히 installation 토큰만 쓴다.
 */
export async function exchangeOAuthCode(code: string): Promise<string> {
  const config = getGithubOAuthConfig();
  if (!config) throw new Error("GITHUB_OAUTH_NOT_CONFIGURED");

  const res = await fetch(`${GITHUB_OAUTH_HOST}/login/oauth/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GITHUB_OAUTH_EXCHANGE_FAILED_${res.status}`);
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`GITHUB_OAUTH_EXCHANGE_FAILED_${data.error ?? "unknown"}`);
  return data.access_token;
}

/**
 * App 자신을 증명하는 10분짜리 JWT.
 *
 * GitHub이 내려주는 키는 보통 PKCS#1(`BEGIN RSA PRIVATE KEY`)인데 jose는
 * PKCS#8만 읽는다. Node의 createPrivateKey로 한 번 통과시켜 형식을 맞춘다 —
 * 이걸 빼먹으면 "invalid key" 한 줄만 보고 한참 헤맨다.
 */
async function createAppJwt(config: GithubAppConfig): Promise<string> {
  const pkcs8 = createPrivateKey(config.privateKeyPem)
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  const key = await importPKCS8(pkcs8, "RS256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    // GitHub은 서버 시계가 약간 앞서 있으면 거절한다 — 60초 뒤로 민다.
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(config.appId)
    .sign(key);
}

type CachedToken = { token: string; expiresAt: number };
const installationTokenCache = new Map<string, CachedToken>();

/**
 * 설치 액세스 토큰(1시간). 같은 설치에 대해 매번 새로 받으면 요청 수가
 * 낭비되므로 만료 2분 전까지 재사용한다.
 */
export async function getInstallationToken(installationId: string): Promise<string> {
  const cached = installationTokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now() + 120_000) return cached.token;

  const config = getGithubAppConfig();
  if (!config) throw new Error("GITHUB_APP_NOT_CONFIGURED");

  const jwt = await createAppJwt(config);
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // 응답 본문에 토큰이 들어있을 일은 없지만, 그래도 상태 코드만 남긴다.
    throw new Error(`GITHUB_INSTALLATION_TOKEN_FAILED_${res.status}`);
  }
  const data = (await res.json()) as { token: string; expires_at: string };
  installationTokenCache.set(installationId, {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  });
  return data.token;
}

/** 설치 자체가 살아있는지 + 어느 계정에 설치됐는지. */
export async function getInstallation(installationId: string): Promise<{
  id: number;
  account: { login: string; id: number } | null;
} | null> {
  const config = getGithubAppConfig();
  if (!config) return null;
  const jwt = await createAppJwt(config);
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    id: number;
    account?: { login?: string; id?: number } | null;
  };
  return {
    id: data.id,
    account: data.account?.login ? { login: data.account.login, id: data.account.id ?? 0 } : null,
  };
}

/** 사용자가 앱을 설치하러 가는 주소. */
export function installUrl(state: string): string | null {
  const config = getGithubAppConfig();
  if (!config) return null;
  return `${GITHUB_OAUTH_HOST}/apps/${config.slug}/installations/new?state=${encodeURIComponent(state)}`;
}
