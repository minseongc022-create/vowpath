import "server-only";

import { prisma, isDatabaseConfigured } from "./db";

/**
 * 제품 분석 이벤트.
 *
 * 우리가 유료화 전에 답해야 하는 질문은 다섯 개다.
 *   1. 가입한 사람 중 몇 %가 실제 앱을 연결하는가          (signup → github_connected)
 *   2. 몇 %가 첫 검사를 완료하는가                          (first_test_started → first_test_passed/failed)
 *   3. 실제 문제가 얼마나 자주 발견되는가                   (incident_detected / 검사 횟수)
 *   4. 반복해서 돌아오는가                                   (return_visit)
 *   5. 어떤 기능에서 가장 많이 깨지는가                      (incident_detected.props.flowKey)
 * 이벤트 이름을 바꾸면 위 질문의 과거 데이터가 끊긴다 — 새 이름을 추가할 것.
 *
 * ★ 절대 넣지 않는 것: 이메일, 토큰, URL 전문, 저장소 내용.
 *   props에는 식별자와 분류값만 넣는다.
 */
export const VIBESAFE_EVENTS = [
  "signup_completed",
  "project_created",
  "github_connected",
  "analysis_completed",
  "flow_generated",
  "flow_approved",
  "first_test_started",
  "first_test_passed",
  "first_test_failed",
  "return_visit",
  "incident_detected",
  "notification_opened",
] as const;

export type VibesafeEventName = (typeof VIBESAFE_EVENTS)[number];

type EventInput = {
  name: VibesafeEventName;
  userId?: string | null;
  projectId?: string | null;
  props?: Record<string, string | number | boolean | null>;
};

/**
 * 이벤트 기록은 **절대 요청을 실패시키지 않는다**. 분석이 안 되는 것보다
 * 가입이 안 되는 게 훨씬 나쁘다.
 */
export async function recordEvent(input: EventInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await prisma.vibesafeAnalyticsEvent.create({
      data: {
        name: input.name,
        userId: input.userId ?? null,
        projectId: input.projectId ?? null,
        props: input.props ?? undefined,
      },
    });
  } catch (error) {
    console.error("[vibesafe] analytics event failed:", (error as Error).message);
  }
}

/**
 * "이 사용자에게 이 이벤트가 처음인가?" — first_test_passed 같은 1회성 지표는
 * 중복 기록되면 퍼널이 망가진다.
 */
export async function recordFirstTimeEvent(input: EventInput & { userId: string }): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const existing = await prisma.vibesafeAnalyticsEvent.findFirst({
      where: { name: input.name, userId: input.userId },
      select: { id: true },
    });
    if (existing) return;
  } catch {
    // 조회가 실패하면 그냥 기록한다 — 없는 것보단 중복이 낫다.
  }
  await recordEvent(input);
}

/** 재방문 판정: 마지막 이벤트가 6시간 이상 전이면 다시 온 것으로 본다. */
export async function recordReturnVisit(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const last = await prisma.vibesafeAnalyticsEvent.findFirst({
      where: { userId, name: "return_visit" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    if (last && last.createdAt.getTime() > sixHoursAgo) return;
    await recordEvent({ name: "return_visit", userId });
  } catch (error) {
    console.error("[vibesafe] return visit failed:", (error as Error).message);
  }
}
