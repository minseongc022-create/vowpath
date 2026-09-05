import { NextResponse } from "next/server";
import { kakaoLocalEnabled } from "@/dajeong/lib/kakao-local";
import { cultureDataKey, naverSearchCredentials, seoulOpenDataKey } from "@/dajeong/lib/discovery-sources";
import { bookingCallsConfigured } from "@/dajeong/lib/booking-call";
import { isDatabaseConfigured } from "@/dajeong/lib/db";
import { readSweepHeartbeat } from "@/dajeong/lib/sweep-heartbeat";

export const dynamic = "force-dynamic";

/**
 * "하루위드가 지금 어디까지 실제로 동작하는가"를 한 번에 보여주는 진단 엔드포인트.
 *
 * 이게 없어서 "알림 cron이 진짜 도는지", "푸시 키가 들어가 있는지" 같은 질문마다 추측을
 * 반복했다. 키 값은 절대 돌려주지 않고 설정 여부(참/거짓)만 말한다. 값이 없다는 사실 자체는
 * 비밀이 아니고, 오히려 몰라서 못 고치는 쪽이 문제였다.
 */
export async function GET() {
  const heartbeat = await readSweepHeartbeat();

  const features = {
    // 대화 이해도 — 없으면 규칙 기반 파서로 떨어진다.
    aiConversation: Boolean(process.env.OPENAI_API_KEY?.trim()),
    // 실제 장소 검색
    kakaoLocal: kakaoLocalEnabled(),
    googlePlaces: Boolean(
      process.env.GOOGLE_MAPS_API_KEY?.trim()
      || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
      || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim(),
    ),
    // 발견(요즘 뜨는 것)
    cultureData: Boolean(cultureDataKey()),
    seoulOpenData: Boolean(seoulOpenDataKey()),
    naverSearch: Boolean(naverSearchCredentials()),
    // 알림
    pushDelivery: Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()),
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    // 대신 전화 걸어 예약
    bookingCalls: bookingCallsConfigured(),
    // 저장소
    database: isDatabaseConfigured(),
  };

  const notificationSweep = heartbeat.state === "recorded"
    ? {
        state: heartbeat.state,
        lastRunAt: heartbeat.lastRunAt,
        secondsAgo: heartbeat.secondsAgo,
        // 60초 cron이 살아 있으면 마지막 실행이 2분 안쪽이어야 한다.
        looksAlive: heartbeat.secondsAgo <= 120,
        lastRun: heartbeat.detail,
      }
    : heartbeat.state === "never_ran"
      ? {
          state: heartbeat.state,
          looksAlive: false,
          // 표는 있는데 기록이 없다 — 외부 cron이 안 오고 있다는 결론이다.
          note: "기록할 자리는 있는데 스윕이 한 번도 안 돌았어. 외부 cron(cron-job.org)이 이 주소를 안 부르고 있다는 뜻이야.",
        }
      : { state: heartbeat.state, looksAlive: false, note: heartbeat.reason };

  const blocked = Object.entries(features).filter(([, on]) => !on).map(([name]) => name);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    features,
    notificationSweep,
    // 사람이 바로 읽을 수 있게 — 뭐가 꺼져 있는지가 이 엔드포인트의 존재 이유다.
    summary: blocked.length ? `설정이 비어 있는 기능: ${blocked.join(", ")}` : "모든 기능의 설정이 채워져 있어.",
  });
}
