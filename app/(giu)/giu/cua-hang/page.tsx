import Link from "next/link";
import { MerchantSignupForm } from "@/giu/components/MerchantAuthForms";
import { MerchantCard } from "@/giu/components/MerchantCard";
import { listMerchants } from "@/giu/lib/store";
import { GIU_STRINGS } from "@/giu/lib/strings";

export default async function GiuMerchantsPage() {
  const merchants = await listMerchants();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-giu-ink">{GIU_STRINGS.merchantTitle}</h1>
          <p className="mt-3 text-giu-muted">{GIU_STRINGS.merchantSubtitle}</p>
          <ul className="mt-6 space-y-3 text-sm text-giu-muted">
            <li>✓ Đăng ký quán với email + mật khẩu</li>
            <li>✓ Đăng mọi loại món — giữ tươi đến giờ khách lấy</li>
            <li>✓ Khách thanh toán trước — bạn yên tâm, nhận mã tại quán</li>
            <li>✓ Phí nền tảng 12% chỉ khi giao dịch thành công</li>
          </ul>
          <Link
            href="/giu/cua-hang/dang-nhap"
            className="mt-6 inline-block text-sm font-semibold text-giu-primary"
          >
            Đã có quán? Đăng nhập →
          </Link>
        </div>
        <MerchantSignupForm />
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-bold">Quán đối tác ({merchants.length})</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {merchants.slice(0, 12).map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
