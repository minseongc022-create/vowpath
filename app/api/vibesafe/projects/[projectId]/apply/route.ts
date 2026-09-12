import { z } from "zod";
import { ApplyError, applyFix } from "@/vibesafe/lib/repair/apply";
import { GithubError } from "@/vibesafe/lib/github/client";
import { enforceRateLimit, fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { isPermissionDenied } from "@/vibesafe/lib/permissions";
import { assertProjectOwner } from "@/vibesafe/lib/projects";

/**
 * [수정 적용하기].
 *
 * ★ 이 라우트가 사용자 운영 서비스를 바꾸는 유일한 코드 경로다
 *
 * 그래서 (1) 로그인, (2) 프로젝트 소유, (3) applyFix 권한, (4) 제안이
 * ready_to_apply, (5) PR head가 검증 때와 동일 — 다섯 개를 모두 통과해야
 * 한다. 앞의 셋은 여기서, 뒤의 둘은 applyFix() 안에서 본다.
 *
 * 한도를 좁게 거는 이유: 이 버튼이 연타되면 PR이 연달아 머지되고 배포가
 * 흔들린다. 시간당 3건이면 사람이 확인하며 쓰는 속도로는 충분하다.
 */

const schema = z.object({ proposalId: z.string().min(1).max(60) });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const limited = await enforceRateLimit({
    request,
    scope: "apply",
    limit: 3,
    windowSeconds: 3600,
    identity: auth.session.userId,
  });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  try {
    const result = await applyFix({
      userId: auth.session.userId,
      projectId,
      proposalId: parsed.data.proposalId,
      actor: auth.session.email || "user",
    });
    return ok({ apply: result });
  } catch (error) {
    if (isPermissionDenied(error)) return fail(error.message, 403);
    if (error instanceof ApplyError) {
      return fail(error.message, error.code === "NOT_FOUND" ? 404 : 400);
    }
    if (error instanceof GithubError) return fail(error.message, error.status === 401 ? 409 : 502);
    console.error("[vibesafe] apply route failed:", (error as Error).message);
    return fail("수정을 적용하지 못했습니다.", 500);
  }
}

export const dynamic = "force-dynamic";
