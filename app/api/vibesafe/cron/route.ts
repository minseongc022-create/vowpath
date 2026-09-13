import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/vibesafe/lib/db";
import { enqueueRun, recoverStaleRuns } from "@/vibesafe/lib/runs/queue";
import { reconcileStalledRepairs } from "@/vibesafe/lib/repair/reconcile";
import {
  processDueSubscriptions,
  processTrialsEnding,
  sendTrialEndingReminders,
} from "@/vibesafe/lib/billing/subscription";
import { scanProjectSecurity } from "@/vibesafe/lib/security/scan-runner";
import { pruneOldSignatures } from "@/vibesafe/lib/signals";

/**
 * 주기 검사.
 *
 * ★ MVP에서 24/7 인프라를 만들지 않는다
 *
 * 사용자가 거의 없는 단계에서 상시 인프라는 순수한 고정비다. 대신 cron이
 * 주기적으로 들러 (1) 워커가 죽어서 붙잡힌 검사를 되살리고 (2) 오랫동안
 * 검사하지 않은 프로젝트를 큐에 넣고 (3) REPAIR 파이프라인이 외부 신호를
 * 못 받아 멈춘 곳을 재조정하고(repair/reconcile.ts) (4) 이번 결제 주기가
 * 끝난 구독을 갱신하거나 해지하고, 체험 종료를 예고·전환한다
 * (billing/subscription.ts) — 이 전부 "누군가 알아서 눌러줘야" 도는 게
 * 아니라 사용자가 아무것도 안 해도 저절로 굴러가야 하는 것들이다.
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

  const { recovered, abandoned } = await recoverStaleRuns();

  // REPAIR 파이프라인이 웹훅 없이도 앞으로 나가게 한다. recoverStaleRuns가
  // 이미 찾아낸 "죽은 워커" 목록을 그대로 넘긴다 — 같은 실행을 두 번 읽지
  // 않기 위해서다.
  const reconciled = await reconcileStalledRepairs(abandoned).catch((error) => {
    console.error("[vibesafe] repair reconcile failed:", (error as Error).message);
    return null;
  });

  // 구독 갱신·해지. 매일 도는 이 cron 한 번이 정기결제의 전부다 —
  // 사용자가 매달 [결제하기]를 다시 누를 일은 없다.
  const billing = await processDueSubscriptions().catch((error) => {
    console.error("[vibesafe] billing cron failed:", (error as Error).message);
    return null;
  });

  // 체험 종료 예고(하루 전 1회) → 체험 종료 후 첫 결제. 순서가 중요하다 —
  // 예고를 먼저 보내야 "결제 하루 전"이라는 말이 사실이 된다. 종료 처리를
  // 먼저 하면 이미 청구된 다음에 예고 메일이 나가는 모순이 생긴다.
  const trialReminders = await sendTrialEndingReminders().catch((error) => {
    console.error("[vibesafe] trial reminder cron failed:", (error as Error).message);
    return null;
  });
  const trials = await processTrialsEnding().catch((error) => {
    console.error("[vibesafe] trial conversion cron failed:", (error as Error).message);
    return null;
  });

  // 비식별 실패 지문은 오래 들고 있을 이유가 없다 — 표만 커진다.
  const pruned = await pruneOldSignatures(14);

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

  // 보안 점검은 하루 한 번이면 충분하다 — 남의 서버에 요청을 보내는 일이라
  // 자주 돌 이유가 없고, .env가 열리는 사고는 배포 때 생기지 시간이 지나서
  // 생기지 않는다.
  let securityScanned = 0;
  const securityCutoff = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const needScan = await prisma.vibesafeProject.findMany({
    where: {
      archivedAt: null,
      deploymentTargets: { some: { kind: "production" } },
      OR: [
        { securityProbes: { none: {} } },
        { securityProbes: { every: { lastSeenAt: { lt: securityCutoff } } } },
      ],
    },
    select: {
      id: true,
      deploymentTargets: { where: { kind: "production" }, take: 1, select: { baseUrl: true } },
    },
    take: 20,
  });
  for (const project of needScan) {
    const baseUrl = project.deploymentTargets[0]?.baseUrl;
    if (!baseUrl) continue;
    try {
      await scanProjectSecurity({ projectId: project.id, baseUrl });
      securityScanned += 1;
    } catch (error) {
      console.error("[vibesafe] security scan failed:", (error as Error).message);
    }
  }

  return NextResponse.json({
    ok: true,
    queued,
    skipped,
    recovered,
    reconciled,
    billing,
    trialReminders,
    trials,
    pruned,
    securityScanned,
    checked: projects.length,
  });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
