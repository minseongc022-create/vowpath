import { z } from "zod";
import { enforceRateLimit, fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { validateServiceUrl } from "@/vibesafe/lib/url-safety";

/**
 * 등록하려는 주소가 실제로 응답하는지 미리 확인한다.
 *
 * ★ 왜 필요한가
 *
 * 이 확인 없이는 사용자가 [연결하고 바로 시작]을 누른 뒤 저장소 분석까지
 * 1~2분을 기다리고 나서야 주소가 틀렸다는 걸 안다. 자동 감지가 틀렸거나
 * 주소를 잘못 입력한 경우 그 자리에서 바로 알려준다.
 *
 * ★ 이건 검사가 아니라 힌트다 — 절대 막지 않는다
 *
 * HEAD 요청을 막아둔 서버, 봇 차단, 일시적 배포 중처럼 실제로는 멀쩡한데
 * 이 가벼운 확인만 실패하는 경우가 흔하다. 그래서 이 결과로 진행을
 * 막지 않는다 — 화면에 경고만 보여주고 사용자가 그대로 진행할 수 있다.
 */

const schema = z.object({ url: z.string().trim().min(1).max(2000) });

const TIMEOUT_MS = 6_000;

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  // 이 라우트는 detect-url과 달리 GitHub가 아니라 **사용자가 준 임의의
  // 외부 주소**를 서버가 대신 요청한다 — 반복 호출로 남의 서버를 두드리는
  // 중계로 쓰이지 않게 속도를 제한한다.
  const limited = await enforceRateLimit({
    request, scope: "check-url", limit: 20, windowSeconds: 3600, identity: auth.session.userId,
  });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("주소를 확인해주세요.");

  const check = validateServiceUrl(parsed.data.url);
  if (!check.ok) return ok({ reachable: false, reason: check.error });

  try {
    const res = await fetch(check.url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "VibeSafe-SetupCheck/1.0 (+https://effiroad.com/vibesafe)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 5xx는 "그 자리에 뭔가 있지만 지금 오류를 낸다"는 뜻이라 별도로 알려준다.
    // 4xx는 로그인 필요·경로 없음 등 흔한 상황이라 도달 자체는 문제없다고 본다.
    if (res.status >= 500) {
      return ok({ reachable: false, reason: `주소는 찾았지만 서버가 오류를 냅니다 (${res.status}).` });
    }
    return ok({ reachable: true });
  } catch {
    return ok({ reachable: false, reason: "이 주소로 접속할 수 없었습니다." });
  }
}

export const dynamic = "force-dynamic";
