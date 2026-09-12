import { z } from "zod";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { detectProductionUrl } from "@/vibesafe/lib/github/detect-url";
import { resolveAccessToken } from "@/vibesafe/lib/github/connection";

/**
 * 저장소를 고르면 배포 주소를 대신 찾아준다.
 *
 * 사용자가 주소를 기억해 타이핑하는 대신, 우리가 찾아서 "이거 맞나요?"를
 * 묻는다. 빈 칸을 채우는 일과 맞는지 확인하는 일은 완주율이 다르다.
 */

const schema = z.object({
  owner: z.string().trim().min(1).max(100),
  repo: z.string().trim().min(1).max(100),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("저장소 정보를 확인해주세요.");

  let token: string;
  try {
    token = await resolveAccessToken(auth.session.userId);
  } catch {
    return fail("GitHub 연결을 먼저 해주세요.", 409);
  }

  const candidates = await detectProductionUrl(token, parsed.data.owner, parsed.data.repo);
  return ok({ candidates });
}

export const dynamic = "force-dynamic";
