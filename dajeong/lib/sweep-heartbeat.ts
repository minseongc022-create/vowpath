import "server-only";

import { isDatabaseConfigured, prisma } from "./db";

/**
 * 알림 스윕이 "실제로 돌고 있는가"를 남기는 기록.
 *
 * 60초마다 스윕을 불러주는 건 이 저장소 밖에 있는 외부 cron이다. 그래서 코드만 봐서는 운영에서
 * 진짜 돌고 있는지 알 방법이 없었다 — 매번 추측만 했다. 스윕이 한 번 돌 때마다 시각을 남겨두면
 * 진단 화면에서 "마지막으로 언제 돌았는지"를 그냥 보면 된다.
 *
 * 실패해도 조용히 넘어간다. 이 기록 하나 때문에 실제 알림 발송이 멈추면 본말이 전도된다.
 */

export type SweepHeartbeat =
  | {
      state: "recorded";
      lastRunAt: string;
      detail?: Record<string, unknown>;
      /** 마지막 실행이 몇 초 전이었는지. 60초 cron이 살아 있으면 보통 60 언저리다. */
      secondsAgo: number;
    }
  /** 기록할 자리는 있는데 아직 한 번도 안 돌았다 — cron이 안 오고 있다는 뜻이다. */
  | { state: "never_ran" }
  /** 표가 아직 없거나 DB를 못 읽었다 — cron 문제인지 아닌지 여기선 알 수 없다. */
  | { state: "unavailable"; reason: string };

const KEY = "notifications";

export async function recordSweepRun(detail: Record<string, unknown>): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const now = new Date();
    await prisma.dajeongSweepHeartbeat.upsert({
      where: { key: KEY },
      create: { key: KEY, lastRunAt: now, detail: detail as object },
      update: { lastRunAt: now, detail: detail as object },
    });
  } catch {
    // 표가 아직 없거나(마이그레이션 전) DB가 잠깐 흔들려도 알림 자체는 계속 나가야 한다.
  }
}

export async function readSweepHeartbeat(): Promise<SweepHeartbeat> {
  if (!isDatabaseConfigured()) return { state: "unavailable", reason: "운영 DB가 연결돼 있지 않아 기록을 남길 수 없어." };
  try {
    const row = await prisma.dajeongSweepHeartbeat.findUnique({ where: { key: KEY } });
    // 조회가 성공했는데 행이 없다 = 표는 있고 스윕이 한 번도 안 돌았다. 이건 결론이 난 상태다.
    if (!row) return { state: "never_ran" };
    return {
      state: "recorded",
      lastRunAt: row.lastRunAt.toISOString(),
      detail: (row.detail ?? undefined) as Record<string, unknown> | undefined,
      secondsAgo: Math.round((Date.now() - row.lastRunAt.getTime()) / 1000),
    };
  } catch (error) {
    // 표가 없으면(마이그레이션 전) 여기로 온다 — cron이 도는지 아닌지는 아직 알 수 없다.
    return {
      state: "unavailable",
      reason: error instanceof Error && /relation|table|does not exist/i.test(error.message)
        ? "기록용 표가 아직 없어(prisma db push 필요). 이것만으로는 cron이 도는지 알 수 없어."
        : "기록을 읽지 못했어.",
    };
  }
}
