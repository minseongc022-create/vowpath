import { z } from "zod";
import { recordEvent } from "@/vibesafe/lib/analytics";
import { createProject, listProjects } from "@/vibesafe/lib/projects";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { canCreateProject, planLimits } from "@/vibesafe/lib/usage";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  return ok({ projects: await listProjects(auth.session.userId) });
}

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  owner: z.string().trim().min(1).max(100),
  repo: z.string().trim().min(1).max(100),
  defaultBranch: z.string().trim().max(100).optional(),
  repoExternalId: z.string().max(40).nullable().optional(),
  isPrivate: z.boolean().optional(),
  productionUrl: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!(await canCreateProject(auth.session.userId))) {
    return fail(`무료 베타에서는 프로젝트를 ${planLimits().projects}개까지 만들 수 있습니다.`, 429);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("입력값을 확인해주세요.");

  const result = await createProject({
    userId: auth.session.userId,
    name: parsed.data.name,
    owner: parsed.data.owner,
    repo: parsed.data.repo,
    defaultBranch: parsed.data.defaultBranch ?? "main",
    repoExternalId: parsed.data.repoExternalId ?? null,
    isPrivate: parsed.data.isPrivate ?? false,
    productionUrl: parsed.data.productionUrl,
  });
  if (!result.ok) return fail(result.error);

  await recordEvent({
    name: "project_created",
    userId: auth.session.userId,
    projectId: result.projectId,
  });
  return ok({ projectId: result.projectId });
}

export const dynamic = "force-dynamic";
