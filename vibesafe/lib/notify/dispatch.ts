import "server-only";

import { Prisma } from "@prisma/client";
import { isEmailConfigured, sendEmail } from "@/lib/send-email";
import { prisma } from "../db";

/**
 * 알림.
 *
 * ★ 알림 폭탄을 막는 세 겹
 *
 * 1) 장애 1건 = 알림 1건. 같은 흐름이 30분 동안 6번 실패해도 Incident 행은
 *    하나고, 알림도 하나다.
 * 2) (dedupeKey, channel) 유니크 — 워커가 재시도해서 같은 완료 처리가 두 번
 *    돌아도 두 번째 insert가 DB에서 튕긴다.
 * 3) 쿨다운 — 같은 흐름이 붙었다 끊겼다 반복(flapping)할 때, 최근에 보낸 게
 *    있으면 이번 건은 앱 안에만 남기고 이메일은 보내지 않는다.
 *
 * 알림이 시끄러우면 사람은 알림을 끈다. 그러면 정작 진짜 장애 때 아무도 안 본다.
 */

const FLAP_COOLDOWN_MS = 30 * 60 * 1000;

export type NotifyKind = "regression" | "recovered" | "analysis_completed";

type NotifyInput = {
  userId: string;
  projectId: string | null;
  incidentId: string | null;
  kind: NotifyKind;
  title: string;
  body: string;
  dedupeKey: string;
  /** 이메일까지 보낼지. 앱 내부 알림은 항상 남긴다. */
  email: boolean;
  emailTo?: string | null;
};

async function createNotification(input: NotifyInput, channel: "inapp" | "email") {
  try {
    return await prisma.vibesafeNotification.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        incidentId: input.incidentId,
        kind: input.kind,
        channel,
        title: input.title,
        body: input.body,
        dedupeKey: input.dedupeKey,
      },
      select: { id: true },
    });
  } catch (error) {
    // 이미 같은 알림이 있다 — 정상적인 중복 방지다.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }
}

export async function notify(input: NotifyInput): Promise<void> {
  await createNotification(input, "inapp");

  if (!input.email || !input.emailTo) return;

  const emailRow = await createNotification(input, "email");
  if (!emailRow) return; // 이미 보냈다

  if (!isEmailConfigured() && process.env.NODE_ENV === "production") {
    await prisma.vibesafeNotification.update({
      where: { id: emailRow.id },
      data: { failedAt: new Date() },
    });
    return;
  }

  const result = await sendEmail({
    to: input.emailTo,
    subject: input.title,
    text: input.body,
    devLogLabel: "vibesafe-notification",
  });
  await prisma.vibesafeNotification.update({
    where: { id: emailRow.id },
    data: result.ok ? { sentAt: new Date() } : { failedAt: new Date() },
  });
}

/**
 * 최근에 같은 흐름으로 알림을 보냈는지 — flapping 억제.
 * 장애 자체는 기록하되 이메일만 쉰다.
 */
export async function recentlyNotified(projectId: string, flowKey: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - FLAP_COOLDOWN_MS);
  const recent = await prisma.vibesafeIncident.findFirst({
    where: { projectId, flowKey, lastNotifiedAt: { gte: cutoff } },
    select: { id: true },
  });
  return recent !== null;
}

export async function markNotified(incidentId: string): Promise<void> {
  await prisma.vibesafeIncident.update({
    where: { id: incidentId },
    data: { lastNotifiedAt: new Date() },
  });
}
