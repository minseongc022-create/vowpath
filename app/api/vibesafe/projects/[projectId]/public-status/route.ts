import { headers } from "next/headers";
import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { disablePublicStatus, enablePublicStatus } from "@/vibesafe/lib/public-status";
import { prisma } from "@/vibesafe/lib/db";

async function origin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }

  const slug = await enablePublicStatus(projectId);
  const base = await origin();
  const project = await prisma.vibesafeProject.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  return ok({
    slug,
    statusUrl: `${base}/vibesafe/status/${slug}`,
    badgeUrl: `${base}/vibesafe/badge/${slug}.svg`,
    markdown: `[![VibeSafe](${base}/vibesafe/badge/${slug}.svg)](${base}/vibesafe/status/${slug})`,
    projectName: project?.name ?? "",
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  if (!(await assertProjectOwner(auth.session.userId, projectId))) {
    return fail("프로젝트를 찾을 수 없습니다.", 404);
  }
  await disablePublicStatus(projectId);
  return ok({});
}

export const dynamic = "force-dynamic";
