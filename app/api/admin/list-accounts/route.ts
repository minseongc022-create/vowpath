import { NextResponse } from "next/server";
import { listAccountsForAudit } from "@/toss-shop/lib/store";

/**
 * 계정 감사 — 회원가입이 한동안 누구에게나 열려 있던 사고를 확인하기 위한
 * 일회성 조회 통로. CRON_SECRET로만 연다(사람이 직접 로그인해서 볼 수
 * 없는 상태이므로, 이미 GitHub Actions에 있는 비밀키를 재사용한다).
 *
 * 비밀번호 해시를 포함한 어떤 민감정보도 내보내지 않는다 — 이메일·이름·
 * 가입시각·가맹점ID만.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer !== secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listAccountsForAudit();
  return NextResponse.json({ ok: true, count: accounts.length, accounts });
}
