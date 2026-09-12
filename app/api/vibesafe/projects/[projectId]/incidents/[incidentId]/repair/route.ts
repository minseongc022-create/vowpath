import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { getRepairView } from "@/vibesafe/lib/repair/view";

/** 장애 화면이 폴링하는 곳. 검증·적용이 백그라운드로 진행되므로 상태가 움직인다. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; incidentId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId, incidentId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const view = await getRepairView({ userId: auth.session.userId, projectId, incidentId });
  if (!view) return fail("문제를 찾을 수 없습니다.", 404);
  return ok({ view });
}

export const dynamic = "force-dynamic";
