import { MerchantPanelClient } from "@/giu/components/MerchantPanelClient";

export default function GiuMerchantPanelPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-giu-ink">Quản lý quán</h1>
      <MerchantPanelClient />
    </div>
  );
}
