import { z } from "zod";
import { enforceRateLimit, fail, ok, readJson, requireSession } from "@/vibesafe/lib/http";
import { completeBillingRegistration, SubscriptionError } from "@/vibesafe/lib/billing/subscription";
import { TossBillingError } from "@/vibesafe/lib/billing/toss";

const schema = z.object({
  authKey: z.string().trim().min(1).max(200),
  customerKey: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  // 카드 등록·결제 시도는 남이 두드릴 수 있는 곳이라 속도 제한을 건다.
  const limited = await enforceRateLimit({
    request,
    scope: "billing-register",
    limit: 5,
    windowSeconds: 3600,
    identity: auth.session.userId,
  });
  if (limited) return limited;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return fail("결제 정보를 확인해주세요.");

  try {
    const result = await completeBillingRegistration({
      userId: auth.session.userId,
      authKey: parsed.data.authKey,
      customerKey: parsed.data.customerKey,
      customerEmail: auth.session.email,
    });
    return ok({ subscriptionId: result.subscriptionId });
  } catch (error) {
    if (error instanceof SubscriptionError) return fail(error.message, error.code === "NOT_FOUND" ? 404 : 402);
    if (error instanceof TossBillingError) return fail(error.message, 402);
    console.error("[vibesafe] billing register failed:", (error as Error).message);
    return fail("결제를 완료하지 못했습니다.", 500);
  }
}

export const dynamic = "force-dynamic";
