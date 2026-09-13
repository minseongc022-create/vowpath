import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { cancelSubscription, SubscriptionError } from "@/vibesafe/lib/billing/subscription";

/**
 * 해지.
 * 결제 중(active)이면 즉시 끊지 않는다 — 이미 낸 이번 달은 끝까지 쓸 수
 * 있다. 체험 중(trialing)이면 아직 낸 돈이 없으므로 그 자리에서 끝난다.
 */
export async function POST() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    await cancelSubscription(auth.session.userId);
    return ok({});
  } catch (error) {
    if (error instanceof SubscriptionError) return fail(error.message, 400);
    console.error("[vibesafe] billing cancel failed:", (error as Error).message);
    return fail("해지 처리에 실패했습니다.", 500);
  }
}

export const dynamic = "force-dynamic";
