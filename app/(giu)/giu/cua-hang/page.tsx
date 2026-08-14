import Link from "next/link";
import { MerchantSignupForm } from "@/giu/components/MerchantAuthForms";
import { MerchantCard } from "@/giu/components/MerchantCard";
import { listMerchants } from "@/giu/lib/store";
import { GIU_STRINGS } from "@/giu/lib/strings";

export default async function GiuMerchantsPage() {
  const merchants = await listMerchants();

  return (
    <div className="giu-page space-y-8">
      <section>
        <h1 className="giu-section-title">{GIU_STRINGS.merchantTitle}</h1>
        <p className="giu-section-sub">{GIU_STRINGS.merchantSubtitle}</p>
        <ul className="mt-4 space-y-2 text-sm text-giu-muted">
          <li>✓ 이메일 + 비밀번호로 가게 등록</li>
          <li>✓ 고객 안전 결제 — 픽업 확인 후 가게에 정산</li>
          <li>✓ 플랫폼 수수료 12% (거래 성사 시에만)</li>
        </ul>
        <Link href="/giu/cua-hang/dang-nhap" className="mt-4 inline-block text-sm font-semibold text-giu-primary">
          이미 가게가 있으신가요? 로그인 →
        </Link>
      </section>

      <MerchantSignupForm />

      <section>
        <h2 className="giu-section-title">제휴 가게 ({merchants.length})</h2>
        <div className="mt-4 space-y-3">
          {merchants.slice(0, 12).map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
