import { AiNotConfiguredError, AiRequestError } from "@/vibesafe/lib/ai";
import { diagnoseIncident, DiagnosisError } from "@/vibesafe/lib/repair/diagnose";
import { GithubError } from "@/vibesafe/lib/github/client";
import { enforceRateLimit, fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { PermissionDeniedError } from "@/vibesafe/lib/permissions";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { UsageLimitError } from "@/vibesafe/lib/usage";
import { z } from "zod";

const schema = z.object({ incidentId: z.string().min(1).max(60) });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const limited = await enforceRateLimit({
    request, scope: "diagnose", limit: 10, windowSeconds: 600, identity: auth.session.userId,
  });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  try {
    const result = await diagnoseIncident({
      userId: auth.session.userId,
      projectId,
      incidentId: parsed.data.incidentId,
    });
    return ok({ diagnosis: result });
  } catch (error) {
    if (error instanceof PermissionDeniedError) return fail(error.message, 403);
    if (error instanceof DiagnosisError) return fail(error.message, 400);
    if (error instanceof UsageLimitError) return fail(error.message, 429);
    if (error instanceof AiNotConfiguredError) return fail(error.message, 503);
    if (error instanceof AiRequestError) return fail(error.message, 502);
    // GitHub 쪽 문제는 "다시 연결하세요"처럼 할 수 있는 일을 알려준다.
    // 일반 500으로 뭉개면 사용자는 무엇을 해야 할지 알 수 없다.
    if (error instanceof GithubError) return fail(error.message, error.status === 401 ? 409 : 502);
    console.error("[vibesafe] diagnose route failed:", (error as Error).message);
    return fail("원인 분석에 실패했습니다.", 500);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
