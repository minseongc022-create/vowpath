import { z } from "zod";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { prisma } from "@/vibesafe/lib/db";
import { startRepairVerification } from "@/vibesafe/lib/repair/verify";
import { validateServiceUrl } from "@/vibesafe/lib/url-safety";

/**
 * 미리보기 주소를 직접 입력해 검증을 시작한다.
 *
 * ★ 왜 필요한가
 *
 * VERIFY AGAIN은 원래 Vercel의 `deployment_status` webhook이 프리뷰 배포
 * 완료를 알려주면 자동으로 시작된다. 하지만 이 저장소가 Vercel이 아니거나,
 * webhook 연결이 빠졌거나, 신호가 늦으면 제안은 `opened`에 멈춰 있다.
 * 그럴 때 사용자가 미리보기 주소를 알고 있다면 굳이 기다릴 이유가 없다.
 *
 * 등록 주소와 똑같은 SSRF 검사를 거친다 — 사용자가 입력한 값이라고 해서
 * 믿을 이유가 없다.
 */

const schema = z.object({
  proposalId: z.string().min(1).max(60),
  previewUrl: z.string().min(1).max(2000),
});

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("미리보기 주소를 입력해주세요.");

  const urlCheck = validateServiceUrl(parsed.data.previewUrl);
  if (!urlCheck.ok) return fail(urlCheck.error);

  const proposal = await prisma.vibesafeFixProposal.findFirst({
    where: { id: parsed.data.proposalId, projectId },
    select: { id: true },
  });
  if (!proposal) return fail("수정안을 찾을 수 없습니다.", 404);

  const result = await startRepairVerification({
    proposalId: parsed.data.proposalId,
    previewUrl: urlCheck.url,
  });
  if (!result.ok) return fail(result.reason ?? "확인을 시작하지 못했습니다.");

  return ok({ runId: result.runId });
}

export const dynamic = "force-dynamic";
