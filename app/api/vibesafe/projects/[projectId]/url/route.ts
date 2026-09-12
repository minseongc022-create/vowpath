import { z } from "zod";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { updateProductionUrl } from "@/vibesafe/lib/projects";

const schema = z.object({ url: z.string().trim().min(1).max(2000) });

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { projectId } = await context.params;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("주소를 확인해주세요.");

  const result = await updateProductionUrl(auth.session.userId, projectId, parsed.data.url);
  if (!result.ok) return fail(result.error);
  return ok({ url: result.url });
}

export const dynamic = "force-dynamic";
