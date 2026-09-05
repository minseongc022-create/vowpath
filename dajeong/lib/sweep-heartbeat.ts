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

export type SweepHeartbeat = {
  lastRunAt: string;
  detail?: Record<string, unknown>;
  /** 마지막 실행이 몇 초 전이었는지. 60초 cron이 살아 있으면 보통 60 언저리다. */
  secondsAgo: number;
};

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

export async function readSweepHeartbeat(): Promise<SweepHeartbeat | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const row = await prisma.dajeongSweepHeartbeat.findUnique({ where: { key: KEY } });
    if (!row) return null;
    return {
      lastRunAt: row.lastRunAt.toISOString(),
      detail: (row.detail ?? undefined) as Record<string, unknown> | undefined,
      secondsAgo: Math.round((Date.now() - row.lastRunAt.getTime()) / 1000),
    };
  } catch {
    return null;
  }
}
