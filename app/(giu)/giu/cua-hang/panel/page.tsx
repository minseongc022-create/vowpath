import { Suspense } from "react";
import { MerchantPanelClient } from "@/giu/components/MerchantPanelClient";

export default function GiuMerchantPanelPage() {
  return (
    <Suspense fallback={<p className="text-sm text-giu-muted">…</p>}>
      <MerchantPanelClient />
    </Suspense>
  );
}
