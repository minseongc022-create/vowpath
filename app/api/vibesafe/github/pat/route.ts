import { z } from "zod";
import { recordEvent } from "@/vibesafe/lib/analytics";
import { connectWithPat, EncryptionRequiredError } from "@/vibesafe/lib/github/connection";
import { GithubError } from "@/vibesafe/lib/github/client";
import { enforceRateLimit, fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";

const schema = z.object({ token: z.string().trim().min(20).max(300) });

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const limited = await enforceRateLimit({ request, scope: "github-pat", limit: 10, windowSeconds: 600 });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("토큰 형식을 확인해주세요.");

  try {
    const connection = await connectWithPat(auth.session.userId, parsed.data.token);
    await recordEvent({
      name: "github_connected",
      userId: auth.session.userId,
      props: { authKind: "pat" },
    });
    return ok({ connection: { login: connection.login, authKind: connection.authKind } });
  } catch (error) {
    if (error instanceof EncryptionRequiredError) return fail(error.message, 503);
    if (error instanceof GithubError) return fail(error.message, error.status === 401 ? 401 : 502);
    console.error("[vibesafe] github pat connect failed:", (error as Error).message);
    return fail("GitHub 연결에 실패했습니다.", 502);
  }
}

export const dynamic = "force-dynamic";
