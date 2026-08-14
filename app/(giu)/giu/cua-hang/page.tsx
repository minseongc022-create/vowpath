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
          <li>✓ Đăng ký quán với email + mật khẩu</li>
          <li>✓ Khách thanh toán an toàn — quán nhận tiền sau khi xác nhận lấy hàng</li>
          <li>✓ Phí nền tảng 12% chỉ khi giao dịch thành công</li>
        </ul>
        <Link href="/giu/cua-hang/dang-nhap" className="mt-4 inline-block text-sm font-semibold text-giu-primary">
          Đã có quán? Đăng nhập →
        </Link>
      </section>

      <MerchantSignupForm />

      <section>
        <h2 className="giu-section-title">Quán đối tác ({merchants.length})</h2>
        <div className="mt-4 space-y-3">
          {merchants.slice(0, 12).map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
