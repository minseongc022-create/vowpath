import { NextResponse } from "next/server";
import {
  autoRegisterReturnLocations,
  checkOrderingReadiness,
  getPipelineFunnel,
  listMerchantIds,
  merchantHasTossApi,
  runAutopilotForMerchant,
  runStoreOperations,
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
 * ★ 실측으로 드러난 결함 — 이 심박은 돈을 안 벌고 있었다
 *
 * 종전 심박은 발굴·발주·알림만 했다. **후보를 만들고 토스에 등록하는 단계가
 * 통째로 빠져 있었다.** 그래서 발굴은 28개까지 쌓였는데 등록은 0개였고,
 * 사장님이 「지금 돌려」를 직접 누를 때만 상품이 올라갔다. 사람이 눌러야
 * 도는 건 자동화가 아니다.
 *
 * 이제 전체 사이클(runAutopilotForMerchant)을 돌린다. 그 안에 발굴·후보
 * 생성·등록·주문 감지·발주·알림이 전부 들어 있으므로, 여기서는 그것이
 * 다루지 않는 것(반품지 등록, 가격 운영)만 덧붙인다.
 *
 * ★ 60초 안에 끝내야 한다
 *
 * Hobby 플랜 함수는 60초에 강제 종료된다. 중간에 죽으면 그때까지 한 일은
 * 저장돼 있지만 뒷 가맹점은 통째로 건너뛰어진다. 그래서 마감시각을 두고,
 * 남은 시간이 모자라면 무거운 작업을 아예 시작하지 않는다 — 반쯤 하다
 * 잘리는 것보다 다음 심박으로 미루는 게 낫다.
 */
export const maxDuration = 60;

/** 강제 종료(60초)보다 앞서 멈춘다 — 응답을 돌려줄 여유까지 남긴다 */
const DEADLINE_MS = 48_000;
/** 한 가맹점의 전체 사이클을 시작하려면 최소 이만큼은 남아 있어야 한다 */
const CYCLE_MIN_MS = 18_000;
/** 뒤따르는 가벼운 작업(반품지·가격)을 시작할 최소 여유 */
const TAIL_MIN_MS = 6_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // 비밀값이 없으면 아무나 부를 수 있는 상태다. 그럴 바엔 닫아둔다 —
  // 이 엔드포인트는 외부 API를 태우고 문자를 보낸다.
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

type MerchantResult = {
  merchantId: string;
  skipped?: string;
  draftsCreated?: number;
  published?: number;
  /** 이번 심박에 실제로 토스에 올린 건수 */
  listedNow?: number;
  /** 안 올라간 초안의 사유별 집계 */
  publishSkips?: Record<string, number>;
  /** 목표까지의 전략 진단 — 지금 무엇을 해야 하는가 */
  strategy?: { constraint: string; headline: string; priority: string };
  returnLocationsRegistered?: number;
  priceCuts?: number;
  hidden?: number;
  funnel?: Awaited<ReturnType<typeof getPipelineFunnel>>;
  errors?: string[];
  timings?: { discoveryMs: number; picksMs: number; cycleMs: number };
  error?: string;
};

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const msLeft = () => DEADLINE_MS - (Date.now() - startedAt);

  // 발주 준비 점검은 **가맹점마다가 아니라 한 번만** 한다. 도매꾹 계정은
  // 전체가 공유하는 하나라, 가맹점 수만큼 로그인하면 같은 결과를 얻으려고
  // 실패만 몇 배로 쌓게 된다 — 그게 계정 잠금으로 이어진다.
  // 읽기 전용이라 아무것도 사지 않는다.
  let ordering: Awaited<ReturnType<typeof checkOrderingReadiness>> | undefined;
  try {
    ordering = await checkOrderingReadiness();
  } catch (e) {
    console.warn("[pulse] 발주 준비 점검 실패", e);
  }

  const merchantIds = await listMerchantIds();
  const results: MerchantResult[] = [];

  for (const merchantId of merchantIds) {
    // 토스 연동이 없는 가맹점(데모 등)에 시간을 쓰면, 정작 돈이 걸린
    // 가맹점이 마감시각에 밀려 건너뛰어진다.
    if (!(await merchantHasTossApi(merchantId))) {
      results.push({ merchantId, skipped: "토스 API 미연동" });
      continue;
    }
    if (msLeft() < CYCLE_MIN_MS) {
      results.push({ merchantId, skipped: "시간 부족 — 다음 심박에서 처리" });
      continue;
    }

    const r: MerchantResult = { merchantId };
    try {
      // 전체 사이클 — 발굴부터 후보 생성·등록·주문 감지·발주·알림까지.
      //
      // 발굴 예산을 줄인다: 크론은 여러 가맹점을 60초 안에 다 돌아야 해서
      // 발굴에 20초를 쓰면 정작 등록까지 못 간다. 발굴은 사이클마다 조금씩
      // 이어서 하는 구조라 한 번에 적게 봐도 결국 전체를 다 훑는다.
      const report = await runAutopilotForMerchant(merchantId, {
        discoverySize: 10,
        discoveryBudgetMs: 8_000,
        // 초안 생성은 AI 호출이 들어가 건당 수 초가 걸린다. 마감시각을
        // 넘기면 만들던 것까지만 하고 정상 종료해 **저장은 되게** 한다 —
        // 함수가 강제 종료되면 이번 사이클 작업이 통째로 날아간다.
        deadlineAt: startedAt + DEADLINE_MS - TAIL_MIN_MS,
      });
      r.timings = report.stageTimings;
      r.draftsCreated = report.stats.draftsCreated;
      // stats.published는 사이클 **중간에** 센 값이라 이번에 올린 건 안 잡힌다.
      // 이번 심박의 실제 등록 성과는 draftsExecuted가 들고 있다.
      r.published = report.stats.published;
      r.listedNow = report.stats.draftsExecuted;
      if (report.publishSkips && Object.keys(report.publishSkips).length) {
        r.publishSkips = report.publishSkips;
      }
      if (report.errors.length) r.errors = report.errors.slice(0, 3);
    } catch (e) {
      r.error = e instanceof Error ? e.message : "CYCLE_FAIL";
    }

    // 반품지 등록 — 이게 풀려야 그 공급처 상품들이 마진 차감 없이 팔린다.
    if (msLeft() > TAIL_MIN_MS) {
      try {
        r.returnLocationsRegistered = (await autoRegisterReturnLocations(merchantId)).registered;
      } catch (e) {
        console.warn("[pulse] 반품지 자동 등록 실패", e);
      }
    }

    // 올린 상품 손보기 — 안 팔리면 내리고, 바닥에서도 안 팔리면 숨긴다.
    if (msLeft() > TAIL_MIN_MS) {
      try {
        const ops = await runStoreOperations(merchantId);
        r.priceCuts = ops.cuts;
        r.hidden = ops.hides;
      } catch (e) {
        console.warn("[pulse] 상점 운영 실패", e);
      }
    }

    // 파이프라인이 어디서 멈춰 있는지 — 매출 0일 때 원인을 짚는 유일한 근거
    try {
      r.funnel = await getPipelineFunnel(merchantId);
      // 숫자만 보면 "그래서 뭘 해야 하는가"가 안 나온다. 목표에서 역산한
      // 기준과 대조해 지금 막힌 곳 하나와 할 일을 함께 남긴다.
      if (r.funnel?.strategy) {
        r.strategy = {
          constraint: r.funnel.strategy.constraint,
          headline: r.funnel.strategy.headline,
          priority: r.funnel.strategy.priority,
        };
      }
    } catch (e) {
      console.warn("[pulse] 파이프라인 집계 실패", e);
    }

    results.push(r);
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    ordering,
    results,
  });
}
