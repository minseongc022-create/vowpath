import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { getSubscriptionView } from "@/vibesafe/lib/billing/subscription";
import { getPlan, PLANS } from "@/vibesafe/lib/billing/plans";
import { getUsage } from "@/vibesafe/lib/usage";
import { prisma } from "@/vibesafe/lib/db";
import { isTossBillingConfigured, tossBillingClientKey } from "@/vibesafe/lib/billing/toss";

/** 결제 화면이 필요로 하는 것 전부를 한 번에 준다. */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const user = await prisma.vibesafeUser.findUnique({
    where: { id: auth.session.userId },
    select: { planKey: true, email: true },
  });
  if (!user) return fail("사용자를 찾을 수 없습니다.", 404);

  const [subscription, usage] = await Promise.all([
    getSubscriptionView(auth.session.userId),
    getUsage(auth.session.userId),
  ]);

  return ok({
    currentPlan: getPlan(user.planKey),
    plans: Object.values(PLANS),
    subscription,
    usage,
    tossConfigured: isTossBillingConfigured(),
    tossClientKey: tossBillingClientKey() ?? null,
    customerEmail: user.email,
  });
}

export const dynamic = "force-dynamic";
