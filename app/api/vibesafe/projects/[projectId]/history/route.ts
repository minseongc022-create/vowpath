import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { backfillDailyStats, getProjectHistory } from "@/vibesafe/lib/history";
import { assertProjectOwner } from "@/vibesafe/lib/projects";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }
  return ok({ history: await getProjectHistory(projectId) });
}

/** 기존 검사 기록에서 이력을 다시 만든다 — 이 기능을 도입하기 전 데이터 보정용. */
export async function POST(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }
  const days = await backfillDailyStats(projectId);
  return ok({ days });
}

export const dynamic = "force-dynamic";
