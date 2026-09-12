import { recordFirstTimeEvent } from "@/vibesafe/lib/analytics";
import { enforceRateLimit, fail, ok, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { enqueueRun } from "@/vibesafe/lib/runs/queue";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const limited = await enforceRateLimit({
    request,
    scope: "run",
    limit: 20,
    windowSeconds: 600,
    identity: auth.session.userId,
  });
  if (limited) return limited;

  const result = await enqueueRun({ userId: auth.session.userId, projectId, trigger: "manual" });
  if (!result.ok) return fail(result.error, result.code === "LIMIT" ? 429 : 400);

  if (result.created) {
    await recordFirstTimeEvent({
      name: "first_test_started",
      userId: auth.session.userId,
      projectId,
    });
  }
  return ok({ runId: result.runId, created: result.created });
}

export const dynamic = "force-dynamic";
