import "server-only";

import { Prisma } from "@prisma/client";
import { decryptSecret, encryptSecret, randomToken } from "../crypto";
import { prisma } from "../db";
import { recordEvent } from "../analytics";
import { notify } from "../notify/dispatch";
import { chargeBilling, issueBillingKey, TossBillingError } from "./toss";
import { formatKrw, getPlan, PLANS, type PlanKey } from "./plans";

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
/** Pro 체험 기간. 카드 등록 뒤 이만큼은 결제 없이 Pro 한도를 그대로 쓴다. */
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;
/** 체험 종료 리마인드를 언제부터 보낼지 — 종료 하루 전부터. */
const TRIAL_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SubscriptionError";
  }
}

export function orderIdFor(subscriptionId: string, periodStart: Date): string {
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
 * authKey를 billingKey로 바꾼다.
 *
 * ★ 이 계정이 체험판을 처음 쓰는 거라면 결제하지 않는다
 *
 * 이 계정에서 체험판을 아직 한 번도 안 썼으면(hasUsedTrial=false) 그
 * 자리에서 결제하지 않고 7일 체험을 시작한다 — "카드 등록=즉시 결제"가
 * 아니라 "카드 등록=체험 시작, 7일 뒤 결제"라는 걸 등록 버튼 문구에서부터
 * 미리 알렸으므로 여기서 그대로 지킨다. 해지 후 재가입 등으로 이미 체험을
 * 써본 계정은 예전처럼 그 자리에서 바로 청구한다.
 */
export async function completeBillingRegistration(params: {
  userId: string;
  authKey: string;
  customerKey: string;
  customerEmail?: string;
}): Promise<{ subscriptionId: string; trialStarted: boolean }> {
  const sub = await prisma.vibesafeSubscription.findUnique({
    where: { userId: params.userId },
  });
  if (!sub || sub.customerKey !== params.customerKey) {
    throw new SubscriptionError("구독 정보를 찾을 수 없습니다. 다시 시도해주세요.", "NOT_FOUND");
  }

  const issued = await issueBillingKey({ authKey: params.authKey, customerKey: params.customerKey });

  await prisma.vibesafeSubscription.update({
    where: { id: sub.id },
    data: {
      billingKeyCipher: encryptSecret(issued.billingKey),
      cardCompany: issued.cardCompany,
      cardNumberMasked: issued.cardNumberMasked,
    },
  });

  if (!sub.hasUsedTrial) {
    await startTrial({ subscriptionId: sub.id, userId: sub.userId, planKey: sub.planKey });
    return { subscriptionId: sub.id, trialStarted: true };
  }

  const plan = getPlan(sub.planKey);
  const now = new Date();
  const periodStart = now;
  const periodEnd = new Date(now.getTime() + PERIOD_MS);
  const orderId = orderIdFor(sub.id, periodStart);

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

  return { subscriptionId: sub.id, trialStarted: false };
}

/**
 * 체험 시작 — 결제 없이 Pro 한도부터 켠다.
 *
 * ★ activateAfterCharge와 마찬가지로 User.planKey를 바꾸는 자리다
 *
 * "지금 무슨 한도를 쓰는가"(User.planKey)를 바꾸는 자리가 이제 둘이다:
 * 실제 결제가 끝났을 때(activateAfterCharge)와, 체험이 시작됐을 때(여기).
 * 체험의 의미 자체가 "결제 전에 Pro를 먼저 써보는 것"이라 결제를 기다리지
 * 않는다.
 */
async function startTrial(params: {
  subscriptionId: string;
  userId: string;
  planKey: string;
}): Promise<void> {
  const trialEndsAt = new Date(Date.now() + TRIAL_MS);
  await prisma.$transaction([
    prisma.vibesafeSubscription.update({
      where: { id: params.subscriptionId },
      data: { status: "trialing", trialEndsAt, hasUsedTrial: true },
    }),
    prisma.vibesafeUser.update({
      where: { id: params.userId },
      data: { planKey: params.planKey },
    }),
  ]);
  await recordEvent({
    name: "subscription_trial_started",
    userId: params.userId,
    props: { planKey: params.planKey },
  });
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
 *
 * ★ User.planKey를 바꾸는 자리가 여기 하나만은 아니다
 *
 * 실제 결제가 성공했을 때는 여기서 바꾼다. 체험이 시작될 때는
 * startTrial()이 결제 없이 먼저 바꾼다 — 그래서 이 함수 이름을
 * "유일한 순간"이라고 부르지 않는다. 두 곳 다 "지금 이 사람이 쓸 수 있는
 * 한도가 바뀌는 트랜잭션"이라는 같은 규칙을 지킨다: 상태 전이와
 * User.planKey를 같은 $transaction 안에서 함께 바꾼다.
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
  // trialing도 받아주는 이유: processTrialsEnding()이 체험 종료 후 첫
  // 결제를 이 함수로 그대로 건다 — periodStart 계산, dunning 재시도,
  // 3회 실패 시 강등까지 전부 갱신 결제와 같은 로직을 타야 하기 때문이다.
  if (!sub || !["active", "past_due", "trialing"].includes(sub.status) || !sub.billingKeyCipher) {
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
 * 사용자가 해지를 누른다.
 *
 *   active  → 이미 낸 달은 끝까지 쓰게 하고, 그 달이 끝날 때(cron이
 *             chargeRenewal 대신 이 플래그를 보고) beta로 내린다.
 *   trialing → 아직 낸 돈이 없으니 "끝까지 쓰게 하는" 기간이 없다. 그
 *              자리에서 바로 beta로 내리고 예정된 첫 결제를 취소한다.
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const sub = await prisma.vibesafeSubscription.findUnique({ where: { userId } });
  if (!sub || !["active", "trialing"].includes(sub.status)) {
    throw new SubscriptionError("취소할 활성 구독이 없습니다.", "NOT_ACTIVE");
  }

  if (sub.status === "trialing") {
    await prisma.$transaction([
      prisma.vibesafeSubscription.update({
        where: { id: sub.id },
        data: { status: "canceled", canceledAt: new Date() },
      }),
      prisma.vibesafeUser.update({ where: { id: userId }, data: { planKey: "beta" } }),
    ]);
    await recordEvent({ name: "subscription_canceled", userId, props: { duringTrial: true } });
    return;
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
  trialEndsAt: string | null;
  hasUsedTrial: boolean;
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
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    hasUsedTrial: sub.hasUsedTrial,
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

/**
 * cron에서 매일 부른다. 체험 종료 시각(trialEndsAt)이 지난 구독의 첫 결제를
 * 시도한다.
 *
 * ★ currentPeriodEnd를 trialEndsAt에 고정해두고 나서 chargeRenewal을 부른다
 *
 * chargeRenewal은 `sub.currentPeriodEnd ?? new Date()`를 periodStart로
 * 쓴다(orderIdFor의 결정론적 orderId가 여기 달려 있다). trialing 구독은
 * 결제를 한 번도 안 해봐서 currentPeriodEnd가 비어 있고, 그대로 두면 실패
 * 후 재시도할 때마다 `new Date()`가 매번 새로 계산되어 재시도마다 다른
 * orderId가 생긴다 — 이러면 같은 시도의 재시도인지 구분할 방법이 없어진다.
 * 그래서 첫 시도에서 currentPeriodEnd를 trialEndsAt으로 고정해, 이후
 * 재시도(그리고 그 재시도를 줍는 processDueSubscriptions)가 전부 같은
 * periodStart를 보게 만든다.
 */
export async function processTrialsEnding(): Promise<{ converted: number; failed: number }> {
  const due = await prisma.vibesafeSubscription.findMany({
    where: { status: "trialing", trialEndsAt: { lte: new Date() } },
    select: { id: true, trialEndsAt: true, currentPeriodEnd: true },
  });

  let converted = 0;
  let failed = 0;
  for (const sub of due) {
    if (!sub.currentPeriodEnd) {
      await prisma.vibesafeSubscription.update({
        where: { id: sub.id },
        data: { currentPeriodEnd: sub.trialEndsAt },
      });
    }
    const result = await chargeRenewal(sub.id);
    if (result.ok) converted += 1;
    else failed += 1;
  }
  return { converted, failed };
}

/**
 * cron에서 매일 부른다. 체험이 하루 안에 끝나는 구독에 결제 예고를 한 번
 * 보낸다.
 *
 * ★ 이게 "정직한 체험판"과 "체험판 함정"을 가르는 가장 큰 차이다
 *
 * 카드가 등록돼 있다는 이유로 아무 예고 없이 첫 결제가 나가면, 사용자는
 * 등록한 사실조차 잊고 있다가 청구서를 보고서야 알게 된다. 하루 전에
 * 알리면 원치 않을 경우 결제 전에 해지할 시간이 남는다.
 * trialReminderSentAt으로 한 번만 보낸다 — cron이 하루에도 여러 번 돌 수
 * 있어서다.
 */
export async function sendTrialEndingReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + TRIAL_REMINDER_WINDOW_MS);
  const upcoming = await prisma.vibesafeSubscription.findMany({
    where: { status: "trialing", trialEndsAt: { gt: now, lte: windowEnd }, trialReminderSentAt: null },
    select: { id: true, userId: true, planKey: true, trialEndsAt: true },
  });

  let sent = 0;
  for (const sub of upcoming) {
    const user = await prisma.vibesafeUser.findUnique({ where: { id: sub.userId }, select: { email: true } });
    if (!user) continue;
    const plan = getPlan(sub.planKey);
    const dateLabel = sub.trialEndsAt?.toLocaleDateString("ko-KR") ?? "곧";

    await notify({
      userId: sub.userId,
      projectId: null,
      incidentId: null,
      kind: "trial_ending",
      title: `[VibeSafe] 무료체험이 곧 끝납니다`,
      body: [
        `등록하신 카드로 ${dateLabel}에 ${formatKrw(plan.priceKrw)}이 결제될 예정입니다.`,
        "계속 이용하실 거라면 따로 하실 일은 없습니다.",
        "원하지 않으시면 결제 전까지 언제든 해지하실 수 있습니다 — 해지하면 이번 결제는 나가지 않습니다.",
        "",
        "/vibesafe/billing",
      ].join("\n"),
      dedupeKey: `trial-ending:${sub.id}`,
      email: true,
      emailTo: user.email,
    });
    await prisma.vibesafeSubscription.update({
      where: { id: sub.id },
      data: { trialReminderSentAt: new Date() },
    });
    sent += 1;
  }
  return { sent };
}

export { PLANS };
