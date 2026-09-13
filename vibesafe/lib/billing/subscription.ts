import "server-only";

import { Prisma } from "@prisma/client";
import { decryptSecret, encryptSecret, randomToken } from "../crypto";
import { prisma } from "../db";
import { recordEvent } from "../analytics";
import { chargeBilling, issueBillingKey, TossBillingError } from "./toss";
import { getPlan, PLANS, type PlanKey } from "./plans";

/**
 * 구독 하나의 생애주기.
 *
 *   카드 등록 → 첫 결제 → (매달) 갱신 결제 → 해지 또는 결제 실패 강등
 *
 * ★ User.planKey를 언제 바꾸는가
 *
 * "지금 얼마의 한도를 쓸 수 있는가"(User.planKey)와 "구독이 어떤 상태인가"
 * (Subscription.status)를 다른 트랜잭션에서 따로 바꾸면, 결제는 성공했는데
 * 한도는 그대로인 순간이 생긴다. 그래서 이 파일의 모든 상태 전이는
 * `$transaction` 안에서 둘을 같이 바꾼다.
 */

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
/** 결제가 실패해도 이 횟수까지는 서비스를 끊지 않고 다시 시도한다. */
export const MAX_DUNNING_ATTEMPTS = 3;

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SubscriptionError";
  }
}

function orderIdFor(subscriptionId: string, periodStart: Date): string {
  // ★ 실기동 검증에서 실제로 걸린 버그: 처음엔 "YYYYMM"으로 만들었다.
  //
  // 매달 1일에 가입한 사람은 30일 뒤 갱신일도 여전히 같은 달이다(1월 1일
  // 가입 → 1월 31일 갱신). 그러면 이번 결제와 다음 결제가 같은 orderId를
  // 갖게 되고, 유니크 제약이 **정상적인 두 번째 결제**를 "중복 시도"로
  // 착각해 막아버린다. 심지어 토스에는 이미 돈이 나간 뒤라, 실제로는 결제가
  // 성공했는데 우리 쪽만 실패로 기록하는 최악의 상황이 된다.
  //
  // periodStart를 밀리초 단위로 그대로 쓰면 이 문제가 없다. 같은 결제
  // 주기의 재시도(실패 후 다음날 다시 시도)는 periodStart가 안 바뀌므로
  // 여전히 같은 orderId — 그래서 이중 청구 방지는 그대로 유지된다. 다음
  // 주기로 넘어가면 periodStart가 정확히 30일만큼 밀리므로 반드시 다른
  // orderId가 된다.
  return `vibesafe_sub_${subscriptionId}_${periodStart.getTime()}`;
}

/** 계정에 구독 행이 아직 없으면 만들어 customerKey를 내준다. */
export async function ensureCustomerKey(userId: string): Promise<string> {
  const existing = await prisma.vibesafeSubscription.findUnique({
    where: { userId },
    select: { customerKey: true },
  });
  if (existing) return existing.customerKey;

  // 토스 customerKey 규칙: 영문/숫자/-_= 만 허용. 이메일이나 내부 id를
  // 그대로 쓰지 않는 이유는, 그 값이 로그·URL에 노출됐을 때 사용자를
  // 특정할 수 있는 정보이기 때문이다. 무작위 값으로 만든다.
  const customerKey = `vs_${randomToken(16)}`;
  await prisma.vibesafeSubscription.create({
    data: { userId, customerKey, planKey: "pro", status: "incomplete" },
  });
  return customerKey;
}

/**
 * 카드 등록이 끝난 뒤(토스 successUrl 콜백) 호출된다.
 * authKey를 billingKey로 바꾸고, 그 자리에서 첫 달 요금을 청구한다.
 */
export async function completeBillingRegistration(params: {
  userId: string;
  authKey: string;
  customerKey: string;
  customerEmail?: string;
}): Promise<{ subscriptionId: string }> {
  const sub = await prisma.vibesafeSubscription.findUnique({
    where: { userId: params.userId },
  });
  if (!sub || sub.customerKey !== params.customerKey) {
    throw new SubscriptionError("구독 정보를 찾을 수 없습니다. 다시 시도해주세요.", "NOT_FOUND");
  }

  const issued = await issueBillingKey({ authKey: params.authKey, customerKey: params.customerKey });

  const plan = getPlan(sub.planKey);
  const now = new Date();
  const periodStart = now;
  const periodEnd = new Date(now.getTime() + PERIOD_MS);
  const orderId = orderIdFor(sub.id, periodStart);

  await prisma.vibesafeSubscription.update({
    where: { id: sub.id },
    data: {
      billingKeyCipher: encryptSecret(issued.billingKey),
      cardCompany: issued.cardCompany,
      cardNumberMasked: issued.cardNumberMasked,
    },
  });

  // 카드 등록은 됐지만 결제가 이 자리에서 실패할 수 있다(한도초과 등).
  // 그러면 구독은 여전히 incomplete로 남고, 사용자는 결제 화면에서
  // 실패 사유를 보고 다른 카드로 다시 시도할 수 있다.
  try {
    const charge = await chargeBilling({
      billingKey: issued.billingKey,
      customerKey: sub.customerKey,
      amount: plan.priceKrw,
      orderId,
      orderName: `VibeSafe ${plan.title} 구독`,
      customerEmail: params.customerEmail,
    });

    await activateAfterCharge({
      subscriptionId: sub.id,
      userId: sub.userId,
      planKey: sub.planKey,
      orderId,
      amount: plan.priceKrw,
      periodStart,
      periodEnd,
      paymentKey: charge.paymentKey,
    });
  } catch (error) {
    const message = error instanceof TossBillingError ? error.message : "결제에 실패했습니다.";
    await recordFailedCharge({
      subscriptionId: sub.id,
      userId: sub.userId,
      orderId,
      amount: plan.priceKrw,
      periodStart,
      periodEnd,
      failReason: message,
    });
    throw new SubscriptionError(message, "FIRST_CHARGE_FAILED");
  }

  return { subscriptionId: sub.id };
}

/**
 * ★ 알려진 한계
 *
 * 이 시점에서는 이미 토스에 결제가 승인된 뒤다(chargeBilling이 끝났다).
 * 여기서 DB 쓰기가 실패하면(예: DB 연결 문제) 돈은 나갔는데 우리 기록은
 * 없는 상태가 될 수 있다. orderId를 결정론적으로 만들어 둔 덕분에 다음
 * 재시도가 같은 orderId로 다시 청구를 시도하면 토스가 "이미 처리된
 * 주문"이라고 응답할 가능성이 높지만, 그 응답을 여기서 확인하고 화해
 * (reconcile)시키는 로직은 아직 없다. 결제 승인 후 실패가 실제로 발생하면
 * 토스 대시보드의 결제 내역과 우리 DB를 수동으로 대조해야 한다.
 */
async function activateAfterCharge(params: {
  subscriptionId: string;
  userId: string;
  planKey: string;
  orderId: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  paymentKey: string;
}): Promise<void> {
  await prisma.$transaction([
    prisma.vibesafeBillingCharge.create({
      data: {
        subscriptionId: params.subscriptionId,
        userId: params.userId,
        status: "succeeded",
        amount: params.amount,
        orderId: params.orderId,
        tossPaymentKey: params.paymentKey,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      },
    }),
    prisma.vibesafeSubscription.update({
      where: { id: params.subscriptionId },
      data: {
        status: "active",
        currentPeriodStart: params.periodStart,
        currentPeriodEnd: params.periodEnd,
        failedAttempts: 0,
        lastFailureReason: null,
      },
    }),
    // ★ 여기가 usage.ts가 읽는 값을 실제로 바꾸는 유일한 순간이다.
    prisma.vibesafeUser.update({
      where: { id: params.userId },
      data: { planKey: params.planKey },
    }),
  ]);
  await recordEvent({ name: "subscription_activated", userId: params.userId, props: { planKey: params.planKey } });
}

async function recordFailedCharge(params: {
  subscriptionId: string;
  userId: string;
  orderId: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  failReason: string;
}): Promise<void> {
  try {
    await prisma.vibesafeBillingCharge.create({
      data: {
        subscriptionId: params.subscriptionId,
        userId: params.userId,
        status: "failed",
        amount: params.amount,
        orderId: params.orderId,
        failReason: params.failReason.slice(0, 500),
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      },
    });
  } catch (error) {
    // orderId 유니크 충돌 — 같은 시도가 이미 기록돼 있다는 뜻이다.
    // 실패 기록이 중복으로 안 남을 뿐, 조용히 넘어가도 안전하다.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  await prisma.vibesafeSubscription.update({
    where: { id: params.subscriptionId },
    data: { failedAttempts: { increment: 1 }, lastFailureReason: params.failReason.slice(0, 500) },
  });
}

/**
 * 매달 자동으로 청구한다(cron에서 호출). 사용자가 다시 아무것도 안 해도 된다.
 *
 * ★ 실패해도 바로 끊지 않는다
 *
 * 카드 한도가 그날 하루 초과였을 수도 있다. `MAX_DUNNING_ATTEMPTS`번까지는
 * 다음 cron 주기(하루)에 다시 시도하고, 그래도 안 되면 그때 beta로 내린다
 * — 한 번의 실패로 유료 고객을 조용히 강등시키는 것이 더 나쁘다.
 */
export async function chargeRenewal(subscriptionId: string): Promise<
  { ok: true; status: "charged" } | { ok: false; status: "failed" | "downgraded"; reason: string }
> {
  const sub = await prisma.vibesafeSubscription.findUnique({ where: { id: subscriptionId } });
  // ★ 실기동 검증에서 걸린 두 번째 버그: 여기서 "active"만 받아주면
  //   첫 실패로 past_due가 된 순간 재시도 자체가 영원히 불가능해진다.
  //   past_due는 "다시 시도할 예정"이라는 뜻이지 "포기했다"는 뜻이 아니다.
  if (!sub || !["active", "past_due"].includes(sub.status) || !sub.billingKeyCipher) {
    return { ok: false, status: "failed", reason: "구독이 활성 상태가 아닙니다." };
  }

  const plan = getPlan(sub.planKey);
  const periodStart = sub.currentPeriodEnd ?? new Date();
  const periodEnd = new Date(periodStart.getTime() + PERIOD_MS);
  const orderId = orderIdFor(sub.id, periodStart);

  let billingKey: string;
  try {
    billingKey = decryptSecret(sub.billingKeyCipher);
  } catch {
    return { ok: false, status: "failed", reason: "결제 수단 정보를 복호화하지 못했습니다." };
  }

  try {
    const charge = await chargeBilling({
      billingKey,
      customerKey: sub.customerKey,
      amount: plan.priceKrw,
      orderId,
      orderName: `VibeSafe ${plan.title} 구독 갱신`,
    });
    await activateAfterCharge({
      subscriptionId: sub.id,
      userId: sub.userId,
      planKey: sub.planKey,
      orderId,
      amount: plan.priceKrw,
      periodStart,
      periodEnd,
      paymentKey: charge.paymentKey,
    });
    return { ok: true, status: "charged" };
  } catch (error) {
    const message = error instanceof TossBillingError ? error.message : "결제에 실패했습니다.";
    await recordFailedCharge({
      subscriptionId: sub.id,
      userId: sub.userId,
      orderId,
      amount: plan.priceKrw,
      periodStart,
      periodEnd,
      failReason: message,
    });

    const attempts = sub.failedAttempts + 1;
    if (attempts >= MAX_DUNNING_ATTEMPTS) {
      await downgradeToFree(sub.userId, sub.id, `결제가 ${attempts}회 연속 실패했습니다: ${message}`);
      return { ok: false, status: "downgraded", reason: message };
    }
    await prisma.vibesafeSubscription.update({ where: { id: sub.id }, data: { status: "past_due" } });
    return { ok: false, status: "failed", reason: message };
  }
}

async function downgradeToFree(userId: string, subscriptionId: string, reason: string): Promise<void> {
  await prisma.$transaction([
    prisma.vibesafeSubscription.update({
      where: { id: subscriptionId },
      data: { status: "canceled", canceledAt: new Date() },
    }),
    prisma.vibesafeUser.update({ where: { id: userId }, data: { planKey: "beta" } }),
  ]);
  await recordEvent({ name: "subscription_downgraded", userId, props: { reason: reason.slice(0, 200) } });
}

/**
 * 사용자가 해지를 누른다. 이미 낸 달은 끝까지 쓰게 하고, 그 달이 끝날 때
 * (cron이 chargeRenewal 대신 이 플래그를 보고) beta로 내린다.
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const sub = await prisma.vibesafeSubscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== "active") {
    throw new SubscriptionError("취소할 활성 구독이 없습니다.", "NOT_ACTIVE");
  }
  await prisma.vibesafeSubscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
  });
  await recordEvent({ name: "subscription_cancel_requested", userId });
}

/** 해지를 무르고 계속 쓴다. */
export async function resumeSubscription(userId: string): Promise<void> {
  const sub = await prisma.vibesafeSubscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== "active" || !sub.cancelAtPeriodEnd) {
    throw new SubscriptionError("되돌릴 해지 예약이 없습니다.", "NOT_CANCELING");
  }
  await prisma.vibesafeSubscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: false, canceledAt: null },
  });
}

export type SubscriptionView = {
  planKey: PlanKey;
  status: string;
  cardCompany: string | null;
  cardNumberMasked: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  charges: { status: string; amount: number; failReason: string | null; createdAt: string }[];
};

export async function getSubscriptionView(userId: string): Promise<SubscriptionView | null> {
  const sub = await prisma.vibesafeSubscription.findUnique({
    where: { userId },
    include: { charges: { orderBy: { createdAt: "desc" }, take: 12 } },
  });
  if (!sub) return null;
  return {
    planKey: sub.planKey as PlanKey,
    status: sub.status,
    cardCompany: sub.cardCompany,
    cardNumberMasked: sub.cardNumberMasked,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    charges: sub.charges.map((c) => ({
      status: c.status,
      amount: c.amount,
      failReason: c.failReason,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

/**
 * cron에서 매일 부른다. 이번 주기가 끝난 구독을 처리한다:
 *   해지 예약됨       → beta로 내린다 (더 이상 청구하지 않는다)
 *   해지 예약 안 됨    → 갱신 결제를 시도한다
 */
export async function processDueSubscriptions(): Promise<{ renewed: number; canceled: number; failed: number }> {
  // active와 past_due를 둘 다 본다 — 아니면 past_due가 된 구독은 이
  // 조회에 다시는 걸리지 않아 재시도도 다우닝도 일어나지 않는다.
  const due = await prisma.vibesafeSubscription.findMany({
    where: { status: { in: ["active", "past_due"] }, currentPeriodEnd: { lte: new Date() } },
    select: { id: true, userId: true, cancelAtPeriodEnd: true },
  });

  let renewed = 0;
  let canceled = 0;
  let failed = 0;

  for (const sub of due) {
    if (sub.cancelAtPeriodEnd) {
      await prisma.$transaction([
        prisma.vibesafeSubscription.update({ where: { id: sub.id }, data: { status: "canceled" } }),
        prisma.vibesafeUser.update({ where: { id: sub.userId }, data: { planKey: "beta" } }),
      ]);
      await recordEvent({ name: "subscription_canceled", userId: sub.userId });
      canceled += 1;
      continue;
    }
    const result = await chargeRenewal(sub.id);
    if (result.ok) renewed += 1;
    else failed += 1;
  }

  // past_due 상태에서 재시도할 것들 — currentPeriodEnd를 안 건드렸으므로
  // 위 due 목록에 계속 잡힌다. 여기서 별도 처리는 필요 없다.
  return { renewed, canceled, failed };
}

export { PLANS };
