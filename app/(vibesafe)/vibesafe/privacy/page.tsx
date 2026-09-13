import { VibesafeLegalDocument } from "@/vibesafe/components/VibesafeLegalDocument";
import { vibesafePrivacy } from "@/vibesafe/lib/legal-content";

export const metadata = { title: "개인정보처리방침" };

export default function VibesafePrivacyPage() {
  return <VibesafeLegalDocument {...vibesafePrivacy} />;
}
