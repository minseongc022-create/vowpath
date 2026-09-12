import "server-only";

import { recordEvent } from "./analytics";
import { prisma } from "./db";
import { enqueueRun } from "./runs/queue";

/**
 * 연결 직후 자동으로 여기까지 데려간다.
 *
 * ★ 왜 자동으로 켜는가
 *
 * 분석이 끝나면 흐름은 전부 `pending`으로 저장된다. 원래는 사용자가 하나씩
 * 보고 켜야 했다. 안전을 위한 설계였지만, 실제로는 **여기서 사람들이
 * 멈춘다** — 처음 보는 목록 앞에서 무엇을 켜야 할지 모르고, 그냥 닫는다.
 * 그러면 이 제품은 아무것도 확인하지 않는 상태로 남고, 사용자는 "별로
 * 안 해주네"라고 결론 내린다. 안전하지만 쓸모없는 도구가 된다.
 *
 * ★ 그래서 무엇을 켜는가: `safe`만
 *
 *   safe    열기·읽기·검색·로그인처럼 되돌릴 수 있는 행동 → 자동으로 켠다
 *   caution 글 작성처럼 데이터가 남는 행동            → 사용자가 직접 켠다
 *   blocked 결제·발송·삭제                            → 어떤 경우에도 안 켠다
 *
 * 이 경계는 `flows/safety.ts`의 규칙이 정하고 AI는 관여하지 않는다. 즉
 * 자동으로 켜지는 것은 **남의 운영 앱에서 눌러도 아무 일도 남지 않는 행동**
 * 뿐이다. 그 정도까지가 "묻지 않고 해도 되는" 선이다.
 *
 * 그리고 켠 사실을 숨기지 않는다. 화면에 무엇을 켰는지 그대로 보여주고,
 * 한 번에 끌 수 있게 둔다. 자동으로 한 일을 사용자가 나중에 발견하는 것이
 * 가장 나쁘다.
 */

export type AutoStartResult = {
  enabledFlows: { key: string; title: string }[];
  /** 사용자가 직접 판단해야 하는 흐름 — 켜지 않았다 */
  needsReview: { key: string; title: string; riskLevel: string }[];
  runId: string | null;
  runError: string | null;
};

export async function autoStartProject(params: {
  userId: string;
  projectId: string;
}): Promise<AutoStartResult> {
  const { userId, projectId } = params;

  const flows = await prisma.vibesafeCriticalFlow.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, key: true, title: true, riskLevel: true, status: true, source: true },
  });

  // ★ 여기가 안전선이다. 조건을 넓히지 말 것.
  const autoEnable = flows.filter((f) => f.riskLevel === "safe" && f.status === "pending");
  const needsReview = flows
    .filter((f) => f.riskLevel !== "safe" && f.status === "pending")
    .map((f) => ({ key: f.key, title: f.title, riskLevel: f.riskLevel }));

  if (autoEnable.length > 0) {
    await prisma.vibesafeCriticalFlow.updateMany({
      where: { id: { in: autoEnable.map((f) => f.id) } },
      data: { status: "active" },
    });
    await recordEvent({
      name: "flow_auto_enabled",
      userId,
      projectId,
      props: { count: autoEnable.length },
    });
  }

  // 켤 게 하나도 없으면 검사를 걸어봐야 빈 실행이다.
  const activeCount = await prisma.vibesafeCriticalFlow.count({
    where: { projectId, status: "active", riskLevel: { not: "blocked" } },
  });
  if (activeCount === 0) {
    return {
      enabledFlows: [],
      needsReview,
      runId: null,
      runError: "자동으로 켤 수 있는 흐름이 없습니다. 아래에서 직접 확인해주세요.",
    };
  }

  const run = await enqueueRun({ userId, projectId, trigger: "manual" });

  return {
    enabledFlows: autoEnable.map((f) => ({ key: f.key, title: f.title })),
    needsReview,
    runId: run.ok ? run.runId : null,
    runError: run.ok ? null : run.error,
  };
}
