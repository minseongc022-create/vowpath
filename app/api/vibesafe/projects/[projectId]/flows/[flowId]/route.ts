import { z } from "zod";
import { prisma } from "@/vibesafe/lib/db";
import { assessFlowRisk } from "@/vibesafe/lib/flows/safety";
import { normalizeStep } from "@/vibesafe/lib/flows/steps";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";

const schema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  steps: z
    .array(
      z.object({
        action: z.string().max(30),
        selector: z.string().max(300).nullable().optional(),
        value: z.string().max(500).nullable().optional(),
        secretRef: z.string().max(20).nullable().optional(),
        description: z.string().trim().min(1).max(200),
        optional: z.boolean().optional(),
      }),
    )
    .max(15)
    .optional(),
});

/** 사용자가 흐름을 고친다. 고친 흐름은 source=user가 되어 재분석이 덮지 않는다. */
export async function PATCH(
  request: Request,
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

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  const steps = parsed.data.steps
    ? parsed.data.steps.map((s) => normalizeStep(s)).filter((s): s is NonNullable<typeof s> => s !== null)
    : null;

  if (parsed.data.steps && steps && steps.length === 0) {
    return fail("실행할 수 있는 단계가 없습니다. 선택자 형식을 확인해주세요.");
  }

  const title = parsed.data.title ?? flow.title;
  const description = parsed.data.description ?? flow.description ?? "";
  const effectiveSteps =
    steps ??
    flow.steps.map((s) => ({
      action: s.action,
      selector: s.selector,
      value: s.value,
      description: s.description,
    }));

  // 사용자가 고쳐도 위험도는 다시 우리가 매긴다 — 고치면서 결제 버튼을
  // 넣었을 수도 있다.
  const risk = assessFlowRisk({
    title,
    description,
    category: flow.category,
    steps: effectiveSteps.map((s) => ({
      action: s.action,
      description: "description" in s ? s.description : "",
      value: s.value,
      selector: s.selector,
    })),
  });

  await prisma.$transaction(async (tx) => {
    await tx.vibesafeCriticalFlow.update({
      where: { id: flow.id },
      data: {
        title,
        description,
        source: "user",
        riskLevel: risk.level,
        riskReason: risk.reason,
        // 위험 등급이 blocked로 올라갔다면 켜진 상태를 유지할 수 없다.
        status: risk.level === "blocked" ? "disabled" : flow.status,
      },
    });
    if (steps) {
      await tx.vibesafeFlowStep.deleteMany({ where: { flowId: flow.id } });
      await tx.vibesafeFlowStep.createMany({
        data: steps.map((step, index) => ({
          flowId: flow.id,
          sortOrder: index,
          action: step.action,
          selector: step.selector,
          value: step.value,
          secretRef: step.secretRef,
          description: step.description,
          optional: step.optional,
        })),
      });
    }
  });

  return ok({ riskLevel: risk.level, riskReason: risk.reason });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; flowId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { projectId, flowId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }
  const result = await prisma.vibesafeCriticalFlow.deleteMany({ where: { id: flowId, projectId } });
  if (result.count === 0) return fail("흐름을 찾을 수 없습니다.", 404);
  return ok({});
}

export const dynamic = "force-dynamic";
