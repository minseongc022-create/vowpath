import { VibesafeLegalDocument } from "@/vibesafe/components/VibesafeLegalDocument";
import { vibesafeRefund } from "@/vibesafe/lib/legal-content";

export const metadata = { title: "환불정책" };

export default function VibesafeRefundPage() {
  return <VibesafeLegalDocument {...vibesafeRefund} />;
}
