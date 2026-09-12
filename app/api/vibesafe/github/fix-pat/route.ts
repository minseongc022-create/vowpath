import { z } from "zod";
import { GithubError } from "@/vibesafe/lib/github/client";
import { connectWriteWithPat, disconnectWrite } from "@/vibesafe/lib/github/write-connection";
import { enforceRateLimit, fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";

const schema = z.object({ token: z.string().trim().min(20).max(300) });

/**
 * 쓰기 권한 토큰으로 연결.
 *
 * 화면에서 필요한 권한을 정확히 안내한다 — fine-grained PAT의
 * Contents: Read and write + Pull requests: Read and write.
 * 그 이상은 필요 없고, 요구하지도 않는다.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const limited = await enforceRateLimit({ request, scope: "github-fix-pat", limit: 10, windowSeconds: 600 });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("토큰 형식을 확인해주세요.");

  try {
    const connection = await connectWriteWithPat(auth.session.userId, parsed.data.token);
    return ok({ connection: { login: connection.login } });
  } catch (error) {
    if (error instanceof GithubError) return fail(error.message, 502);
    if ((error as Error).message === "ENCRYPTION_NOT_CONFIGURED") {
      return fail("서버에 암호화 키가 없어 토큰을 저장할 수 없습니다.", 503);
    }
    console.error("[vibesafe] fix pat failed:", (error as Error).message);
    return fail("연결에 실패했습니다.", 502);
  }
}

export async function DELETE() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  await disconnectWrite(auth.session.userId);
  return ok({});
}

export const dynamic = "force-dynamic";
