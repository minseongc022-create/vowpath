import { NextResponse } from "next/server";
import { loadState, saveState, appendChat } from "@/jarvis/core/store";
import { runCycle } from "@/jarvis/engine/autopilot";
import { sendReviewAlert } from "@/jarvis/engine/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 서버리스 상한. 소싱은 도매 API를 여러 번 부르므로 여유가 필요하다 */
export const maxDuration = 60;

/**
 * 자동 운전 한 바퀴 — 10분마다 크론이 부른다.
 *
 * ★ 시간이 모자라면 정상 종료한다
 *
 * 함수가 60초에 강제 종료되면 **그 사이클 작업이 통째로 저장되지 않는다** —
 * 저장은 끝에 한 번 하기 때문이다. 그러면 10분마다 같은 일을 반복하며
 * 영원히 아무것도 못 남긴다. 그래서 마감을 넉넉히 앞당겨 잡고, 만들던 것까지만
 * 하고 저장한다. 남은 후보는 다음 사이클이 이어서 만든다.
 */
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

  const startedAt = Date.now();
  // 50초에 끊는다 — 저장과 응답에 쓸 시간을 남겨둔다
  const deadlineAt = startedAt + 50_000;

  try {
    const state = await loadState();
    const result = await runCycle(state, { deadlineAt });

    // 만든 게 있으면 대화창에도 남긴다. 사장님이 채팅만 봐도
    // 그 사이 무슨 일이 있었는지 알 수 있어야 한다.
    let alertSent = false;
    let alertReason: string | undefined;
    if (result.draftsCreated > 0) {
      appendChat(state, {
        role: "jarvis",
        text: `상품 ${result.draftsCreated}개를 새로 만들어 검수 대기에 올렸습니다. 확인 부탁드립니다.`,
        did: "source_now",
        attachments: [
          {
            kind: "drafts",
            draftIds: state.drafts.slice(0, result.draftsCreated).map((d) => d.id),
          },
        ],
      });

      // 문자는 **여기 한 곳에서만** 보낸다. 이번 사이클에 실제로 새 초안이
      // 생겼을 때만 보내고, 숫자는 이번에 만든 개수가 아니라 지금 대기
      // 중인 전체 건수로 — 사장님이 문자만 보고 "확인해야 할 게 몇 개"를
      // 정확히 알아야 한다.
      if (state.settings.alertPhone) {
        const pendingNow = state.drafts.filter((d) => d.status === "pending_review").length;
        const alert = await sendReviewAlert(state.settings.alertPhone, pendingNow);
        alertSent = alert.sent;
        alertReason = alert.reason;
      }
    }

    await saveState(state);

    return NextResponse.json({
      ok: true,
      draftsCreated: result.draftsCreated,
      idleReason: result.idleReason,
      alertSent,
      alertReason,
      goal: {
        skusNeeded: result.goal.skusNeeded,
        skusNow: result.goal.skusNow,
        dailyTarget: result.goal.dailyTarget,
      },
      sourcing: result.sourcingRun,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (e) {
    console.error("[jarvis/cron]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "CYCLE_FAILED" },
      { status: 500 },
    );
  }
}
