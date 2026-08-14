import { Suspense } from "react";
import { MerchantPanelClient } from "@/giu/components/MerchantPanelClient";

export default function GiuMerchantPanelPage() {
  return (
    <div className="giu-page">
      <Suspense fallback={<p className="text-sm text-giu-muted">불러오는 중...</p>}>
        <MerchantPanelClient />
      </Suspense>
    </div>
  );
}
