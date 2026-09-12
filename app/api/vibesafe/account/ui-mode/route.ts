import { z } from "zod";
import { fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { UI_MODES } from "@/vibesafe/lib/ui-mode";
import { getUiModePreference, setUiMode } from "@/vibesafe/lib/user-prefs";

/**
 * 화면 취향 저장.
 *
 * ★ 값은 사용자가 보낸 것만 들어온다
 *
 * 저장소를 읽고 추론한 값이 여기로 들어오는 경로는 없다. 온보딩 질문과 설정
 * 토글, 두 군데서만 호출된다.
 */

const schema = z.object({ mode: z.enum(["simple", "expert"]) });

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  return ok({ preference: await getUiModePreference(auth.session.userId) });
}

export async function PATCH(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return fail(`모드는 ${UI_MODES.join(" 또는 ")} 중 하나여야 합니다.`);
  }

  const mode = await setUiMode(auth.session.userId, parsed.data.mode);
  return ok({ mode });
}

export const dynamic = "force-dynamic";
