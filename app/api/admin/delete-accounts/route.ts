import { NextResponse } from "next/server";
import { deleteAccountsByEmail } from "@/toss-shop/lib/store";

/**
 * 일회성 계정 삭제 — 감사 도구(list-accounts, 확인 끝나서 이미 지웠다)로
 * 찾아낸, 이제는 로그인이 막혀 무해하지만 남아 있는 옛 계정 두 개를
 * 정리하기 위해 만들었다. CRON_SECRET로만 연다.
 *
 * ★ effiroad.com 앞단(프록시/엣지)을 거치면 request.text()의 앞부분에
 * "Content-Type: ...\r\nContent-Length: ...\r\n\r\n" 같은 HTTP 헤더
 * 텍스트가 실제 JSON 앞에 그대로 섞여 들어오는 게 실제로 관찰됐다(진단
 * 응답의 rawPreview로 확인). 그래서 순수 request.json()이나 통짜
 * JSON.parse(raw)는 실패한다 — 첫 '{'부터 잘라내 파싱해서 우회한다.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer !== secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  const jsonStart = raw.indexOf("{");
  const jsonText = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
  let body: { emails?: string[] } = {};
  try {
    body = jsonText ? JSON.parse(jsonText) : {};
  } catch {
    // 그래도 파싱이 안 되면 아래에서 emails 배열이 필요합니다로 처리한다.
  }
  if (!Array.isArray(body.emails) || body.emails.length === 0) {
    return NextResponse.json(
      { error: "emails 배열이 필요합니다", rawLength: raw.length, rawPreview: raw.slice(0, 200) },
      { status: 400 },
    );
  }

  const result = await deleteAccountsByEmail(body.emails);
  return NextResponse.json({ ok: true, ...result });
}
