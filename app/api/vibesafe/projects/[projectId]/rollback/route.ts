import { z } from "zod";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { PermissionDeniedError } from "@/vibesafe/lib/permissions";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { listRollbacks, RollbackError, rollbackToPreviousDeployment } from "@/vibesafe/lib/repair/rollback";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }
  return ok({ rollbacks: await listRollbacks(projectId) });
}

const schema = z.object({ incidentId: z.string().max(60).nullable().optional() });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const parsed = schema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  try {
    const result = await rollbackToPreviousDeployment({
      userId: auth.session.userId,
      projectId,
      incidentId: parsed.data.incidentId ?? null,
      reason: "사용자가 직접 되돌렸습니다",
      triggeredBy: auth.session.email || "user",
    });
    return ok({ rollback: result });
  } catch (error) {
    if (error instanceof PermissionDeniedError) return fail(error.message, 403);
    if (error instanceof RollbackError) {
      return fail(error.message, error.code === "DAILY_LIMIT" || error.code === "COOLDOWN" ? 429 : 400);
    }
    console.error("[vibesafe] rollback route failed:", (error as Error).message);
    return fail("되돌리기에 실패했습니다.", 500);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
