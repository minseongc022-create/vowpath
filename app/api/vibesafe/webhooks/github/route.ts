import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { decryptSecret } from "@/vibesafe/lib/crypto";
import { isDatabaseConfigured, prisma } from "@/vibesafe/lib/db";
import { getGithubAppConfig } from "@/vibesafe/lib/github/app";
import { parsePushEvent, verifyGithubSignature } from "@/vibesafe/lib/github/webhook";
import { enqueueRun } from "@/vibesafe/lib/runs/queue";

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
  if (eventType !== "push" && eventType !== "ping") {
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
