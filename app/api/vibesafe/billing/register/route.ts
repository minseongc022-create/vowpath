import { fail, ok, requireSession } from "@/vibesafe/lib/http";
import { ensureCustomerKey } from "@/vibesafe/lib/billing/subscription";
import { isTossBillingConfigured, tossBillingClientKey } from "@/vibesafe/lib/billing/toss";

/**
 * 카드 등록 위젯을 띄우기 전에 필요한 것을 준다.
 *
 * customerKey는 여기서 미리 만들어둔다 — 위젯이 그 값을 들고 토스로 갔다가
 * `authKey`와 함께 우리 successUrl로 돌아오면, 그 authKey가 정말 우리가
 * 발급한 customerKey에 대한 것인지 대조할 수 있어야 한다(register/complete
 * 참고). 클라이언트가 마음대로 customerKey를 지어내 보내는 경로를 막는다.
 */
export async function POST() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  if (!isTossBillingConfigured()) {
    return fail("결제 기능이 아직 설정되지 않았습니다. 운영자에게 문의해주세요.", 503);
  }

  const customerKey = await ensureCustomerKey(auth.session.userId);
  return ok({ customerKey, clientKey: tossBillingClientKey() });
}

export const dynamic = "force-dynamic";
