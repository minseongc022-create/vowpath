import { z } from "zod";
import { AiNotConfiguredError, AiRequestError } from "@/vibesafe/lib/ai";
import { FixError, proposeFix } from "@/vibesafe/lib/repair/propose-fix";
import { GithubError } from "@/vibesafe/lib/github/client";
import { enforceRateLimit, fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { PermissionDeniedError } from "@/vibesafe/lib/permissions";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { UsageLimitError } from "@/vibesafe/lib/usage";

const schema = z.object({ diagnosisId: z.string().min(1).max(60) });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  // PR을 여는 건 외부에 흔적이 남는 행동이라 한도를 더 좁게 건다.
  const limited = await enforceRateLimit({
    request, scope: "fix", limit: 5, windowSeconds: 3600, identity: auth.session.userId,
  });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  try {
    const result = await proposeFix({
      userId: auth.session.userId,
      projectId,
      diagnosisId: parsed.data.diagnosisId,
    });
    return ok({ proposal: result });
  } catch (error) {
    if (error instanceof PermissionDeniedError) return fail(error.message, 403);
    if (error instanceof FixError) return fail(error.message, 400);
    if (error instanceof UsageLimitError) return fail(error.message, 429);
    if (error instanceof AiNotConfiguredError) return fail(error.message, 503);
    if (error instanceof AiRequestError) return fail(error.message, 502);
    // GitHub 쪽 문제는 "다시 연결하세요"처럼 할 수 있는 일을 알려준다.
    // 일반 500으로 뭉개면 사용자는 무엇을 해야 할지 알 수 없다.
    if (error instanceof GithubError) return fail(error.message, error.status === 401 ? 409 : 502);
    console.error("[vibesafe] fix route failed:", (error as Error).message);
    return fail("수정안을 만들지 못했습니다.", 500);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
