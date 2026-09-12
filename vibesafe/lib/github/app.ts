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

const GITHUB_API = "https://api.github.com";

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
  return `https://github.com/apps/${config.slug}/installations/new?state=${encodeURIComponent(state)}`;
}
