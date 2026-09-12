import "server-only";

import { encryptSecret, isEncryptionConfigured } from "./crypto";
import { prisma } from "./db";
import { guessPlatform, validateServiceUrl } from "./url-safety";

/**
 * 프로젝트 접근은 **반드시** 이 파일을 거친다.
 *
 * projectId만으로 조회하는 쿼리를 라우트에 직접 쓰면, 남의 projectId를 넣는
 * 순간 그대로 뚫린다. 여기 있는 함수는 전부 userId를 함께 받고, 소유자가
 * 아니면 "없음"을 돌려준다(존재 여부조차 알려주지 않는다).
 */

export type ProjectSummary = {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  repository: { owner: string; repo: string; defaultBranch: string; lastAnalyzedSha: string | null } | null;
  productionUrl: string | null;
};

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const rows = await prisma.vibesafeProject.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      repository: true,
      deploymentTargets: { where: { kind: "production" }, take: 1 },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt,
    repository: row.repository
      ? {
          owner: row.repository.owner,
          repo: row.repository.repo,
          defaultBranch: row.repository.defaultBranch,
          lastAnalyzedSha: row.repository.lastAnalyzedSha,
        }
      : null,
    productionUrl: row.deploymentTargets[0]?.baseUrl ?? null,
  }));
}

/** 소유자 확인이 포함된 단건 조회. 남의 것이면 null. */
export async function getOwnedProject(userId: string, projectId: string) {
  return prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId, archivedAt: null },
    include: {
      repository: true,
      deploymentTargets: true,
      credential: true,
    },
  });
}

/** 소유권만 싸게 확인 — 무거운 include 없이. */
export async function assertProjectOwner(userId: string, projectId: string): Promise<boolean> {
  const row = await prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId, archivedAt: null },
    select: { id: true },
  });
  return row !== null;
}

export type CreateProjectInput = {
  userId: string;
  name: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  repoExternalId: string | null;
  isPrivate: boolean;
  productionUrl: string;
};

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

const REPO_SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "프로젝트 이름을 입력해주세요." };
  if (name.length > 80) return { ok: false, error: "프로젝트 이름이 너무 깁니다." };

  if (!REPO_SEGMENT.test(input.owner) || !REPO_SEGMENT.test(input.repo)) {
    return { ok: false, error: "저장소 정보를 확인해주세요." };
  }

  const urlCheck = validateServiceUrl(input.productionUrl);
  if (!urlCheck.ok) return { ok: false, error: urlCheck.error };

  const project = await prisma.vibesafeProject.create({
    data: {
      userId: input.userId,
      name,
      status: "setup",
      repository: {
        create: {
          provider: "github",
          owner: input.owner,
          repo: input.repo,
          repoExternalId: input.repoExternalId,
          defaultBranch: input.defaultBranch || "main",
          isPrivate: input.isPrivate,
        },
      },
      deploymentTargets: {
        create: {
          kind: "production",
          platform: guessPlatform(urlCheck.url),
          baseUrl: urlCheck.url,
        },
      },
    },
    select: { id: true },
  });
  return { ok: true, projectId: project.id };
}

export async function updateProductionUrl(
  userId: string,
  projectId: string,
  url: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await assertProjectOwner(userId, projectId))) {
    return { ok: false, error: "프로젝트를 찾을 수 없습니다." };
  }
  const check = validateServiceUrl(url);
  if (!check.ok) return { ok: false, error: check.error };

  await prisma.vibesafeDeploymentTarget.upsert({
    where: { projectId_kind: { projectId, kind: "production" } },
    create: {
      projectId,
      kind: "production",
      platform: guessPlatform(check.url),
      baseUrl: check.url,
    },
    update: { baseUrl: check.url, platform: guessPlatform(check.url), verifiedAt: null },
  });
  return { ok: true, url: check.url };
}

/**
 * 로그인 흐름 검사용 테스트 계정.
 *
 * 화면에서 "실제로 쓰는 계정 말고 테스트 전용 계정"이라고 분명히 안내한다.
 * 값은 즉시 암호화하고, 읽기는 워커에게 흐름을 넘길 때 한 번뿐이다.
 */
export async function saveTestCredential(
  userId: string,
  projectId: string,
  username: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await assertProjectOwner(userId, projectId))) {
    return { ok: false, error: "프로젝트를 찾을 수 없습니다." };
  }
  if (!isEncryptionConfigured()) {
    return {
      ok: false,
      error: "서버에 암호화 키가 설정되지 않아 테스트 계정을 저장할 수 없습니다.",
    };
  }
  if (!username.trim() || !password) {
    return { ok: false, error: "아이디와 비밀번호를 모두 입력해주세요." };
  }
  await prisma.vibesafeTestCredential.upsert({
    where: { projectId },
    create: {
      projectId,
      usernameCipher: encryptSecret(username.trim()),
      passwordCipher: encryptSecret(password),
    },
    update: {
      usernameCipher: encryptSecret(username.trim()),
      passwordCipher: encryptSecret(password),
    },
  });
  return { ok: true };
}

export async function deleteTestCredential(userId: string, projectId: string): Promise<boolean> {
  if (!(await assertProjectOwner(userId, projectId))) return false;
  await prisma.vibesafeTestCredential.deleteMany({ where: { projectId } });
  return true;
}

export async function archiveProject(userId: string, projectId: string): Promise<boolean> {
  const result = await prisma.vibesafeProject.updateMany({
    where: { id: projectId, userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  return result.count > 0;
}
