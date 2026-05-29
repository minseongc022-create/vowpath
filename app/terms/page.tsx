import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalPages } from "@/lib/content";

export default function TermsPage() {
  const { title, updated, sections } = legalPages.terms;
  return <LegalDocument title={title} updated={updated} sections={sections} />;
}
