import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getJarvisActivity } from "@/toss-shop/lib/store";

/**
 * 자비스가 지금 뭘 하는 중인지.
 *
 * 화면이 이걸 1.5초마다 물어보고 "도매꾹 구석구석 뒤지는 중 · 무선 이어폰
 * (12/24)"처럼 띄운다. 눌렀는데 아무 반응이 없으면 사장님은 안 되는 줄 알고
 * 다시 누르게 되고, 그러면 같은 일이 두 번 돈다.
 */
export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ activity: await getJarvisActivity(session.merchantId) });
}
