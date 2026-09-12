import { z } from "zod";
import { recordEvent } from "@/vibesafe/lib/analytics";
import { prisma } from "@/vibesafe/lib/db";
import { canActivate } from "@/vibesafe/lib/flows/safety";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";

/** 흐름 확인/승인 — 사용자가 "이건 맞다"고 켜주는 곳. */
const schema = z.object({
  updates: z
    .array(
      z.object({
        flowId: z.string().min(1).max(60),
        status: z.enum(["active", "disabled", "pending"]),
      }),
    )
    .max(30),
});

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  const flows = await prisma.vibesafeCriticalFlow.findMany({
    where: { projectId, id: { in: parsed.data.updates.map((u) => u.flowId) } },
    select: { id: true, riskLevel: true },
  });
  const byId = new Map(flows.map((f) => [f.id, f]));

  let activated = 0;
  for (const update of parsed.data.updates) {
    const flow = byId.get(update.flowId);
    if (!flow) continue;
    // ★ 위험 등급이 blocked인 흐름은 화면에서 켜도 켜지지 않는다. UI가 막는
    //   것에만 기대면, API를 직접 부르는 순간 결제 흐름이 운영에서 돌아간다.
    if (update.status === "active" && !canActivate(flow.riskLevel)) continue;

    await prisma.vibesafeCriticalFlow.update({
      where: { id: flow.id },
      data: { status: update.status },
    });
    if (update.status === "active") activated += 1;
  }

  if (activated > 0) {
    await recordEvent({
      name: "flow_approved",
      userId: auth.session.userId,
      projectId,
      props: { count: activated },
    });
  }
  return ok({ activated });
}

export const dynamic = "force-dynamic";
