import { isTossConfigured, tossClientKey } from "@/giu/lib/toss-payments";
import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";
import { getSellerPlan, PLAN_LIMITS, PRO_DURATION_DAYS, PRO_PRICE_KRW } from "@/pricepulse/lib/dashboard/plan.ts";
import { getOrCreatePendingPayment } from "@/pricepulse/lib/dashboard/payments-db.ts";
import { getPublicAppUrl } from "@/lib/app-url";
import { TossCheckout } from "@/components/pricepulse/TossCheckout.tsx";
import { formatDate } from "@/pricepulse/lib/dashboard/format.ts";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; upgraded?: string }>;
}) {
  const params = await searchParams;
  const seller = await getCurrentSeller();
  if (!seller) return null; // middleware already guarantees this, appeases TS

  const planInfo = await getSellerPlan(seller.sellerId);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">요금제</h1>
        <p className="text-sm text-slate-500">
          현재 플랜: <span className="font-semibold text-slate-900">{planInfo.plan === "pro" ? "Pro" : "무료"}</span>
          {planInfo.active && planInfo.expiresAt ? ` · ${formatDate(planInfo.expiresAt.slice(0, 10))}까지` : null}
        </p>
      </div>

      {params.upgraded ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          결제가 완료됐습니다. Pro 플랜이 적용됐어요.
        </div>
      ) : null}
      {params.error ? <p className="text-sm text-red-600">{decodeURIComponent(params.error)}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">무료</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">₩0</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>키워드 {PLAN_LIMITS.free.maxKeywords}개까지 순위 추적</li>
            <li className="text-slate-300 line-through">경쟁상품 가격 히스토리</li>
            <li className="text-slate-300 line-through">카테고리 급상승 상품</li>
          </ul>
        </div>
        <div className="rounded-lg border-2 border-slate-900 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Pro</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            ₩{PRO_PRICE_KRW.toLocaleString("ko-KR")}
            <span className="text-sm font-normal text-slate-400"> / {PRO_DURATION_DAYS}일</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>키워드 {PLAN_LIMITS.pro.maxKeywords}개까지 순위 추적</li>
            <li>경쟁상품 가격 히스토리 차트</li>
            <li>카테고리 급상승 상품 발굴</li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        자동 가격조정(리프라이서)은 준비 중입니다. 별도 유료 플랜으로 추후 제공될 예정이에요.
      </p>

      {planInfo.plan !== "pro" ? (
        !isTossConfigured() ? (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            결제 연동 준비 중입니다. 잠시 후 다시 시도해주세요.
          </p>
        ) : (
          <CheckoutSection sellerId={seller.sellerId} sellerEmail={seller.email} />
        )
      ) : null}
    </div>
  );
}

async function CheckoutSection({ sellerId, sellerEmail }: { sellerId: string; sellerEmail: string }) {
  const clientKey = tossClientKey();
  if (!clientKey) return null;
  const { orderId, amount } = await getOrCreatePendingPayment(sellerId);
  const origin = getPublicAppUrl() || "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="mb-3 text-sm font-semibold text-slate-900">Pro로 업그레이드</p>
      <TossCheckout
        clientKey={clientKey}
        sellerId={sellerId}
        sellerEmail={sellerEmail}
        orderId={orderId}
        amount={amount}
        origin={origin}
      />
    </div>
  );
}
