import { AiNotConfiguredError, AiRequestError } from "@/vibesafe/lib/ai";
import { analyzeProject, AnalysisError } from "@/vibesafe/lib/analysis/analyze";
import { enforceRateLimit, fail, ok, requireSession } from "@/vibesafe/lib/http";
import { UsageLimitError } from "@/vibesafe/lib/usage";

/**
 * 저장소 분석. 시간이 걸리는 작업이라 함수 실행 시간을 넉넉히 잡는다 —
 * 그래도 큰 저장소에서는 모자랄 수 있어 화면에서 재시도할 수 있게 해뒀다.
 */
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { projectId } = await context.params;
  const limited = await enforceRateLimit({
    request,
    scope: "analyze",
    limit: 6,
    windowSeconds: 600,
    identity: auth.session.userId,
  });
  if (limited) return limited;

  const force = new URL(request.url).searchParams.get("force") === "1";

  try {
    const outcome = await analyzeProject({ userId: auth.session.userId, projectId, force });
    return ok({ outcome });
  } catch (error) {
    if (error instanceof AnalysisError) {
      return fail(error.message, error.code === "NOT_FOUND" ? 404 : 400);
    }
    if (error instanceof AiNotConfiguredError) return fail(error.message, 503);
    if (error instanceof UsageLimitError) return fail(error.message, 429);
    if (error instanceof AiRequestError) return fail(error.message, 502);
    console.error("[vibesafe] analyze failed:", (error as Error).message);
    return fail("분석에 실패했습니다. 잠시 후 다시 시도해주세요.", 500);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
