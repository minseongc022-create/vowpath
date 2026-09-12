import "server-only";

import { prisma } from "../db";
import { logAction } from "../permissions";
import { runSecurityProbes } from "./probe";

/**
 * 점검을 돌리고 결과를 DB에 반영한다.
 *
 * ★ 고쳐진 항목은 사라지지 않고 "고쳐짐"으로 남는다
 *
 * 그래야 "지난달에 .env가 열려 있었는데 고쳤다"는 이력이 남는다. 이력이
 * 남아야 사용자가 "이 도구 덕분에 뭘 막았는지"를 나중에도 볼 수 있고,
 * 그게 이 제품을 계속 쓰는 이유가 된다.
 */
export async function scanProjectSecurity(params: {
  projectId: string;
  baseUrl: string;
}): Promise<{ found: number; fixed: number; critical: number }> {
  const findings = await runSecurityProbes(params.baseUrl);
  const now = new Date();

  const seenKeys = new Set<string>();
  for (const finding of findings) {
    seenKeys.add(`${finding.probe}::${finding.target}`);
    await prisma.vibesafeSecurityProbe.upsert({
      where: {
        projectId_probe_target: {
          projectId: params.projectId,
          probe: finding.probe,
          target: finding.target,
        },
      },
      create: {
        projectId: params.projectId,
        probe: finding.probe,
        severity: finding.severity,
        title: finding.title,
        target: finding.target,
        evidence: finding.evidence,
        advice: finding.advice,
        status: "open",
      },
      update: {
        severity: finding.severity,
        title: finding.title,
        evidence: finding.evidence,
        advice: finding.advice,
        lastSeenAt: now,
        // 다시 발견됐으면 "고쳐짐"에서 되돌린다.
        status: "open",
        resolvedAt: null,
      },
    });
  }

  // 이번에 안 보인 항목 = 고쳐졌다. (사용자가 "무시"로 표시한 건 건드리지 않는다.)
  const existing = await prisma.vibesafeSecurityProbe.findMany({
    where: { projectId: params.projectId, status: "open" },
    select: { id: true, probe: true, target: true },
  });
  let fixed = 0;
  for (const row of existing) {
    if (seenKeys.has(`${row.probe}::${row.target}`)) continue;
    await prisma.vibesafeSecurityProbe.update({
      where: { id: row.id },
      data: { status: "fixed", resolvedAt: now },
    });
    fixed += 1;
  }

  const critical = findings.filter((f) => f.severity === "critical").length;

  await logAction({
    projectId: params.projectId,
    action: "probe",
    summary: `보안 점검 완료 — 발견 ${findings.length}건${fixed ? `, 고쳐짐 ${fixed}건` : ""}`,
    detail: { found: findings.length, fixed, critical },
  });

  return { found: findings.length, fixed, critical };
}

export async function listSecurityProbes(projectId: string) {
  return prisma.vibesafeSecurityProbe.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { severity: "asc" }, { lastSeenAt: "desc" }],
    take: 50,
  });
}
