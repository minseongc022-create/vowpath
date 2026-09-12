import { z } from "zod";
import { prisma } from "@/vibesafe/lib/db";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";

/**
 * "이건 진짜 장애였다 / 오탐이었다" 표시.
 *
 * 이 한 번의 클릭이 신뢰 점수의 원천이고, 신뢰 점수가 다음 권한 단계를 여는
 * 근거가 된다. 동시에 우리가 흐름 품질을 측정하는 유일한 객관적 지표다.
 */
const schema = z.object({
  incidentId: z.string().min(1).max(60),
  verdict: z.enum(["real", "false_alarm"]),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  const incident = await prisma.vibesafeIncident.findFirst({
    where: { id: parsed.data.incidentId, projectId },
    select: { id: true },
  });
  if (!incident) return fail("장애를 찾을 수 없습니다.", 404);

  await prisma.vibesafeIncidentVerdict.upsert({
    where: { incidentId: incident.id },
    create: {
      projectId,
      incidentId: incident.id,
      verdict: parsed.data.verdict,
      note: parsed.data.note ?? null,
    },
    update: { verdict: parsed.data.verdict, note: parsed.data.note ?? null },
  });

  // 오탐이라고 했으면 장애를 닫는다 — 열린 채로 두면 대시보드가 계속 빨갛다.
  if (parsed.data.verdict === "false_alarm") {
    await prisma.vibesafeIncident.updateMany({
      where: { id: incident.id, status: "open" },
      data: { status: "resolved", resolvedAt: new Date() },
    });
  }
  return ok({});
}

export const dynamic = "force-dynamic";
