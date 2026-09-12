import { z } from "zod";
import { fail, ok, readJson, requireSession, enforceRateLimit } from "@/vibesafe/lib/http";
import { connectVercel, disconnectVercel, getVercelConnection, RollbackError } from "@/vibesafe/lib/repair/rollback";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const connection = await getVercelConnection(auth.session.userId);
  return ok({ connection: connection ? { login: connection.login } : null });
}

const schema = z.object({
  token: z.string().trim().min(20).max(300),
  teamId: z.string().trim().max(100).nullable().optional(),
});

/**
 * Vercel 연결 — 배포 되돌리기에만 쓴다.
 *
 * ★ 이 토큰은 강하다
 *
 * Vercel 토큰은 계정 전체를 다룰 수 있다. 우리는 배포 목록 조회와 롤백에만
 * 쓰지만, 토큰 자체의 권한을 우리가 좁힐 수는 없다. 그래서 (1) 암호화해 보관하고
 * (2) 화면에서 "되돌리기를 안 쓸 거면 연결하지 마세요"라고 분명히 말한다.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const limited = await enforceRateLimit({ request, scope: "vercel-connect", limit: 10, windowSeconds: 600 });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("토큰을 확인해주세요.");

  try {
    const result = await connectVercel(auth.session.userId, parsed.data.token, parsed.data.teamId ?? null);
    return ok({ connection: result });
  } catch (error) {
    if (error instanceof RollbackError) return fail(error.message, 400);
    console.error("[vibesafe] vercel connect failed:", (error as Error).message);
    return fail("Vercel 연결에 실패했습니다.", 502);
  }
}

export async function DELETE() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  await disconnectVercel(auth.session.userId);
  return ok({});
}

export const dynamic = "force-dynamic";
