import "server-only";

import { prisma } from "../db";
import { logAction } from "../permissions";
import { notify } from "../notify/dispatch";
import { validateServiceUrl } from "../url-safety";
import { canTransition } from "./pipeline";
import { finishRepairVerification } from "./verify";
import { finalizeAfterProduction, startProductionVerification } from "./apply";
import type { AbandonedRun } from "../runs/queue";

/**
 * 파이프라인이 멈춰버리는 경우를 되살린다.
 *
 * ★ 이 파일이 없으면 무슨 일이 생기는가
 *
 * REPAIR → VERIFY AGAIN → APPLY → WATCH는 각 단계가 **외부 신호**를 기다린다
 * (Vercel의 deployment_status 웹훅, 워커가 검사를 끝내고 보내는 완료 요청).
 * 그 신호가 아예 안 오면 — 워커가 죽었거나, 이 저장소가 Vercel이 아니거나,
 * webhook 설정이 빠졌거나 — 제안은 `opened`나 `verifying`에 영원히 멈춘다.
 *
 * 사용자에게는 "확인이 끝나면 알려드리겠습니다"라고 약속해놓고 알리지 않는
 * 것과 같다. 이 파일은 그 약속을 지키기 위한 안전망이다: cron이 주기적으로
 * 들러 너무 오래 멈춘 제안을 찾아 **정직하게 실패로 표시**하거나 **다시
 * 시도**한다. 성공으로 둔갑시키지 않는다 — 확인하지 못했으면 못했다고 만다.
 */

/** 미리보기 배포 신호가 이 시간 안에 안 오면 사람에게 넘긴다. */
const OPENED_STALE_MS = 2 * 60 * 60 * 1000; // 2시간
/** 머지 후 이 시간이 지나도 운영 재확인이 안 걸렸으면 다시 건다. */
const APPLIED_RETRY_MS = 10 * 60 * 1000; // 10분
/** 운영 재확인도 무한 재시도하지 않는다 — 여기까지 못 걸면 사람에게 알린다. */
const APPLIED_GIVE_UP_MS = 6 * 60 * 60 * 1000; // 6시간

/**
 * 검증 실행이 끝내 완료되지 못했을 때(워커가 죽어 recoverStaleRuns가
 * 최대 시도 횟수를 다 쓴 경우) 호출된다. queue.ts가 이미 어떤 실행이
 * 버려졌는지 알려주므로, 여기서는 그중 REPAIR 파이프라인 소속만 골라
 * 마무리한다.
 *
 * finishRepairVerification은 run.results가 비어 있어도 안전하게 동작한다 —
 * "확인하지 못했습니다"로 정직하게 떨어진다. completeRun을 거치지 않고도
 * 쓸 수 있는 이유다.
 */
export async function finalizeAbandonedRun(run: AbandonedRun): Promise<void> {
  if (run.trigger === "repair_verify" && run.fixProposalId) {
    await finishRepairVerification(run.runId).catch((error) =>
      console.error("[vibesafe] abandoned verify finalize failed:", (error as Error).message),
    );
    return;
  }

  if (run.trigger === "repair_confirm" && run.fixProposalId) {
    // 결과가 없으니 통과도 실패도 아니다 — 확정 짓지 않는다. 대신 다음
    // 재조정 때 다시 시도할 수 있도록 productionRunId를 비워둔다.
    await prisma.vibesafeFixProposal.updateMany({
      where: { id: run.fixProposalId, productionRunId: run.runId },
      data: { productionRunId: null },
    });
    await finalizeAfterProduction({
      projectId: run.projectId,
      runId: run.runId,
      passedFlowKeys: [],
      failedFlowKeys: [],
    }).catch(() => undefined);
  }
}

export type ReconcileResult = {
  openedStalled: number;
  verifyingStalled: number;
  appliedRetried: number;
  appliedGivenUp: number;
};

/**
 * cron에서 주기적으로 부른다. 웹훅에 기대지 않고 스스로 상태를 확인한다.
 */
export async function reconcileStalledRepairs(abandonedRuns: AbandonedRun[]): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    openedStalled: 0,
    verifyingStalled: 0,
    appliedRetried: 0,
    appliedGivenUp: 0,
  };
  const now = Date.now();

  // 1) opened인데 미리보기 신호가 안 온 것들 — Vercel이 아니거나 webhook이
  //    안 걸려 있을 가능성이 크다. 사람에게 넘기고, 직접 주소를 넣을 수
  //    있다고 알려준다.
  const staleOpened = await prisma.vibesafeFixProposal.findMany({
    where: {
      status: "opened",
      previewUrl: null,
      createdAt: { lt: new Date(now - OPENED_STALE_MS) },
    },
    select: { id: true, projectId: true, incidentId: true, title: true, prNumber: true },
    take: 50,
  });
  for (const proposal of staleOpened) {
    if (!canTransition("opened", "needs_human")) continue;
    await prisma.vibesafeFixProposal.update({
      where: { id: proposal.id },
      data: {
        status: "needs_human",
        error:
          "미리보기 배포 신호를 받지 못했습니다. Vercel 연동을 확인하시거나, 미리보기 주소를 직접 입력해 확인을 시작할 수 있습니다.",
      },
    });
    await logAction({
      projectId: proposal.projectId,
      action: "repair_verify_stalled",
      summary: `PR #${proposal.prNumber ?? "?"}의 미리보기 배포 신호가 오지 않아 사람 확인으로 넘겼습니다`,
      detail: { proposalId: proposal.id },
      incidentId: proposal.incidentId,
    });
    await notifyStalled(proposal.projectId, proposal.incidentId, proposal.title, "opened");
    result.openedStalled += 1;
  }

  // 2) 워커가 죽어 recoverStaleRuns가 이번에 포기한 실행들 중
  //    REPAIR 파이프라인 소속을 마저 정리한다. cron이 recoverStaleRuns를
  //    한 번만 부르고 그 결과를 여기로 넘긴다 — 같은 실행을 두 번 처리하지
  //    않기 위해서다.
  for (const run of abandonedRuns) {
    if (run.trigger !== "repair_verify" && run.trigger !== "repair_confirm") continue;
    await finalizeAbandonedRun(run);
    result.verifyingStalled += 1;
  }

  // 3) applied인데 운영 재확인이 안 걸린 것들 — 배포 완료 webhook이 안 왔을
  //    수 있다. 운영 대상 주소로 직접 다시 검사를 건다(웹훅과 달리 이건
  //    우리가 이미 등록해 둔 주소를 그냥 쓰므로 플랫폼을 가리지 않는다).
  const staleApplied = await prisma.vibesafeFixProposal.findMany({
    where: {
      status: "applied",
      productionRunId: null,
      appliedAt: { lt: new Date(now - APPLIED_RETRY_MS) },
    },
    select: { id: true, projectId: true, incidentId: true, title: true, appliedAt: true },
    take: 50,
  });
  for (const proposal of staleApplied) {
    const appliedAt = proposal.appliedAt?.getTime() ?? now;
    if (now - appliedAt > APPLIED_GIVE_UP_MS) {
      // 6시간이 지나도 재확인을 못 걸었다면 배포 자체가 안 됐을 수 있다.
      // 여기서도 계속 조용히 재시도만 하면 사용자는 "고쳤다는데 왜 그대로지"
      // 상태로 무한정 남는다. 사람에게 넘긴다.
      if (canTransition("applied", "needs_human")) {
        await prisma.vibesafeFixProposal.update({
          where: { id: proposal.id },
          data: {
            status: "needs_human",
            error: "적용은 됐지만 배포가 끝났는지 확인하지 못했습니다. 배포 상태를 직접 확인해주세요.",
          },
        });
        await logAction({
          projectId: proposal.projectId,
          action: "repair_confirm_stalled",
          summary: "적용 후 운영 배포 확인 신호를 받지 못해 사람 확인으로 넘겼습니다",
          detail: { proposalId: proposal.id },
          incidentId: proposal.incidentId,
        });
        await notifyStalled(proposal.projectId, proposal.incidentId, proposal.title, "applied");
        result.appliedGivenUp += 1;
      }
      continue;
    }
    const runId = await startProductionVerification(proposal.id).catch(() => null);
    if (runId) result.appliedRetried += 1;
  }

  return result;
}

async function notifyStalled(
  projectId: string,
  incidentId: string | null,
  title: string,
  stage: "opened" | "applied",
): Promise<void> {
  const project = await prisma.vibesafeProject.findUnique({
    where: { id: projectId },
    select: { userId: true, user: { select: { email: true } } },
  });
  if (!project) return;
  const link = `/vibesafe/projects/${projectId}/incidents/${incidentId ?? ""}`;
  const body =
    stage === "opened"
      ? `"${title}" 수정을 미리 확인하려 했지만 미리보기 배포 신호를 받지 못했습니다.\n\n` +
        `Vercel 연동을 확인하시거나, 화면에서 미리보기 주소를 직접 입력해 확인을 시작할 수 있습니다.\n\n${link}`
      : `"${title}" 수정을 적용했지만 배포가 끝났는지 확인하지 못했습니다.\n\n` +
        `배포 상태를 직접 확인해주세요. 문제가 있다면 이전 배포로 되돌릴 수 있습니다.\n\n${link}`;

  await notify({
    userId: project.userId,
    projectId,
    incidentId,
    kind: "regression",
    title: `[VibeSafe] ${title} — 확인이 멈췄습니다`,
    body,
    dedupeKey: `stalled:${projectId}:${incidentId ?? "none"}:${stage}`,
    email: true,
    emailTo: project.user?.email ?? null,
  });
}
