import { VibesafeLegalDocument } from "@/vibesafe/components/VibesafeLegalDocument";
import { vibesafeTerms } from "@/vibesafe/lib/legal-content";

export const metadata = { title: "이용약관" };

export default function VibesafeTermsPage() {
  return <VibesafeLegalDocument {...vibesafeTerms} />;
}
