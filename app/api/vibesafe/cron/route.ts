import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/vibesafe/lib/db";
import { enqueueRun, recoverStaleRuns } from "@/vibesafe/lib/runs/queue";

/**
 * 주기 검사.
 *
 * ★ MVP에서 24/7 인프라를 만들지 않는다
 *
 * 사용자가 거의 없는 단계에서 상시 인프라는 순수한 고정비다. 대신 cron이
 * 주기적으로 들러 (1) 워커가 죽어서 붙잡힌 검사를 되살리고 (2) 오랫동안
 * 검사하지 않은 프로젝트를 큐에 넣는다.
 *
 * 주기를 정할 때 기준은 "얼마나 자주 확인하고 싶은가"가 아니라 "한 달 비용이
 * 얼마인가"다. 기본 6시간은 무료 베타에서 감당 가능한 선이다.
 */
const DEFAULT_INTERVAL_HOURS = 6;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const isDeployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (isDeployed && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (secret) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (bearer !== secret && request.headers.get("x-cron-secret") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "database not configured" }, { status: 503 });
  }

  const recovered = await recoverStaleRuns();

  const intervalHours = Number(process.env.VIBESAFE_CHECK_INTERVAL_HOURS) || DEFAULT_INTERVAL_HOURS;
  const cutoff = new Date(Date.now() - intervalHours * 60 * 60 * 1000);

  // 켜 둔 흐름이 하나라도 있는 프로젝트만 대상이다.
  const projects = await prisma.vibesafeProject.findMany({
    where: {
      archivedAt: null,
      flows: { some: { status: "active", riskLevel: { not: "blocked" } } },
    },
    select: {
      id: true,
      userId: true,
      testRuns: { orderBy: { queuedAt: "desc" }, take: 1, select: { queuedAt: true } },
    },
    take: 200,
  });

  let queued = 0;
  let skipped = 0;
  for (const project of projects) {
    const lastRun = project.testRuns[0]?.queuedAt;
    if (lastRun && lastRun > cutoff) {
      skipped += 1;
      continue;
    }
    const result = await enqueueRun({
      userId: project.userId,
      projectId: project.id,
      trigger: "schedule",
    });
    if (result.ok && result.created) queued += 1;
  }

  return NextResponse.json({ ok: true, queued, skipped, recovered, checked: projects.length });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
