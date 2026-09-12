import "server-only";

import { decryptSecret, encryptSecret, isEncryptionConfigured } from "../crypto";
import { prisma } from "../db";
import { getInstallation, getInstallationToken } from "./app";
import { getViewer } from "./client";

/**
 * 쓰기 연결 — 자동 수정 PR을 올리기 위한 별도 연결.
 *
 * ★ 왜 기본 연결과 분리했는가
 *
 * GitHub App의 권한은 설치 화면에 그대로 뜬다. 기본 App에 쓰기 권한을 넣으면
 * **자동 수정을 쓸 생각이 없는 사람에게도** "이 앱이 당신의 코드를 수정할 수
 * 있습니다"가 보인다. 그 한 줄이 설치 전환율을 반토막 낸다.
 *
 * 그래서 쓰기는 두 번째 App으로 뺐다. 기본 사용자에게 우리는 끝까지
 * "읽기만 하는 도구"이고, 원하는 사람만 문을 하나 더 연다.
 *
 * 필요한 권한: contents: write + pull_requests: write
 * (`main` 보호는 GitHub 쪽 브랜치 보호 규칙에 맡긴다 — 우리는 애초에
 *  기본 브랜치에 직접 쓰지 않는다.)
 */

export function getFixAppConfig(): { appId: string; slug: string; privateKeyPem: string } | null {
  const appId = process.env.VIBESAFE_GITHUB_FIX_APP_ID?.trim();
  const slug = process.env.NEXT_PUBLIC_VIBESAFE_GITHUB_FIX_APP_SLUG?.trim();
  const rawKey = process.env.VIBESAFE_GITHUB_FIX_APP_PRIVATE_KEY?.trim();
  if (!appId || !slug || !rawKey) return null;
  return {
    appId,
    slug,
    privateKeyPem: rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey,
  };
}

export function isFixAppConfigured(): boolean {
  return getFixAppConfig() !== null;
}

export function fixInstallUrl(state: string): string | null {
  const config = getFixAppConfig();
  if (!config) return null;
  return `https://github.com/apps/${config.slug}/installations/new?state=${encodeURIComponent(state)}`;
}

export type WriteConnection = { login: string; authKind: string; connectedAt: Date };

export async function getWriteConnection(userId: string): Promise<WriteConnection | null> {
  const row = await prisma.vibesafeIntegration.findUnique({
    where: {
      userId_provider_accessLevel: { userId, provider: "github", accessLevel: "write" },
    },
    select: { externalLogin: true, authKind: true, createdAt: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;
  return { login: row.externalLogin, authKind: row.authKind, connectedAt: row.createdAt };
}

/** 쓰기용 토큰. 이 함수 밖으로 토큰이 나가지 않게 호출부는 즉시 쓰고 버린다. */
export async function resolveWriteToken(userId: string): Promise<string> {
  const row = await prisma.vibesafeIntegration.findUnique({
    where: {
      userId_provider_accessLevel: { userId, provider: "github", accessLevel: "write" },
    },
  });
  if (!row || row.revokedAt) throw new Error("GITHUB_WRITE_NOT_CONNECTED");

  if (row.authKind === "app_installation") {
    if (!row.installationId) throw new Error("GITHUB_WRITE_NOT_CONNECTED");
    return getInstallationToken(row.installationId);
  }
  if (!row.accessTokenCipher) throw new Error("GITHUB_WRITE_NOT_CONNECTED");
  return decryptSecret(row.accessTokenCipher);
}

export async function connectWriteWithInstallation(
  userId: string,
  installationId: string,
): Promise<WriteConnection> {
  const installation = await getInstallation(installationId);
  if (!installation) throw new Error("GITHUB_INSTALLATION_NOT_FOUND");
  const login = installation.account?.login ?? "unknown";

  const row = await prisma.vibesafeIntegration.upsert({
    where: {
      userId_provider_accessLevel: { userId, provider: "github", accessLevel: "write" },
    },
    create: {
      userId,
      provider: "github",
      accessLevel: "write",
      authKind: "app_installation",
      externalId: String(installation.account?.id ?? installation.id),
      externalLogin: login,
      installationId,
      scopes: "contents:write,pull_requests:write",
      revokedAt: null,
    },
    update: {
      authKind: "app_installation",
      externalLogin: login,
      installationId,
      accessTokenCipher: null,
      revokedAt: null,
    },
    select: { createdAt: true },
  });
  return { login, authKind: "app_installation", connectedAt: row.createdAt };
}

/** PAT로도 쓰기 연결을 만들 수 있게 둔다 — App을 설정하지 않은 배포를 위해. */
export async function connectWriteWithPat(userId: string, token: string): Promise<WriteConnection> {
  if (!isEncryptionConfigured()) throw new Error("ENCRYPTION_NOT_CONFIGURED");
  const viewer = await getViewer(token);
  const row = await prisma.vibesafeIntegration.upsert({
    where: {
      userId_provider_accessLevel: { userId, provider: "github", accessLevel: "write" },
    },
    create: {
      userId,
      provider: "github",
      accessLevel: "write",
      authKind: "pat",
      externalId: String(viewer.id),
      externalLogin: viewer.login,
      accessTokenCipher: encryptSecret(token),
      scopes: "pat:write",
      revokedAt: null,
    },
    update: {
      authKind: "pat",
      externalLogin: viewer.login,
      accessTokenCipher: encryptSecret(token),
      installationId: null,
      revokedAt: null,
    },
    select: { createdAt: true },
  });
  return { login: viewer.login, authKind: "pat", connectedAt: row.createdAt };
}

export async function disconnectWrite(userId: string): Promise<void> {
  await prisma.vibesafeIntegration.updateMany({
    where: { userId, provider: "github", accessLevel: "write" },
    data: { revokedAt: new Date(), accessTokenCipher: null, installationId: null },
  });
}
