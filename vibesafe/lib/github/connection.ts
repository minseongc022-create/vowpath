import "server-only";

import { decryptSecret, encryptSecret, isEncryptionConfigured } from "../crypto";
import { prisma } from "../db";
import { getInstallation, getInstallationToken, isGithubAppConfigured } from "./app";
import { getViewer, listInstallationRepos, listUserRepos, type GithubRepo } from "./client";

/**
 * ★ 읽기 연결과 쓰기 연결은 따로다
 *
 * 자동 수정(PR 생성)에는 저장소 쓰기 권한이 필요한데, 그걸 기본 GitHub App에
 * 넣으면 **자동 수정을 안 쓰는 사람에게도** 설치 화면에서 "이 앱이 코드를
 * 수정할 수 있습니다"라고 뜬다. 그 한 줄 때문에 대부분은 설치를 그만둔다.
 *
 * 그래서 쓰기는 별도 App(`VIBESAFE_GITHUB_FIX_APP_*`)으로 빼고, 원하는 사람만
 * 추가로 설치한다. 이 파일의 기본 함수들은 전부 읽기 연결(accessLevel="read")을
 * 가리키고, 쓰기 연결은 github/write-connection.ts가 따로 다룬다.
 */

export type GithubConnection = {
  id: string;
  authKind: "pat" | "app_installation";
  login: string;
  connectedAt: Date;
};

/**
 * 저장소를 읽을 때 쓸 토큰을 꺼낸다.
 *
 * 호출부는 토큰이 PAT인지 설치 토큰인지 알 필요가 없다 — 알면 분기가 여기저기
 * 퍼지고, 언젠가 한 곳에서 PAT를 로그에 찍게 된다. 이 함수 하나만 토큰을
 * 만지고, 반환값은 그 요청 동안만 쓰고 버린다.
 */
export async function resolveAccessToken(userId: string): Promise<string> {
  const integration = await prisma.vibesafeIntegration.findUnique({
    where: { userId_provider_accessLevel: { userId, provider: "github", accessLevel: "read" } },
  });
  if (!integration || integration.revokedAt) throw new Error("GITHUB_NOT_CONNECTED");

  if (integration.authKind === "app_installation") {
    if (!integration.installationId) throw new Error("GITHUB_NOT_CONNECTED");
    return getInstallationToken(integration.installationId);
  }
  if (!integration.accessTokenCipher) throw new Error("GITHUB_NOT_CONNECTED");
  return decryptSecret(integration.accessTokenCipher);
}

export async function getConnection(userId: string): Promise<GithubConnection | null> {
  const row = await prisma.vibesafeIntegration.findUnique({
    where: { userId_provider_accessLevel: { userId, provider: "github", accessLevel: "read" } },
    select: { id: true, authKind: true, externalLogin: true, createdAt: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;
  return {
    id: row.id,
    authKind: row.authKind === "app_installation" ? "app_installation" : "pat",
    login: row.externalLogin,
    connectedAt: row.createdAt,
  };
}

/** 연결한 계정이 접근할 수 있는 저장소 목록. */
export async function listConnectedRepos(userId: string): Promise<GithubRepo[]> {
  const integration = await prisma.vibesafeIntegration.findUnique({
    where: { userId_provider_accessLevel: { userId, provider: "github", accessLevel: "read" } },
    select: { authKind: true },
  });
  if (!integration) throw new Error("GITHUB_NOT_CONNECTED");
  const token = await resolveAccessToken(userId);
  return integration.authKind === "app_installation"
    ? listInstallationRepos(token)
    : listUserRepos(token);
}

export class EncryptionRequiredError extends Error {
  constructor() {
    super(
      "서버에 암호화 키(VIBESAFE_ENCRYPTION_KEY)가 설정되지 않아 GitHub 토큰을 안전하게 보관할 수 없습니다.",
    );
    this.name = "EncryptionRequiredError";
  }
}

/**
 * 개인 액세스 토큰(PAT)으로 연결.
 *
 * fine-grained PAT의 `Contents: Read-only` + `Metadata: Read-only`만 있으면
 * 충분하다고 화면에서 안내한다. classic 토큰도 동작하지만 권한이 넓어서
 * 권하지 않는다.
 */
export async function connectWithPat(userId: string, token: string): Promise<GithubConnection> {
  if (!isEncryptionConfigured()) throw new EncryptionRequiredError();

  const viewer = await getViewer(token);
  const cipher = encryptSecret(token);
  const row = await prisma.vibesafeIntegration.upsert({
    where: { userId_provider_accessLevel: { userId, provider: "github", accessLevel: "read" } },
    create: {
      userId,
      provider: "github",
      accessLevel: "read",
      authKind: "pat",
      externalId: String(viewer.id),
      externalLogin: viewer.login,
      accessTokenCipher: cipher,
      installationId: null,
      scopes: "pat",
      revokedAt: null,
    },
    update: {
      authKind: "pat",
      externalId: String(viewer.id),
      externalLogin: viewer.login,
      accessTokenCipher: cipher,
      installationId: null,
      scopes: "pat",
      revokedAt: null,
    },
    select: { id: true, createdAt: true },
  });
  return { id: row.id, authKind: "pat", login: viewer.login, connectedAt: row.createdAt };
}

/** GitHub App 설치로 연결. 장기 토큰을 저장하지 않으므로 암호화 키가 없어도 된다. */
export async function connectWithInstallation(
  userId: string,
  installationId: string,
): Promise<GithubConnection> {
  if (!isGithubAppConfigured()) throw new Error("GITHUB_APP_NOT_CONFIGURED");

  const installation = await getInstallation(installationId);
  if (!installation) throw new Error("GITHUB_INSTALLATION_NOT_FOUND");

  const login = installation.account?.login ?? "unknown";
  const row = await prisma.vibesafeIntegration.upsert({
    where: { userId_provider_accessLevel: { userId, provider: "github", accessLevel: "read" } },
    create: {
      userId,
      provider: "github",
      accessLevel: "read",
      authKind: "app_installation",
      externalId: String(installation.account?.id ?? installation.id),
      externalLogin: login,
      accessTokenCipher: null,
      installationId,
      scopes: "contents:read,metadata:read",
      revokedAt: null,
    },
    update: {
      authKind: "app_installation",
      externalId: String(installation.account?.id ?? installation.id),
      externalLogin: login,
      accessTokenCipher: null,
      installationId,
      scopes: "contents:read,metadata:read",
      revokedAt: null,
    },
    select: { id: true, createdAt: true },
  });
  return { id: row.id, authKind: "app_installation", login, connectedAt: row.createdAt };
}

export async function disconnect(userId: string): Promise<void> {
  await prisma.vibesafeIntegration.updateMany({
    where: { userId, provider: "github", accessLevel: "read" },
    // 토큰을 지우는 게 핵심이다. 행만 남겨 "언제 연결했었는지"는 보존한다.
    data: { revokedAt: new Date(), accessTokenCipher: null, installationId: null },
  });
}
