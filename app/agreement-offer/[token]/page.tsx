import { AgreementOfferPageClient } from "@/components/agreements/AgreementOfferPageClient";

type PageProps = { params: Promise<{ token: string }> };

export default async function AgreementOfferPage({ params }: PageProps) {
  const { token } = await params;
  return <AgreementOfferPageClient token={token} />;
}
