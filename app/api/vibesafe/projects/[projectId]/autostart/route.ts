import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { autoStartProject } from "@/vibesafe/lib/onboarding";

/**
 * 분석이 끝난 프로젝트를 "실제로 확인하고 있는 상태"까지 데려간다.
 *
 * 어떤 흐름을 켜도 되는지는 서버가 정한다 — 클라이언트가 위험도를 보고
 * 고르게 하면 화면을 조작해 blocked 흐름을 켜는 경로가 생긴다.
 */
export async function POST(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const result = await autoStartProject({ userId: auth.session.userId, projectId });
  return ok({ autoStart: result });
}

export const dynamic = "force-dynamic";
