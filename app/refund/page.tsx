import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalPages } from "@/lib/content";

export const metadata = {
  title: "Refund Policy",
  description: "Effiroad refund policy — 30-day money-back guarantee, cancellations, and billing.",
};

export default function RefundPage() {
  const { title, updated, sections } = legalPages.refund;
  return <LegalDocument title={title} updated={updated} sections={sections} />;
}
