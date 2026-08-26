import { NextResponse } from "next/server";
import {
  dispatchOwnerTodoAlerts,
  listMerchantIds,
  runDiscoveryForMerchant,
} from "@/toss-shop/lib/store";

/**
 * 자비스 심박 — 밖에서 10분마다 깨워준다.
 *
 * ★ 왜 Vercel 크론이 아닌가
 *
 * 이 프로젝트는 Vercel Hobby 플랜이고, Hobby의 크론은 **하루 한 번**이 한계다.
 * 그런데 사장님이 필요한 건 "필수 작업이 생기면 10분마다 다시 알림"이다.
 * 하루 한 번으로는 발송기한(그리고 거기 걸린 수수료 0% 인센티브)을 못 지킨다.
 * 그래서 GitHub Actions가 이 주소를 10분마다 두드린다 — 무료이고, 플랜을
 * 올리지 않아도 되고, 스케줄이 저장소 안에 코드로 남는다.
 *
 * ★ 왜 발굴까지 여기서 도나
 *
 * 사장님이 사이트에 안 들어와도 상품은 계속 쌓여야 한다. 사람이 버튼을 눌러야
 * 도는 자동화는 자동화가 아니다.
 */
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // 비밀값이 없으면 아무나 부를 수 있는 상태다. 그럴 바엔 닫아둔다 —
  // 이 엔드포인트는 외부 API를 태우고 문자를 보낸다.
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantIds = await listMerchantIds();
  // 진단값을 그대로 싣는다. "찾은 게 0개"만 보면 팔 물건이 없는 건지
  // 연동이 끊긴 건지 구분이 안 되고, 그러면 원인을 영원히 못 찾는다.
  const results: Array<{
    merchantId: string;
    alertsSent: number;
    scanned?: number;
    matched?: number;
    added?: number;
    apiSilent?: boolean;
    apiError?: { code: string; message: string };
    configured?: boolean;
    itemFields?: string[];
    costSamples?: number[];
    error?: string;
  }> = [];

  for (const merchantId of merchantIds) {
    try {
      // 알림이 먼저다. 발굴이 시간을 다 써서 알림을 못 보내는 일이 없어야 한다.
      const alerts = await dispatchOwnerTodoAlerts(merchantId);
      let diag: Partial<Awaited<ReturnType<typeof runDiscoveryForMerchant>>> = {};
      try {
        diag = await runDiscoveryForMerchant(merchantId, { size: 12, budgetMs: 20_000 });
      } catch (e) {
        // 발굴 실패는 알림 결과를 무효로 만들지 않는다
        console.warn("[pulse] 발굴 실패", e);
      }
      results.push({
        merchantId,
        alertsSent: alerts.sent,
        scanned: diag.scanned,
        matched: diag.found,
        added: diag.added,
        apiSilent: diag.apiSilent,
        apiError: diag.apiError,
        configured: diag.configured,
        itemFields: diag.itemFields,
        costSamples: diag.costSamples,
      });
    } catch (e) {
      results.push({
        merchantId,
        alertsSent: 0,
        error: e instanceof Error ? e.message : "PULSE_FAIL",
      });
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results });
}
