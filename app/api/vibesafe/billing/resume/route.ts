import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { resumeSubscription, SubscriptionError } from "@/vibesafe/lib/billing/subscription";

/** 해지 예약을 무른다. */
export async function POST() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    await resumeSubscription(auth.session.userId);
    return ok({});
  } catch (error) {
    if (error instanceof SubscriptionError) return fail(error.message, 400);
    console.error("[vibesafe] billing resume failed:", (error as Error).message);
    return fail("처리에 실패했습니다.", 500);
  }
}

export const dynamic = "force-dynamic";
