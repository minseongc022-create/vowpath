import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalPages } from "@/lib/content";

export default function PrivacyPage() {
  const { title, updated, sections } = legalPages.privacy;
  return <LegalDocument title={title} updated={updated} sections={sections} />;
}
