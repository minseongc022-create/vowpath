import { prisma } from "@/vibesafe/lib/db";
import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; flowId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { projectId, flowId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const flow = await prisma.vibesafeCriticalFlow.findFirst({
    where: { id: flowId, projectId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!flow) return fail("흐름을 찾을 수 없습니다.", 404);

  return ok({
    flow: { id: flow.id, title: flow.title, description: flow.description, riskLevel: flow.riskLevel },
    steps: flow.steps.map((step) => ({
      action: step.action,
      selector: step.selector,
      // secretRef가 붙은 단계의 value는 비어 있다 — 실제 값은 실행 직전에만 붙는다.
      value: step.secretRef ? null : step.value,
      secretRef: step.secretRef,
      description: step.description,
      optional: step.optional,
    })),
  });
}

export const dynamic = "force-dynamic";
