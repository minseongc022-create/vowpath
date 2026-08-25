import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getJarvisChatContext } from "@/toss-shop/lib/store";

/**
 * 콘솔 화면이 답해야 할 세 가지만 돌려준다:
 * 자비스가 돌고 있나 · 사장님이 뭘 해야 하나 · 얼마나 벌었나.
 *
 * 대화창이 쓰는 것과 **같은 요약**을 쓴다 — 화면과 자비스의 말이 어긋나면
 * 어느 쪽을 믿어야 할지 알 수 없게 된다.
 */
export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await getJarvisChatContext(session.merchantId);
  return NextResponse.json({ status });
}
