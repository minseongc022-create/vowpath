import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/giu/components/PrintButton";
import { GIU_STRINGS } from "@/giu/lib/strings";
import { resolveGiuPublicOrigin } from "@/giu/lib/giu-host-server";
import { giuPublicUrl } from "@/giu/lib/urls";

export const metadata: Metadata = {
  title: "Hướng dẫn quán đối tác",
  description: "Đăng quán miễn phí — giải cứu đồ thừa cuối ngày với Giu",
};

export default async function GiuMerchantFlyerPage() {
  const origin = await resolveGiuPublicOrigin();
  const signup = giuPublicUrl("/cua-hang", origin);
  const panel = giuPublicUrl("/cua-hang/panel", origin);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 print:py-6">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link href="/giu/cua-hang" className="text-sm font-semibold text-giu-primary">
          ← Quay lại
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-giu-border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-giu-primary text-xl font-bold text-white">
            G
          </span>
          <div>
            <h1 className="text-2xl font-bold text-giu-ink">Giu — {GIU_STRINGS.tagline}</h1>
            <p className="text-sm text-giu-muted">{GIU_STRINGS.city}</p>
          </div>
        </div>

        <p className="mt-6 text-lg font-medium text-giu-ink">{GIU_STRINGS.merchantTitle}</p>
        <p className="mt-2 text-giu-muted">{GIU_STRINGS.merchantSubtitle}</p>

        <ol className="mt-8 space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-giu-primary/15 text-sm font-bold text-giu-primary">
              1
            </span>
            <div>
              <strong>Đăng quán miễn phí</strong> — 2 phút, không phí hàng tháng.
              <p className="mt-1 break-all text-giu-primary">{signup}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-giu-primary/15 text-sm font-bold text-giu-primary">
              2
            </span>
            <div>
              <strong>Mỗi tối 18h30–19h</strong> — đăng &quot;hộp bất ngờ&quot; (bánh/cà phê còn lại,
              giảm 50–70%).
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-giu-primary/15 text-sm font-bold text-giu-primary">
              3
            </span>
            <div>
              <strong>Khách giữ chỗ</strong> — nhận mã trên điện thoại, tới quán{" "}
              <strong>19h–21h</strong>, trả tiền tại quán.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-giu-primary/15 text-sm font-bold text-giu-primary">
              4
            </span>
            <div>
              <strong>Quản lý quán</strong> — xem đặt chỗ, xác nhận đã lấy.
              <p className="mt-1 break-all text-giu-primary">{panel}</p>
            </div>
          </li>
        </ol>

        <div className="mt-8 rounded-xl bg-giu-surface p-4 text-sm">
          <p className="font-semibold text-giu-ink">Phí nền tảng</p>
          <p className="mt-1 text-giu-muted">{GIU_STRINGS.commissionNote}</p>
          <p className="mt-2 text-giu-muted">Thanh toán: tiền mặt hoặc VietQR tại quán.</p>
        </div>

        <p className="mt-8 text-center text-xs text-giu-muted">
          Câu hỏi? Zalo / gọi người giới thiệu quán với Giu.
        </p>
      </article>
    </div>
  );
}
