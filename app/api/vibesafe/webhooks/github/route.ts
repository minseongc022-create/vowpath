import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { decryptSecret } from "@/vibesafe/lib/crypto";
import { isDatabaseConfigured, prisma } from "@/vibesafe/lib/db";
import { getGithubAppConfig } from "@/vibesafe/lib/github/app";
import {
  parsePushEvent,
  parseDeploymentStatusEvent,
  parseProductionDeploymentEvent,
  verifyGithubSignature,
} from "@/vibesafe/lib/github/webhook";
import { findOpenPullRequestForBranch } from "@/vibesafe/lib/github/client";
import { resolveAccessToken } from "@/vibesafe/lib/github/connection";
import { validateServiceUrl } from "@/vibesafe/lib/url-safety";
import { enqueueRun } from "@/vibesafe/lib/runs/queue";
import { startRepairVerification } from "@/vibesafe/lib/repair/verify";
import { startProductionVerification } from "@/vibesafe/lib/repair/apply";
import { prisma as db } from "@/vibesafe/lib/db";

/**
 * GitHub 이벤트 수신구.
 *
 * ★ 순서가 중요하다: 서명을 확인하기 전에는 아무 일도 하지 않는다
 *
 * 본문을 JSON으로 읽기는 한다(어느 프로젝트의 비밀로 대조할지 알아야 하니까).
 * 하지만 그 값으로 **행동하지 않는다** — 검사 큐에 넣는 것은 서명이 맞은
 * 다음뿐이다. 이 순서가 뒤집히면 아무나 남의 계정 사용량을 태울 수 있다.
 *
 * ★ 중복 전달
 *
 * GitHub은 응답이 늦거나 실패하면 같은 delivery를 다시 보낸다. delivery id를
 * 유니크로 먼저 기록해서, 두 번째는 조용히 돌려보낸다.
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const eventType = request.headers.get("x-github-event") ?? "";
  const deliveryId = request.headers.get("x-github-delivery") ?? "";
  const signature = request.headers.get("x-hub-signature-256");

  if (!deliveryId) return NextResponse.json({ ok: false }, { status: 400 });

  // ping은 웹훅을 붙일 때 GitHub이 보내는 인사다. 서명만 맞으면 OK를 돌려준다.
  // deployment_status — Vercel이 프리뷰 배포를 끝내면 여기로 온다.
  // 이게 "머지 전에 잡는" 기능의 입구다.
  if (eventType !== "push" && eventType !== "ping" && eventType !== "deployment_status") {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const rawBody = await request.text();
  if (rawBody.length > 2_000_000) return NextResponse.json({ ok: false }, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const repoFullName = (payload as { repository?: { full_name?: string } })?.repository?.full_name;
  if (!repoFullName || !repoFullName.includes("/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const [owner, repo] = repoFullName.split("/");

  const connections = await prisma.vibesafeRepositoryConnection.findMany({
    where: { owner, repo },
    include: { project: { select: { id: true, userId: true, archivedAt: true } } },
  });

  // 어떤 비밀로 서명했는지 모르므로 후보를 모아 하나씩 대조한다.
  const appSecret = getGithubAppConfig()?.webhookSecret ?? null;
  const verified: typeof connections = [];
  for (const connection of connections) {
    if (connection.project.archivedAt) continue;

    const candidates: string[] = [];
    if (appSecret) candidates.push(appSecret);
    if (connection.webhookSecretCipher) {
      try {
        candidates.push(decryptSecret(connection.webhookSecretCipher));
      } catch {
        // 복호화 실패는 조용히 넘긴다 — 키가 바뀌었을 수 있다.
      }
    }
    if (candidates.some((secret) => verifyGithubSignature({ rawBody, signatureHeader: signature, secret }))) {
      verified.push(connection);
    }
  }

  if (verified.length === 0) {
    // 서명이 안 맞거나 우리가 모르는 저장소다. 어느 쪽인지 알려주지 않는다.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    await prisma.vibesafeWebhookDelivery.create({
      data: { deliveryId, eventType, projectId: verified[0].projectId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw error;
  }

  if (eventType === "ping") return NextResponse.json({ ok: true, pong: true });

  if (eventType === "deployment_status") {
    // 운영 배포 완료 — 적용해둔 수정이 실제로 나갔다는 뜻이다. 이제서야
    // 실제 주소에 대고 확인할 수 있다(머지 직후에 확인하면 예전 배포를 본다).
    const production = parseProductionDeploymentEvent(payload);
    if (production) {
      let confirmed = 0;
      for (const connection of verified) {
        const applied = await db.vibesafeFixProposal.findMany({
          where: { projectId: connection.projectId, status: "applied", productionRunId: null },
          select: { id: true },
          take: 5,
        });
        for (const proposal of applied) {
          const runId = await startProductionVerification(proposal.id).catch(() => null);
          if (runId) confirmed += 1;
        }
      }
      return NextResponse.json({ ok: true, confirmed });
    }

    const deployment = parseDeploymentStatusEvent(payload);
    if (!deployment) return NextResponse.json({ ok: true, ignored: "not-a-preview" });

    // 프리뷰 주소도 등록 주소와 같은 SSRF 검사를 통과해야 한다 — webhook으로
    // 들어온 값이라고 해서 믿을 이유가 없다.
    const urlCheck = validateServiceUrl(deployment.url);
    if (!urlCheck.ok) return NextResponse.json({ ok: true, ignored: "unsafe-url" });

    let queuedPreviews = 0;
    for (const connection of verified) {
      try {
        const token = await resolveAccessToken(connection.project.userId);
        const pr = await findOpenPullRequestForBranch(
          token,
          connection.owner,
          connection.repo,
          deployment.branch,
        );
        if (!pr) continue;

        // 우리가 올린 수정 브랜치라면 일반 PR 검사가 아니라 **수정 검증**이다.
        // 같은 브라우저 검사지만, 끝난 뒤에 "이 수정이 문제를 고쳤는가"를
        // 판정하고 적용 가능 상태로 넘어간다.
        const proposal = await db.vibesafeFixProposal.findFirst({
          where: {
            projectId: connection.projectId,
            prNumber: pr.number,
            status: { in: ["opened", "needs_human"] },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (proposal) {
          const started = await startRepairVerification({
            proposalId: proposal.id,
            previewUrl: urlCheck.url,
            commitSha: pr.headSha,
          });
          if (started.ok) queuedPreviews += 1;
          continue;
        }

        const result = await enqueueRun({
          userId: connection.project.userId,
          projectId: connection.projectId,
          trigger: "pr",
          commitSha: pr.headSha,
          targetUrl: urlCheck.url,
          prNumber: pr.number,
        });
        if (result.ok && result.created) queuedPreviews += 1;
      } catch (error) {
        console.error("[vibesafe] preview check failed:", (error as Error).message);
      }
    }
    return NextResponse.json({ ok: true, queuedPreviews });
  }

  const push = parsePushEvent(payload);
  if (!push) return NextResponse.json({ ok: true, ignored: "unparsable" });

  let queued = 0;
  for (const connection of verified) {
    // 기본 브랜치가 아닌 푸시는 무시한다 — 배포되지 않은 코드를 검사해봐야
    // 운영 앱 상태와 무관하고, 사용량만 태운다.
    if (push.branch && push.branch !== connection.defaultBranch) continue;

    const result = await enqueueRun({
      userId: connection.project.userId,
      projectId: connection.projectId,
      trigger: "github",
      commitSha: push.headSha,
    });
    if (result.ok && result.created) queued += 1;
  }

  return NextResponse.json({ ok: true, queued });
}

export const dynamic = "force-dynamic";
