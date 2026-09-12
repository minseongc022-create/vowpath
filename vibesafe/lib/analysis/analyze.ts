import "server-only";

import { recordEvent } from "../analytics";
import { getAiProvider } from "../ai";
import { prisma } from "../db";
import { getHeadSha } from "../github/client";
import { resolveAccessToken } from "../github/connection";
import { consumeUsage, UsageLimitError } from "../usage";
import { collectRepoDigest, renderDigestForPrompt, type RepoDigest } from "./collect";
import { prepareFlows } from "./prepare-flows";
import { prepareUserRoles, resolveRoleKey } from "./prepare-roles";
import { ANALYSIS_SCHEMA, ANALYSIS_SYSTEM, type AnalysisResponse } from "./prompt";
import { scanForSecurityIssues } from "./security-scan";

export type AnalyzeOutcome = {
  appModelId: string;
  reused: boolean;
  flowCount: number;
  findingCount: number;
  commitSha: string;
};

export class AnalysisError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "AnalysisError";
  }
}

/**
 * 저장소를 분석해 AppModel과 핵심 흐름을 만든다.
 *
 * ★ 같은 내용이면 AI를 부르지 않는다
 *
 * 지문(fingerprint)이 같으면 이미 만든 AppModel을 그대로 쓴다. README 오타
 * 하나에 커밋 sha가 바뀌어도 우리가 보는 파일이 그대로면 다시 분석할 이유가
 * 없다. 이 캐시가 없으면 push마다 AI 비용이 나가 제품이 성립하지 않는다.
 */
export async function analyzeProject(params: {
  userId: string;
  projectId: string;
  force?: boolean;
}): Promise<AnalyzeOutcome> {
  const project = await prisma.vibesafeProject.findFirst({
    where: { id: params.projectId, userId: params.userId, archivedAt: null },
    include: { repository: true },
  });
  if (!project || !project.repository) {
    throw new AnalysisError("프로젝트를 찾을 수 없습니다.", "NOT_FOUND");
  }

  const repo = project.repository;
  let token: string;
  try {
    token = await resolveAccessToken(params.userId);
  } catch {
    throw new AnalysisError("GitHub이 연결되어 있지 않습니다.", "GITHUB_NOT_CONNECTED");
  }

  const headSha = await getHeadSha(token, repo.owner, repo.repo, repo.defaultBranch);
  if (!headSha) {
    throw new AnalysisError(
      `저장소의 ${repo.defaultBranch} 브랜치를 읽지 못했습니다. 브랜치 이름과 접근 권한을 확인해주세요.`,
      "BRANCH_NOT_FOUND",
    );
  }

  let digest: RepoDigest;
  try {
    digest = await collectRepoDigest({ token, owner: repo.owner, repo: repo.repo, commitSha: headSha });
  } catch (error) {
    throw new AnalysisError(
      "저장소 내용을 읽지 못했습니다. 접근 권한을 확인해주세요.",
      (error as Error).message,
    );
  }

  if (digest.files.length === 0) {
    throw new AnalysisError(
      "분석할 수 있는 파일을 찾지 못했습니다. Next.js 프로젝트가 맞는지 확인해주세요.",
      "EMPTY_DIGEST",
    );
  }

  const existing = await prisma.vibesafeAppModel.findUnique({
    where: { projectId_fingerprint: { projectId: project.id, fingerprint: digest.fingerprint } },
    select: { id: true },
  });

  if (existing && !params.force) {
    await prisma.vibesafeRepositoryConnection.update({
      where: { projectId: project.id },
      data: { lastAnalyzedSha: headSha },
    });
    const flowCount = await prisma.vibesafeCriticalFlow.count({ where: { projectId: project.id } });
    return { appModelId: existing.id, reused: true, flowCount, findingCount: 0, commitSha: headSha };
  }

  // AI를 부르기 직전에만 사용량을 깎는다 — 캐시로 끝나는 경우는 비용이 아니다.
  await consumeUsage(params.userId, "ai_analyses", 1);

  const provider = getAiProvider();
  const response = await provider.generateJson<AnalysisResponse>({
    system: ANALYSIS_SYSTEM,
    user: renderDigestForPrompt(digest),
    schema: ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "vibesafe_app_analysis",
    maxOutputTokens: 8000,
  });

  const flows = prepareFlows(response);
  const roles = prepareUserRoles(response);
  if (flows.length === 0) {
    throw new AnalysisError(
      "이 저장소에서 확인할 만한 핵심 흐름을 찾지 못했습니다. 흐름을 직접 추가할 수 있습니다.",
      "NO_FLOWS",
    );
  }

  const findings = scanForSecurityIssues(digest.files);

  const appModel = await prisma.$transaction(async (tx) => {
    const model = await tx.vibesafeAppModel.upsert({
      where: { projectId_fingerprint: { projectId: project.id, fingerprint: digest.fingerprint } },
      create: {
        projectId: project.id,
        fingerprint: digest.fingerprint,
        commitSha: headSha,
        appType: (response.appType ?? "웹 앱").slice(0, 60),
        summary: (response.summary ?? "").slice(0, 500),
        stack: response.stack ?? {},
        routes: digest.routes,
      },
      update: {
        commitSha: headSha,
        appType: (response.appType ?? "웹 앱").slice(0, 60),
        summary: (response.summary ?? "").slice(0, 500),
        stack: response.stack ?? {},
        routes: digest.routes,
      },
    });

    // USER 단계 — 흐름을 저장하기 전에 "누가 쓰는 앱인가"를 먼저 정한다.
    // 순서가 중요하다: 역할이 먼저 있어야 흐름을 역할에 붙일 수 있다.
    const roleIdByKey = new Map<string, string>();
    for (const role of roles) {
      const existing = await tx.vibesafeAppUserRole.findUnique({
        where: { projectId_key: { projectId: project.id, key: role.key } },
        select: { id: true, source: true },
      });
      // 사용자가 이름을 고쳐놨으면 재분석이 덮어쓰지 않는다 — 흐름과 같은 원칙.
      if (existing?.source === "user") {
        roleIdByKey.set(role.key, existing.id);
        continue;
      }
      const saved = await tx.vibesafeAppUserRole.upsert({
        where: { projectId_key: { projectId: project.id, key: role.key } },
        create: {
          projectId: project.id,
          appModelId: model.id,
          key: role.key,
          title: role.title,
          description: role.description,
          isPrimary: role.isPrimary,
          sortOrder: role.sortOrder,
          source: "ai",
        },
        update: {
          appModelId: model.id,
          title: role.title,
          description: role.description,
          isPrimary: role.isPrimary,
          sortOrder: role.sortOrder,
        },
        select: { id: true },
      });
      roleIdByKey.set(role.key, saved.id);
    }

    for (const [index, flow] of flows.entries()) {
      // ★ 사용자가 손댄 흐름(source=user)은 재분석이 덮어쓰지 않는다.
      //   확인해서 고쳐놓은 걸 AI가 되돌리면 다시 볼 이유가 없어진다.
      const current = await tx.vibesafeCriticalFlow.findUnique({
        where: { projectId_key: { projectId: project.id, key: flow.key } },
        select: { id: true, source: true, status: true },
      });
      if (current?.source === "user") continue;

      // MAP 단계 — 이 흐름을 누가 하는가. 모르면 null로 둔다.
      const roleKey = resolveRoleKey(flow.userRoleKey, roles);
      const appUserRoleId = roleKey ? (roleIdByKey.get(roleKey) ?? null) : null;

      const saved = await tx.vibesafeCriticalFlow.upsert({
        where: { projectId_key: { projectId: project.id, key: flow.key } },
        create: {
          projectId: project.id,
          appModelId: model.id,
          appUserRoleId,
          key: flow.key,
          title: flow.title,
          description: flow.description,
          category: flow.category,
          // 새 흐름은 반드시 사용자 확인을 거친다 — 바로 운영 앱에서 돌리지 않는다.
          status: "pending",
          riskLevel: flow.riskLevel,
          riskReason: flow.riskReason,
          sortOrder: index,
          source: "ai",
        },
        update: {
          appModelId: model.id,
          appUserRoleId,
          title: flow.title,
          description: flow.description,
          category: flow.category,
          riskLevel: flow.riskLevel,
          riskReason: flow.riskReason,
          sortOrder: index,
          // 이미 켜 둔 흐름의 status는 건드리지 않는다 — 단계만 새로 고친다.
          status: current?.status ?? "pending",
        },
      });

      await tx.vibesafeFlowStep.deleteMany({ where: { flowId: saved.id } });
      await tx.vibesafeFlowStep.createMany({
        data: flow.steps.map((step, stepIndex) => ({
          flowId: saved.id,
          sortOrder: stepIndex,
          action: step.action,
          selector: step.selector,
          value: step.value,
          secretRef: step.secretRef,
          description: step.description,
          optional: step.optional,
        })),
      });
    }

    for (const finding of findings) {
      await tx.vibesafeSecurityFinding.upsert({
        where: {
          projectId_rule_filePath_line: {
            projectId: project.id,
            rule: finding.rule,
            filePath: finding.filePath,
            line: finding.line ?? 0,
          },
        },
        create: {
          projectId: project.id,
          appModelId: model.id,
          severity: finding.severity,
          rule: finding.rule,
          title: finding.title,
          filePath: finding.filePath,
          line: finding.line ?? 0,
          evidence: finding.evidence,
          advice: finding.advice,
        },
        update: { appModelId: model.id, severity: finding.severity, evidence: finding.evidence },
      });
    }

    await tx.vibesafeRepositoryConnection.update({
      where: { projectId: project.id },
      data: { lastAnalyzedSha: headSha },
    });
    await tx.vibesafeProject.update({
      where: { id: project.id },
      data: { status: "review" },
    });

    return model;
  });

  await recordEvent({
    name: "analysis_completed",
    userId: params.userId,
    projectId: project.id,
    props: { provider: provider.id, model: provider.model, flows: flows.length, findings: findings.length },
  });
  await recordEvent({
    name: "flow_generated",
    userId: params.userId,
    projectId: project.id,
    props: { count: flows.length },
  });

  return {
    appModelId: appModel.id,
    reused: false,
    flowCount: flows.length,
    findingCount: findings.length,
    commitSha: headSha,
  };
}

export { UsageLimitError };
export { prepareFlows };
