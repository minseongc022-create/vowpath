import "server-only";

import { recordEvent, recordFirstTimeEvent } from "../analytics";
import { prisma } from "../db";
import { markNotified, notify, recentlyNotified } from "../notify/dispatch";
import { recordUsage } from "../usage";

/**
 * 워커가 보낸 결과를 확정하고, 회귀 여부를 판정한다.
 *
 * ★ 이 제품의 가치는 여기 한 곳에서 나온다
 *
 * "실패했다"는 것만으로는 쓸모가 적다. 원래 안 되던 것인지, **되던 게 깨진
 * 것인지**가 사용자가 알고 싶은 전부다. 그래서 마지막으로 성공한 시점
 * (baseline)을 흐름별로 들고 있다가 비교한다.
 *
 *   baseline 있음 + 이번에 실패 → 회귀. 즉시 알린다.
 *   baseline 없음 + 이번에 실패 → 원래 안 되던 것. 기록만 한다.
 *   열린 장애 + 이번에 성공     → 복구. 해제하고 알린다.
 *
 * 한 번도 성공한 적 없는 흐름의 실패를 장애로 올리면, 셋업이 덜 된 상태에서
 * 알림이 쏟아지고 사용자는 알림을 꺼버린다.
 */

const MAX_SCREENSHOT_BYTES = 300_000;

export type RunnerResultInput = {
  flowKey: string;
  status: "passed" | "failed" | "skipped";
  startedAt: string;
  finishedAt: string;
  failedStepOrder?: number | null;
  failedStepDescription?: string | null;
  errorMessage?: string | null;
  url?: string | null;
  /** base64 JPEG. 상한을 넘으면 버린다 — 화면 한 장 때문에 결과를 잃지 않는다. */
  screenshotBase64?: string | null;
};

export type CompleteRunResult =
  | { ok: true; status: "passed" | "failed"; regressions: number; recovered: number }
  | { ok: false; error: string; code: "NOT_FOUND" | "BAD_CLAIM" | "ALREADY_DONE" };

function toDate(value: string, fallback: Date): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** 개발자용 오류 메시지가 너무 길면 화면과 DB 모두에 부담이다. */
function trimError(message: string | null | undefined): string | null {
  if (!message) return null;
  return message.slice(0, 2000);
}

export async function completeRun(params: {
  runId: string;
  claimToken: string;
  results: RunnerResultInput[];
  runError?: string | null;
}): Promise<CompleteRunResult> {
  const run = await prisma.vibesafeTestRun.findUnique({
    where: { id: params.runId },
    include: { project: { select: { id: true, name: true, userId: true } } },
  });
  if (!run) return { ok: false, error: "검사를 찾을 수 없습니다.", code: "NOT_FOUND" };
  if (run.status !== "running") {
    // 워커 재시도로 같은 완료가 두 번 와도 두 번째는 조용히 거절한다.
    return { ok: false, error: "이미 끝난 검사입니다.", code: "ALREADY_DONE" };
  }
  if (!run.claimToken || run.claimToken !== params.claimToken) {
    return { ok: false, error: "검사 권한이 없습니다.", code: "BAD_CLAIM" };
  }

  const now = new Date();
  const flows = await prisma.vibesafeCriticalFlow.findMany({
    where: { projectId: run.projectId },
    select: { id: true, key: true, title: true },
  });
  const flowByKey = new Map(flows.map((f) => [f.key, f]));

  let browserMs = 0;
  const savedResults: { flowKey: string; flowTitle: string; status: string; resultId: string }[] = [];

  for (const result of params.results) {
    const flow = flowByKey.get(result.flowKey);
    const startedAt = toDate(result.startedAt, now);
    const finishedAt = toDate(result.finishedAt, now);
    const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
    browserMs += durationMs;

    let screenshotId: string | null = null;
    if (result.screenshotBase64) {
      const bytes = Math.floor((result.screenshotBase64.length * 3) / 4);
      if (bytes <= MAX_SCREENSHOT_BYTES) {
        const shot = await prisma.vibesafeScreenshot.create({
          data: {
            projectId: run.projectId,
            contentType: "image/jpeg",
            data: result.screenshotBase64,
            bytes,
          },
          select: { id: true },
        });
        screenshotId = shot.id;
      }
    }

    const saved = await prisma.vibesafeTestResult.create({
      data: {
        runId: run.id,
        flowId: flow?.id ?? null,
        flowKey: result.flowKey,
        flowTitle: flow?.title ?? result.flowKey,
        status: result.status,
        startedAt,
        finishedAt,
        durationMs,
        failedStepOrder: result.failedStepOrder ?? null,
        failedStepDescription: result.failedStepDescription?.slice(0, 200) ?? null,
        errorMessage: trimError(result.errorMessage),
        url: result.url?.slice(0, 2000) ?? null,
        screenshotId,
      },
      select: { id: true },
    });
    savedResults.push({
      flowKey: result.flowKey,
      flowTitle: flow?.title ?? result.flowKey,
      status: result.status,
      resultId: saved.id,
    });
  }

  const anyFailed = params.results.some((r) => r.status === "failed");
  const runStatus = anyFailed ? "failed" : "passed";

  await prisma.vibesafeTestRun.update({
    where: { id: run.id },
    data: {
      status: runStatus,
      finishedAt: now,
      durationMs: run.startedAt ? now.getTime() - run.startedAt.getTime() : null,
      error: trimError(params.runError),
      claimToken: null,
    },
  });

  await recordUsage(run.project.userId, "browser_ms", browserMs);

  const { regressions, recovered } = await evaluateBaselines({
    projectId: run.projectId,
    userId: run.project.userId,
    projectName: run.project.name,
    runId: run.id,
    commitSha: run.commitSha,
    results: params.results,
  });

  await prisma.vibesafeProject.update({
    where: { id: run.projectId },
    data: { status: "active" },
  });

  await recordFirstTimeEvent({
    name: runStatus === "passed" ? "first_test_passed" : "first_test_failed",
    userId: run.project.userId,
    projectId: run.projectId,
  });

  return { ok: true, status: runStatus, regressions, recovered };
}

async function evaluateBaselines(params: {
  projectId: string;
  userId: string;
  projectName: string;
  runId: string;
  commitSha: string | null;
  results: RunnerResultInput[];
}): Promise<{ regressions: number; recovered: number }> {
  const user = await prisma.vibesafeUser.findUnique({
    where: { id: params.userId },
    select: { email: true },
  });

  let regressions = 0;
  let recovered = 0;

  for (const result of params.results) {
    if (result.status === "skipped") continue;

    const flow = await prisma.vibesafeCriticalFlow.findUnique({
      where: { projectId_key: { projectId: params.projectId, key: result.flowKey } },
      select: { title: true },
    });
    const flowTitle = flow?.title ?? result.flowKey;

    const baseline = await prisma.vibesafeFlowBaseline.findUnique({
      where: { projectId_flowKey: { projectId: params.projectId, flowKey: result.flowKey } },
      select: { id: true },
    });
    const openIncident = await prisma.vibesafeIncident.findFirst({
      where: { projectId: params.projectId, flowKey: result.flowKey, status: "open" },
      orderBy: { detectedAt: "desc" },
    });

    if (result.status === "passed") {
      // 성공할 때마다 baseline을 최신으로 민다 — "마지막으로 분명히 됐던 시점".
      await prisma.vibesafeFlowBaseline.upsert({
        where: { projectId_flowKey: { projectId: params.projectId, flowKey: result.flowKey } },
        create: {
          projectId: params.projectId,
          flowKey: result.flowKey,
          runId: params.runId,
          commitSha: params.commitSha,
        },
        update: { runId: params.runId, commitSha: params.commitSha, establishedAt: new Date() },
      });

      if (openIncident) {
        await prisma.vibesafeIncident.update({
          where: { id: openIncident.id },
          data: { status: "resolved", resolvedAt: new Date(), lastRunId: params.runId },
        });
        recovered += 1;
        await notify({
          userId: params.userId,
          projectId: params.projectId,
          incidentId: openIncident.id,
          kind: "recovered",
          title: `[VibeSafe] ${params.projectName} — ${flowTitle} 정상 복구`,
          body:
            `${params.projectName}의 "${flowTitle}" 기능이 다시 정상 작동합니다.\n\n` +
            `확인 시각: ${new Date().toLocaleString("ko-KR")}`,
          dedupeKey: `incident:${openIncident.id}:recovered`,
          email: true,
          emailTo: user?.email ?? null,
        });
      }
      continue;
    }

    // 여기서부터는 실패다.
    if (openIncident) {
      // 이미 알고 있는 장애 — 마지막 검사만 갱신하고 알림은 보내지 않는다.
      await prisma.vibesafeIncident.update({
        where: { id: openIncident.id },
        data: {
          lastRunId: params.runId,
          failedStepDescription: result.failedStepDescription?.slice(0, 200) ?? openIncident.failedStepDescription,
          errorMessage: trimError(result.errorMessage) ?? openIncident.errorMessage,
        },
      });
      continue;
    }

    if (!baseline) {
      // 한 번도 성공한 적 없는 흐름. 회귀가 아니다 — 결과 화면에만 남는다.
      continue;
    }

    const incident = await prisma.vibesafeIncident.create({
      data: {
        projectId: params.projectId,
        flowKey: result.flowKey,
        flowTitle,
        status: "open",
        severity: "high",
        firstRunId: params.runId,
        lastRunId: params.runId,
        failedStepDescription: result.failedStepDescription?.slice(0, 200) ?? null,
        errorMessage: trimError(result.errorMessage),
      },
      select: { id: true },
    });
    regressions += 1;

    await recordEvent({
      name: "incident_detected",
      userId: params.userId,
      projectId: params.projectId,
      props: { flowKey: result.flowKey, failedStep: result.failedStepDescription ?? "" },
    });

    const quiet = await recentlyNotified(params.projectId, result.flowKey);
    await notify({
      userId: params.userId,
      projectId: params.projectId,
      incidentId: incident.id,
      kind: "regression",
      title: `[VibeSafe] ${params.projectName} — ${flowTitle} 기능에 문제가 생겼습니다`,
      body:
        `최근 변경 이후 "${flowTitle}" 기능이 정상 작동하지 않습니다.\n\n` +
        (result.failedStepDescription ? `실패한 단계: ${result.failedStepDescription}\n` : "") +
        (result.url ? `확인한 주소: ${result.url}\n` : "") +
        `발견 시각: ${new Date().toLocaleString("ko-KR")}\n\n` +
        `VibeSafe에서 자세히 보기: /vibesafe/projects/${params.projectId}`,
      dedupeKey: `incident:${incident.id}:detected`,
      email: !quiet,
      emailTo: user?.email ?? null,
    });
    await markNotified(incident.id);
  }

  return { regressions, recovered };
}
