import { z } from "zod";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { deleteTestCredential, saveTestCredential } from "@/vibesafe/lib/projects";

const schema = z.object({
  username: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("아이디와 비밀번호를 확인해주세요.");

  const result = await saveTestCredential(
    auth.session.userId,
    projectId,
    parsed.data.username,
    parsed.data.password,
  );
  if (!result.ok) return fail(result.error, 400);
  return ok({});
}

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;
  const done = await deleteTestCredential(auth.session.userId, projectId);
  if (!done) return fail("프로젝트를 찾을 수 없습니다.", 404);
  return ok({});
}

export const dynamic = "force-dynamic";
